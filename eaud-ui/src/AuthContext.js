import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// Force no caching on all axios requests
axios.defaults.headers.common['Cache-Control'] = 'no-cache, no-store, must-revalidate';
axios.defaults.headers.common['Pragma'] = 'no-cache';
axios.defaults.headers.common['Expires'] = '0';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear any existing axios headers on startup
    delete axios.defaults.headers.common['Authorization'];
    
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      try {
        const base64Url = storedToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64));
        setUser(decoded);
        setToken(storedToken);
      } catch (e) {
        console.error('Invalid token');
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // Clear any existing headers before login
      delete axios.defaults.headers.common['Authorization'];
      
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const logout = () => {
    // Clear everything
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    // Force hard reload to clear all React state and cached data
    window.location.href = '/';
  };

  const value = {
    user,
    token,
    setUser,
    setToken,
    login,
    logout,
    isAuthenticated: !!token,
    isRBA: user?.role === 'rba_admin',
    isBankA: user?.role === 'banka_admin',
    isBankB: user?.role === 'bankb_admin',
    isAUSTRAC: user?.role === 'austrac_admin',
    isCustomer: user?.role === 'customer'
  };

  if (loading) {
    return <div style={{ background: '#0a0c1a', minHeight: '100vh' }}></div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
