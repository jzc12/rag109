import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Chat.css';
import { get_backend_url } from '../utils/url';
import { renderMarkdown, createThrottledRenderer } from '../utils/markdownRenderer';
function Chat() {
    const [userInput, setUserInput] = useState('');
    const [isSidebarHidden, setIsSidebarHidden] = useState(false);
    const [chatMode, setChatMode] = useState('rag'); // 'rag' 或 'suggestion'
    const [enhancedMode, setEnhancedMode] = useState(false); // 增强效果开关状态
    const messageListRef = useRef(null);
    const scrollableListRef = useRef(null);
    const navigate = useNavigate();
    const userId = JSON.parse(localStorage.getItem('user'))['id'];
    const backendUrl = get_backend_url();
    // 会话管理器
    const sessionManagerRef = useRef({
        sessions: [],
        currentSession: {
            id: null,
            title: '新会话',
        },

        // 创建新会话
        createNewSession() {
            // 如果当前已经是新会话，不响应
            if (this.currentSession !== null && this.currentSession.id === null) return;

            // 创建新会话
            this.currentSession = {
                id: null,
                title: '新会话',
            };
        },

        // 切换到指定会话
        async switchToSession(sessionId) {
            const targetSession = this.sessions.find(s => s.id === sessionId);
            if (targetSession !== undefined) {
                this.currentSession = targetSession;
            }
            const response = await fetch(`${backendUrl}/conversations/${sessionId}`);
            const data = await response.json();
            return data;
        },

        // 添加消息到当前会话
        async addMessageToCurrentSession(role, content) {
            if (this.currentSession === null) {
                // 如果没有当前会话，创建一个
                this.createNewSession();
            }

            // 如果是用户消息且是第一条消息，需要保存
            if (role === 'user' && this.currentSession.id === null) {
                // 更新会话标题（使用第一条用户消息作为标题）
                this.currentSession.title = content.substring(0, 8) + (content.length > 8 ? '...' : '');

                this.sessions.push(this.currentSession);

                // 提交到数据库
                try {
                    // 向后端发起请求，创建会话
                    const response = await fetch(`${backendUrl}/conversations`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            'account_id': userId,
                            'title': this.currentSession.title
                        })
                    });

                    if (!response.ok) {
                        console.error('Error:', response.status);
                        return;
                    }

                    const res = await response.json()
                    this.currentSession.id = res.conversation_id
                } catch (error) {
                    console.error('Error:', error);
                }
            }

            // 将消息写入数据库
            try {
                // 向后端发起请求，添加消息
                const response = await fetch(`${backendUrl}/messages/${this.currentSession.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'message_type': role,
                        'content': content
                    })
                });

                if (!response.ok) {
                    console.error('Error:', response.status);
                    return;
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    });

    // UI管理器
    const uiManagerRef = useRef({
        messageList: null,
        scrollableList: null,
        userInput: null,
        welcomeContainer: null,

        // 初始化UI引用
        setRefs(messageListElement, scrollableListElement, userInputElement) {
            this.messageList = messageListElement;
            this.scrollableList = scrollableListElement;
            this.userInput = userInputElement;
            this.welcomeContainer = createWelcomeContainer();
        },

        // 发送消息处理
        async sendMessage(messageText, sessionManager) {
            if (messageText.trim() === '') return;

            if (this.messageList.contains(this.welcomeContainer)) {
                this.messageList.removeChild(this.welcomeContainer);
            }

            // 添加到当前会话
            sessionManager.addMessageToCurrentSession('user', messageText);

            // 显示用户消息
            const userMessage = createMessageElement(messageText, 'user-message');
            this.messageList.appendChild(userMessage);

            // 清空输入框
            this.userInput.value = '';

            // 更新会话列表
            renderSessionList(sessionManager, this.scrollableList);

            try {
                // 获取当前增强模式的最新状态
                const currentEnhancedMode = document.querySelector('.toggle-checkbox').checked;
                
                // 创建模型回复的消息元素，先显示"思考中..."
                const llmMessage = createMessageElement(`思考中... \n 当前${currentEnhancedMode ? '已开启' : '未开启'}增强模式`, 'llm-message');
                this.messageList.appendChild(llmMessage); 

                let response;
                // 根据当前模式选择不同的API
                if (chatMode === 'rag') {
                    // RAG对话模式
                    response = await fetch(`${backendUrl}/llm`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            "conversation_id": sessionManager.currentSession.id,
                            "user_input": messageText,
                            "boot": currentEnhancedMode ? 1 : 0
                        })
                    });
                } else {
                    // 个人分析决策建议模式
                    response = await fetch(`${backendUrl}/suggestion`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            "conversation_id": sessionManager.currentSession.id,
                            "per_info": messageText,
                            "boot": currentEnhancedMode ? 1 : 0
                        })
                    });
                }

                if (!response.ok) {
                    console.error('Error:', response.status);
                    return;
                }

                // 流式响应解析
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                // 清空"思考中..."文本，准备显示实际回复
                this.messageList.removeChild(llmMessage);

                const llmMessage_back = createMessageElement("", 'llm-message');
                this.messageList.appendChild(llmMessage_back);

                const throttledRender = createThrottledRenderer(llmMessage_back);
                let rawContent = '';

                const processText = async ({ done, value }) => {
                    if (done) {
                        // 最终渲染并保存原始 Markdown 内容
                        llmMessage_back.innerHTML = renderMarkdown(rawContent);
                        sessionManager.addMessageToCurrentSession('llm', rawContent);
                        return;
                    }

                    const chunk = decoder.decode(value, { stream: true });
                    rawContent += chunk;
                    throttledRender(chunk);

                    return reader.read().then(processText);
                };

                await reader.read().then(processText);
            } catch (error) {
                console.error('Error:', error);
            }
        },

        // 加载指定会话
        async loadSession(sessionId, sessionManager) {
            const messages = await sessionManager.switchToSession(sessionId);
            if (!messages) return;

            clearChatWindow(this.messageList);

            // 显示会话中的所有消息
            messages.forEach(message => {
                const className = message.message_type === 'user' ? 'user-message' : 'llm-message';
                const messageElement = createMessageElement('', className);

                // 根据消息类型决定是否渲染 Markdown
                if (message.message_type === 'llm') {
                    messageElement.innerHTML = renderMarkdown(message.content);
                } else {
                    messageElement.textContent = message.content;
                }

                this.messageList.appendChild(messageElement);
            });

            renderSessionList(sessionManager, this.scrollableList);
        },

        // 加载提示区域
        loadPrompts(sessionManager) {
            // 检查是否已经存在欢迎容器，如果存在则先移除
            if (this.messageList && this.welcomeContainer) {
                // 移除所有可能存在的欢迎容器
                const existingWelcomeContainers = this.messageList.querySelectorAll('.welcome-container');
                existingWelcomeContainers.forEach(container => {
                    this.messageList.removeChild(container);
                });

                // 如果当前会话没有消息，添加欢迎提示区域
                if (sessionManager.currentSession.id === null) {
                    this.messageList.appendChild(this.welcomeContainer);
                }
            }
        }
    });

    // 检查用户是否已登录
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            navigate('/login');
            return;
        }

        // // 清除浏览器本地存储中的会话（与原始实现一致）
        // localStorage.removeItem('llm-sessions');

        // 初始化UI引用
        if (messageListRef.current && scrollableListRef.current) {
            uiManagerRef.current.setRefs(
                messageListRef.current,
                scrollableListRef.current,
                document.getElementById('user-input')
            );

            // 加载已保存的会话
            loadSessions(sessionManagerRef.current);

            // 确保只添加一次欢迎提示区域
            setTimeout(() => {
                uiManagerRef.current.loadPrompts(sessionManagerRef.current);
            }, 100);
        }
    }, [navigate]);

    // 当聊天模式或增强模式变化时更新欢迎提示区域
    useEffect(() => {
        if (messageListRef.current && uiManagerRef.current.welcomeContainer) {
            // 重新创建欢迎容器以更新提示
            uiManagerRef.current.welcomeContainer = createWelcomeContainer();
            
            // 如果当前没有会话或在新会话中，更新欢迎提示区域
            if (sessionManagerRef.current.currentSession.id === null) {
                // 移除所有可能存在的欢迎容器
                const existingWelcomeContainers = messageListRef.current.querySelectorAll('.welcome-container');
                existingWelcomeContainers.forEach(container => {
                    messageListRef.current.removeChild(container);
                });
                
                // 添加新的欢迎提示区域
                messageListRef.current.appendChild(uiManagerRef.current.welcomeContainer);
            }
        }
    }, [chatMode, enhancedMode]);

    // 创建消息元素
    function createMessageElement(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', className);
        messageDiv.textContent = text;
        return messageDiv;
    }

    // 创建欢迎提示区域
    function createWelcomeContainer() {
        const container = document.createElement('div');
        container.className = 'welcome-container';

        const welcomeText = document.createElement('div');
        welcomeText.className = 'welcome-text';
        
        // 根据当前聊天模式显示不同的欢迎提示
        if (chatMode === 'rag') {
            welcomeText.textContent = '欢迎提问各大城市的人才引进政策';
        } else {
            welcomeText.textContent = '欢迎询问个人就业建议';
        }
        container.appendChild(welcomeText);

        // 如果增强模式开启，显示增强模式提示
        if (enhancedMode) {
            const enhancedModeText = document.createElement('div');
            enhancedModeText.className = 'enhanced-mode-text';
            enhancedModeText.textContent = '已开启增强模式，系统将进行更深入的分析';
            container.appendChild(enhancedModeText);
        }

        const promptGrid = document.createElement('div');
        promptGrid.className = 'prompt-grid';

        // 根据当前聊天模式显示不同的示例问题
        let prompts = [];
        if (chatMode === 'rag') {
            prompts = [
                "请介绍一下高校本科生落户苏州有哪些优惠政策。",
                "深圳针对硕士研究生的引进政策是什么？",
                "上海人才落户的最新条件有哪些？",
                "介绍一下北京人才引进政策。"
            ];
        } else {
            prompts = [
                "我是一名计算机专业应届毕业生，希望在北上广深发展，哪一个比较合适？",
                "我是一名有5年工作经验的金融从业者，想搬到南方，哪里比较适合我？",
                "我是一名医学专业毕业生，想了解江浙沪的医疗行业发展前景。",
                "我是一名设计专业学生，家在北方，有什么建议的就业地吗？"
            ];
        }

        prompts.forEach(prompt => {
            const block = document.createElement('div');
            block.className = 'prompt-block';
            block.textContent = `猜你想问：${prompt}`;
            block.addEventListener('click', () => {
                setUserInput(prompt);
                setTimeout(() => handleSendMessage(prompt), 100);
            });
            promptGrid.appendChild(block);
        });

        container.appendChild(promptGrid);
        return container;
    }

    // 加载会话列表
    async function loadSessions(sessionManager) {
        const response = await fetch(`${backendUrl}/conversations?account_id=${userId}`);
        if (!response.ok)
            return;
        const sessions = await response.json();
        sessionManager.sessions = [];
        sessions.forEach(session => {
            sessionManager.sessions.push({
                'id': session.id,
                'title': session.title
            })
        })
        renderSessionList(sessionManagerRef.current, scrollableListRef.current);
    }

    // 渲染会话列表
    function renderSessionList(sessionManager, scrollableList) {
        if (!scrollableList) return;

        scrollableList.innerHTML = '';

        sessionManager.sessions.forEach(session => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item';
            if (session.id === sessionManager.currentSession.id) {
                listItem.classList.add('selected');
            }

            // 创建会话标题和删除按钮的容器
            const sessionContainer = document.createElement('div');
            sessionContainer.className = 'session-container';
            
            // 创建会话标题
            const sessionTitle = document.createElement('span');
            sessionTitle.className = 'session-title';
            sessionTitle.textContent = session.title;
            sessionTitle.dataset.sessionId = session.id;
            sessionTitle.addEventListener('click', () => {
                uiManagerRef.current.loadSession(session.id, sessionManager);
            });
            
            // 创建删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.className = 'session-delete-button';
            deleteButton.innerHTML = '×';
            deleteButton.title = '删除此会话';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteSession(session.id);
            });
            
            // 将标题和删除按钮添加到容器中
            sessionContainer.appendChild(sessionTitle);
            sessionContainer.appendChild(deleteButton);
            
            // 将容器添加到列表项中
            listItem.appendChild(sessionContainer);
            scrollableList.appendChild(listItem);
        });
    }

    // 清空聊天窗口
    function clearChatWindow(messageList) {
        if (messageList) {
            messageList.innerHTML = '';
        }
    }

    // 创建新会话
    function handleCreateNewSession() {
        sessionManagerRef.current.createNewSession();
        clearChatWindow(messageListRef.current);

        // 确保欢迎提示区域不会重复添加
        setTimeout(() => {
            uiManagerRef.current.loadPrompts(sessionManagerRef.current);
        }, 0);

        renderSessionList(sessionManagerRef.current, scrollableListRef.current);
    }

    // 发送消息
    function handleSendMessage(text) {
        const messageText = text || userInput;
        if (!messageText.trim()) return;

        uiManagerRef.current.sendMessage(messageText, sessionManagerRef.current);
        setUserInput('');
    }

    // 处理输入框按键事件
    function handleKeyPress(e) {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    }

    // 处理登出
    function handleLogout() {
        localStorage.removeItem('user');
        navigate('/login');
    }

    // 处理进入管理员页面
    function handleAdminAccess() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role === 'admin') {
            navigate('/admin/knowledgebase');
        } else {
            alert('您没有管理员权限，无法访问该页面');
        }
    }

    // 删除单个会话
    async function handleDeleteSession(sessionId) {
        if (!confirm('确定要删除此会话吗？')) return;
        
        try {
            const response = await fetch(`${backendUrl}/conversations/${sessionId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // 从本地会话列表中移除该会话
                sessionManagerRef.current.sessions = sessionManagerRef.current.sessions.filter(
                    session => session.id !== sessionId
                );
                
                // 如果删除的是当前会话，创建一个新会话
                if (sessionManagerRef.current.currentSession.id === sessionId) {
                    handleCreateNewSession();
                } else {
                    // 重新从服务器加载会话列表，确保数据同步
                    await loadSessions(sessionManagerRef.current);
                }
            } else {
                console.error('删除会话失败:', response.status);
                alert('删除会话失败，请重试');
            }
        } catch (error) {
            console.error('删除会话错误:', error);
            alert('删除会话时发生错误，请重试');
        }
    }

    return (
        <div className="total-container">
            {/* 侧边栏显示按钮 */}
            <button
                className="show-sidebar-button"
                style={{ display: isSidebarHidden ? 'block' : 'none' }}
                onClick={() => setIsSidebarHidden(false)}
            >
                ≡
            </button>

            {/* 登出按钮 - 放在页面右上角 */}
            <div className="logout-container">
                <button className="logout-button" onClick={handleLogout}>
                    <span className="logout-icon">⏻</span>
                    登出
                </button>
            </div>

            {/* 管理员按钮 - 放在页面右下角 */}
            <div className="admin-container">
                <button className="admin-button" onClick={handleAdminAccess}>
                    <span className="admin-icon">⚙️</span>
                    管理知识库
                </button>
            </div>

            {/* 侧边栏 */}
            <div className={`navigation-container ${isSidebarHidden ? 'hidden' : ''}`}>
                <div className="list-container">
                    <div className="sidebar-header">
                        <h3 className="sidebar-title">RAG 应用系统</h3>
                        <div className="header-actions">
                            <button
                                className="hide-sidebar-button"
                                onClick={() => setIsSidebarHidden(true)}
                            >
                                ≡
                            </button>
                        </div>
                    </div>
                    <button
                        className="new-session-button"
                        onClick={handleCreateNewSession}
                    >
                        新建会话
                    </button>
                    <button
                        className="city-analysis-button"
                        onClick={() => navigate('/city-analysis')}
                    >
                        城市分析
                    </button>
                    <ul id="scrollable-list" ref={scrollableListRef}></ul>
                </div>
            </div>

            {/* 主内容区 */}
            <div className="main-container">
                <div id="chat-container">
                    <div className="chat-box">
                        <div className="message-list" id="message-list" ref={messageListRef}></div>
                    </div>
                    <div className="input-box">
                        <div className="mode-options">
                            <div className="enhance-toggle">
                                <label className="toggle-label">
                                    <input 
                                        type="checkbox" 
                                        checked={enhancedMode} 
                                        onChange={(e) => setEnhancedMode(e.target.checked)}
                                        className="toggle-checkbox"
                                    />
                                    <span className="toggle-switch"></span>
                                    <span className="toggle-text">增强模式</span>
                                </label>
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="mode-selector">
                                <select 
                                    value={chatMode} 
                                    onChange={(e) => setChatMode(e.target.value)}
                                    className="mode-select"
                                >
                                    <option value="rag">RAG对话</option>
                                    <option value="suggestion">个人决策建议</option>
                                </select>
                            </div>
                            <input
                                type="text"
                                id="user-input"
                                placeholder={chatMode === 'rag' ? "请输入消息" : "请输入个人信息"}
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <button id="send-button" onClick={() => handleSendMessage()}>发送</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Chat; 