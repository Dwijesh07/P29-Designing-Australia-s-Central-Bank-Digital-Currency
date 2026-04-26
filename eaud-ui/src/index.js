import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import LoginPage from './LoginPage';
import { AuthProvider, useAuth } from './AuthContext';

const API_URL = 'http://localhost:3001/api';

// Force no caching on all requests
axios.defaults.headers.common['Cache-Control'] = 'no-cache, no-store, must-revalidate';

function LoginWrapper({ onLoginSuccess }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          await axios.get(`${API_URL}/auth/verify`);
          onLoginSuccess();
        } catch (err) {
          // Token invalid, clear it
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
      setHasChecked(true);
    };
    
    checkToken();
  }, [onLoginSuccess]);

  const handleLogin = async (username, password) => {
    try {
      // Clear any existing headers before login
      delete axios.defaults.headers.common['Authorization'];
      
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      const { token } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      onLoginSuccess();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  if (isLoading || !hasChecked) {
    return <div style={{ background: '#0a0c1a', minHeight: '100vh' }}></div>;
  }

  return <LoginPage onLogin={handleLogin} />;
}

function Main() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { setUser, setToken } = useAuth();

  const handleLoginSuccess = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64));
        setUser(decoded);
        setToken(token);
        setIsLoggedIn(true);
      } catch (e) {
        console.error('Invalid token');
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    }
  };

  if (!isLoggedIn) {
    return <LoginWrapper onLoginSuccess={handleLoginSuccess} />;
  }

  return <App />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <Main />
    </AuthProvider>
  </React.StrictMode>
);
