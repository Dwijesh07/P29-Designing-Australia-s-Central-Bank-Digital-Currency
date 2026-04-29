import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import keycloak from './keycloak';

const API_URL = 'http://localhost:3001/api';

// Add token to all axios requests
axios.interceptors.request.use(async (config) => {
  if (keycloak.authenticated && keycloak.token) {
    if (keycloak.isTokenExpired(10)) {
      await keycloak.updateToken(30);
    }
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
}, (error) => Promise.reject(error));

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      if (!keycloak.authenticated) {
        keycloak.login();
        return;
      }

      const tokenParsed = keycloak.tokenParsed;
      console.log('🔍 Token payload:', tokenParsed);
      
      let groups = tokenParsed?.groups || [];
      if (typeof groups === 'string') {
        groups = [groups];
      }
      
      console.log('👥 Raw groups:', groups);
      
      // Remove the leading slash from group names (Keycloak adds / by default)
      const normalizedGroups = groups.map(g => String(g).replace(/^\//, '').toLowerCase());
      console.log('📝 Normalized groups (slash removed):', normalizedGroups);
      
      let role = 'customer';
      let bank = null;

      if (normalizedGroups.includes('rba_admin')) {
        role = 'rba_admin';
        console.log('✅ Matched rba_admin role');
      } else if (normalizedGroups.includes('banka_admin')) {
        role = 'banka_admin';
        bank = 'BankA';
        console.log('✅ Matched banka_admin role');
      } else if (normalizedGroups.includes('bankb_admin')) {
        role = 'bankb_admin';
        bank = 'BankB';
        console.log('✅ Matched bankb_admin role');
      } else if (normalizedGroups.includes('austrac_admin')) {
        role = 'austrac_admin';
        console.log('✅ Matched austrac_admin role');
      } else {
        console.log('❌ No matching group found. Available groups:', normalizedGroups);
      }
      
      console.log('🎭 Final role:', role);

      setUser({
        username: tokenParsed?.preferred_username,
        name: tokenParsed?.name || tokenParsed?.preferred_username,
        role: role,
        bank: bank,
        email: tokenParsed?.email
      });
      setLoading(false);
    };
    
    if (keycloak.authenticated !== undefined) {
      loadUser();
    } else {
      keycloak.init({ onLoad: 'login-required' }).then(() => loadUser());
    }
  }, []);

  const login = () => {
    keycloak.login();
  };

  const logout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: keycloak.authenticated || false,
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
