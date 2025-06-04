function createMessageElement(text, className) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', className);
    messageDiv.textContent = text;
    return messageDiv;
}

// 会话管理类
class SessionManager {
    constructor() {
        this.sessions = [];
        this.currentSession = {
            id: Date.now().toString(),
            title: '新会话',
            messages: [],
            createdAt: new Date()
        };
    }

    // 创建新会话
    createNewSession() {
        // 如果当前已经是新会话，不响应
        if (this.currentSession != null)
            if (this.currentSession.messages.length == 0) return;

        // 创建新会话
        const newSession = {
            id: Date.now().toString(),
            title: '新会话',
            messages: [],
            createdAt: new Date()
        };
        this.currentSession = newSession;
    }

    // 切换到指定会话
    switchToSession(sessionId) {
        const targetSession = this.sessions.find(s => s.id === sessionId);
        if (targetSession !== undefined)
            this.currentSession = targetSession;
        return this.currentSession;
    }

    // 添加消息到当前会话
    addMessageToCurrentSession(role, content) {
        if (this.currentSession === null) {
            // 如果没有当前会话，创建一个
            this.createNewSession();
        }

        this.currentSession.messages.push({ role, content });

        // 如果是用户消息且是第一条消息，需要保存
        if (role === 'user' && this.currentSession.messages.length === 1) {
            // 更新会话标题（使用第一条用户消息作为标题）
            const firstUserMessage = this.currentSession.messages.find(m => m.role === 'user');
            if (firstUserMessage) {
                this.currentSession.title = firstUserMessage.content.substring(0, 8) + (firstUserMessage.content.length > 8 ? '...' : '');
            }
            this.sessions.push(this.currentSession);
        }
    }
}

// UI管理类
class UIManager {
    constructor() {
        this.sessionManager = new SessionManager();
        this.scrollableList = document.getElementById('scrollable-list');
        this.messageList = document.getElementById('message-list');
        this.newSessionButton = document.getElementById('new-session-button');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.welcomeContainer = this.createWelcomeContainer();
    }

    init() {
        this.setupEventListeners();
        this.loadSessions();
        this.loadPrompts();
    }

    setupEventListeners() {
        // 新建会话按钮
        this.newSessionButton.addEventListener('click', () => {
            this.sessionManager.createNewSession();
            this.clearChatWindow();
            this.loadPrompts();
            this.renderSessionList();
        });

        // 发送消息按钮
        this.sendButton.addEventListener('click', () => this.sendMessage());

        // 回车发送消息
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    // 发送消息处理
    async sendMessage() {
        const messageText = this.userInput.value.trim();
        if (messageText === '') return;

        if (this.messageList.contains(this.welcomeContainer)) {
            this.messageList.removeChild(this.welcomeContainer);
        }

        // 添加到当前会话
        this.sessionManager.addMessageToCurrentSession('user', messageText);

        // 显示用户消息
        const userMessage = createMessageElement(messageText, 'user-message');
        this.messageList.appendChild(userMessage);

        // 清空输入框
        this.userInput.value = '';

        // 更新会话列表
        this.renderSessionList();

        // 向后端发起请求
        const response = await fetch('http://127.0.0.1:9090/llm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "user_input": messageText
            })
        });

        if (!response.ok) {
            console.error('Error:', response.status);
            return;
        }

        // 流式响应解析
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const llmMessage = createMessageElement("", 'llm-message');
        this.messageList.appendChild(llmMessage);

        // 持续更新LLM回答
        await reader.read().then(function processText({ done, value }) {
            if (done) {
                return;
            }

            const chunk = decoder.decode(value, { stream: true });
            llmMessage.innerHTML += chunk;

            return reader.read().then(processText);
        });

        // 添加到当前会话
        this.sessionManager.addMessageToCurrentSession('llm', llmMessage.innerHTML);
    }

    // 加载会话列表
    loadSessions() {
        const savedSessions = localStorage.getItem('llm-sessions');
        if (savedSessions) {
            this.sessionManager.sessions = JSON.parse(savedSessions);
            this.renderSessionList();
        }
    }

    // 保存会话列表到本地存储
    saveSessions() {
        localStorage.setItem('llm-sessions', JSON.stringify(this.sessionManager.sessions));
    }

    // 渲染会话列表
    renderSessionList() {
        this.scrollableList.innerHTML = '';

        this.sessionManager.sessions.forEach(session => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item';
            if (session.id === this.sessionManager.currentSession.id) {
                listItem.classList.add('selected');
            }

            listItem.textContent = session.title;
            listItem.dataset.sessionId = session.id;

            listItem.addEventListener('click', () => {
                this.loadSession(session.id);
            });

            this.scrollableList.appendChild(listItem);
        });

        this.saveSessions();
    }

    // 加载指定会话
    loadSession(sessionId) {
        const session = this.sessionManager.switchToSession(sessionId);
        if (!session) return;

        this.clearChatWindow();

        // 显示会话中的所有消息
        session.messages.forEach(message => {
            const className = message.role === 'user' ? 'user-message' : 'llm-message';
            const messageElement = createMessageElement('', className);
            messageElement.innerHTML = message.content;
            this.messageList.appendChild(messageElement);
        });

        this.renderSessionList();
        this.scrollToBottom();
    }

    // 清空聊天窗口
    clearChatWindow() {
        this.messageList.innerHTML = '';
    }

    // 创建欢迎提示区域
    createWelcomeContainer() {
        const container = document.createElement('div');
        container.className = 'welcome-container';

        const welcomeText = document.createElement('div');
        welcomeText.className = 'welcome-text';
        welcomeText.textContent = '欢迎提问各大城市的人才引进政策';
        container.appendChild(welcomeText);

        const promptGrid = document.createElement('div');
        promptGrid.className = 'prompt-grid';

        const prompts = [
            "请介绍一下高校本科生落户苏州有哪些优惠政策。",
            "深圳针对硕士研究生的引进政策是什么？",
            "上海人才落户的最新条件有哪些？",
            "介绍一下北京人才引进政策。"
        ];

        prompts.forEach(prompt => {
            const block = document.createElement('div');
            block.className = 'prompt-block';
            block.textContent = `猜你想问：${prompt}`;
            block.addEventListener('click', () => {
                this.userInput.value = prompt;
                this.sendMessage();
            });
            promptGrid.appendChild(block);
        });

        container.appendChild(promptGrid);
        return container;
    }

    // 加载提示区域
    loadPrompts() {
        if (this.sessionManager.currentSession.messages.length === 0) {
            this.messageList.appendChild(this.welcomeContainer);
        }
    }
}


function init() {
    // 启动时清除浏览器本地储存
    localStorage.clear()

    // 添加侧边栏切换逻辑
    document.addEventListener('DOMContentLoaded', function () {
        const hideSidebarButton = document.getElementById('hide-sidebar-button');
        const showSidebarButton = document.getElementById('show-sidebar-button');
        const totalContainer = document.querySelector('.total-container');

        // 隐藏导航栏
        hideSidebarButton.addEventListener('click', function () {
            totalContainer.classList.add('sidebar-hidden');
            showSidebarButton.style.display = 'block';
        });

        // 显示导航栏
        showSidebarButton.addEventListener('click', function () {
            totalContainer.classList.remove('sidebar-hidden');
            showSidebarButton.style.display = 'none';
        });

        // 初始状态检查
        function checkSidebarState() {
            if (totalContainer.classList.contains('sidebar-hidden')) {
                showSidebarButton.style.display = 'block';
            } else {
                showSidebarButton.style.display = 'none';
            }
        }

        checkSidebarState();

        // 初始化UI管理器
        const uiManager = new UIManager();
        uiManager.init();
    });
}

init();