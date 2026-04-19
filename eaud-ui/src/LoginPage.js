import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import './LoginPage.css';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏦 eAUD CBDC</h1>
          <p>Central Bank Digital Currency Platform</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="login-demo">
          <p>Demo Credentials:</p>
          <div className="demo-grid">
            <div><strong>rba_admin</strong> / admin123</div>
            <div><strong>banka_admin</strong> / bankA123</div>
            <div><strong>bankb_admin</strong> / bankB123</div>
            <div><strong>austrac_admin</strong> / austrac123</div>
            <div><strong>customer1</strong> / pass123</div>
            <div><strong>customer2</strong> / pass123</div>
          </div>
        </div>
        
        <div className="login-footer">
          <p>eAUD CBDC - Hyperledger Fabric</p>
          <p>Reserve Bank of Australia | Regulated Network</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
