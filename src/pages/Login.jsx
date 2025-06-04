import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';
import { get_backend_url } from '../utils/url';
function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const backendUrl = get_backend_url();

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 注册表单验证
    if (!isLogin && password !== confirmPassword) {
      setErrorMessage('两次密码不一致');
      return;
    }

    try {
      const endpoint = isLogin ? 'login' : 'register';
      const response = await fetch(`${backendUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          // 登录成功，保存用户信息到localStorage
          localStorage.setItem('user', JSON.stringify({
            username,
            role: data.role,
            id: data.id
          }));
          // 跳转到主页
          navigate('/chat');
        } else {
          // 注册成功，切换到登录表单
          alert('注册成功，请登录');
          setIsLogin(true);
          setUsername('');
          setPassword('');
        }
      } else {
        setErrorMessage(data.message || (isLogin ? '登录失败' : '注册失败'));
      }
    } catch (error) {
      setErrorMessage('网络错误，请重试');
      console.error('Error:', error);
    }
  };

  return (
    <div className="login-page gradient-bg">
      <div className="login-container fade-in">
        <h2>{isLogin ? 'RAG智能问答系统' : '用户注册'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="请输入用户名"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="请输入密码"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="请再次输入密码"
              />
            </div>
          )}

          <div className="button-group">
            <button type="submit">{isLogin ? '登录' : '注册'}</button>
            <button type="button" onClick={toggleForm}>
              {isLogin ? '注册新账号' : '返回登录'}
            </button>
          </div>
        </form>

        {errorMessage && <div className="error">{errorMessage}</div>}
      </div>
    </div>
  );
}

export default Login; 