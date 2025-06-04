import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminKnowledgeBase.css';
import { get_backend_url } from '../utils/url';

const API_BASE_URL = get_backend_url();

function AdminKnowledgeBase() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  const navigate = useNavigate();


  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      alert('您没有权限访问此页面，即将跳转到登录页。');
      navigate('/login');
    }
  }, [navigate]);


  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/knowledgebase/list`);
      if (!response.ok) {
        throw new Error(`获取文件列表失败: ${response.statusText}`);
      }
      const data = await response.json();

      //////////////////////////////////////////
      // 
      console.log(data.list.length);
      //////////////////////////////////////////

      setFiles(data.list || []); // 对应后端字段 "list"
    } catch (err) {
      setError(err.message);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileSelect = async (filename) => {
    if (selectedFile === filename && fileContent && !isEditing) {
      setSelectedFile(null);
      setFileContent('');
      setEditContent('');
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setError('');
    setSelectedFile(filename);
    setIsEditing(false);
    try {
      const response = await fetch(`${API_BASE_URL}/knowledgebase/${filename}`);
      if (!response.ok) {
        throw new Error(`获取文件内容失败: ${response.statusText}`);
      }
      const result = await response.json();
      const content = result.content || '';
      setFileContent(content);
      setEditContent(content);
    } catch (err) {
      setError(err.message);
      setFileContent('');
      setEditContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (!selectedFile) {
      alert('请先选择一个文件进行编辑。');
      return;
    }
    setEditContent(fileContent); // 确保从当前最新内容开始编辑
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(fileContent); // 恢复到未编辑状态
  }

  const handleSave = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/knowledgebase/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: selectedFile,
          file_content: editContent,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: response.statusText }));
        throw new Error(`保存文件失败: ${errorData.msg}`);
      }
      const data = await response.json();
      setFileContent(editContent);
      setIsEditing(false);
      alert(data.msg || '文件保存成功，知识库已重构');
      fetchFiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`确定要删除文件 "${filename}" 吗？该操作会重构知识库。`)) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/knowledgebase/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: filename }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: response.statusText }));
        throw new Error(`删除文件失败: ${errorData.msg}`);
      }
      const data = await response.json();
      alert(data.msg || '文件删除成功，知识库已重构');
      setSelectedFile(null);
      setFileContent('');
      setEditContent('');
      fetchFiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChangeForUpload = (event) => {
    setUploadFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      alert('请先选择一个文件上传。');
      return;
    }
    setIsLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('files', uploadFile);

    try {
      const response = await fetch(`${API_BASE_URL}/knowledgebase/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: response.statusText }));
        throw new Error(`上传文件失败: ${errorData.msg}`);
      }
      const data = await response.json();
      alert(data.msg || '文件上传成功，知识库已重构');
      setUploadFile(null);
      document.getElementById('file-upload-input').value = '';
      fetchFiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-kb-page">
      <header className="admin-kb-header">
        <h1>知识库管理 (管理员)</h1>
        <button onClick={() => navigate('/chat')} className="back-to-chat-button">
          <span className="back-icon">↩</span>
          返回聊天
        </button>
      </header>

      {isLoading && <div className="loading-indicator">加载中...</div>}
      {error && <div className="error-message">错误: {error}</div>}

      <div className="admin-kb-container">
        <div className="file-list-section">
          <h2>知识库文件</h2>
          {files.length === 0 && !isLoading && <p>知识库中暂无文件。</p>}
          <ul>
            {files.map((file) => (
              <li
                key={file}
                className={`file-item ${selectedFile === file ? 'selected' : ''}`}
              >
                <span onClick={() => handleFileSelect(file)} className="file-name">{file}</span>
                <button onClick={() => handleDelete(file)} className="delete-button">删除</button>
              </li>
            ))}
          </ul>
          <div className="upload-section">
            <h3>上传新文件到知识库</h3>
            <div className="file-input-container">
              <span className="file-name-display">{uploadFile ? uploadFile.name : '未选择文件'}</span>
              <div className="file-upload-actions">
                <label htmlFor="file-upload-input" className="custom-file-upload">
                  <span className="file-icon"></span>
                  选择文件
                </label>
                <button onClick={handleUpload} disabled={!uploadFile || isLoading}>上传文件</button>
              </div>
              <input type="file" id="file-upload-input" onChange={handleFileChangeForUpload} />
            </div>
          </div>
        </div>

        {selectedFile && (
          <div className="file-content-section">
            <h2>文件内容: {selectedFile}</h2>
            {isEditing ? (
              <>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows="20"
                  cols="80"
                />
                <div className="edit-actions">
                  <button onClick={handleSave} disabled={isLoading}>保存更改</button>
                  <button onClick={handleCancelEdit} disabled={isLoading}>取消</button>
                </div>
              </>
            ) : (
              <>
                <pre className="file-content-display">{fileContent || "无法加载文件内容或文件为空。"}</pre>
                <button onClick={handleEdit} className="edit-button" disabled={isLoading || !fileContent}>编辑文件</button>
              </>
            )}
          </div>
        )}
        {!selectedFile && !isLoading && files.length > 0 && (
          <div className="file-content-section placeholder">
            <p>请从左侧选择一个文件以查看或编辑其内容。</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminKnowledgeBase; 