import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import keycloak from './keycloak';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Attach the real Keycloak token to every backend request
axios.interceptors.request.use(
  async (config) => {
    if (keycloak.authenticated && keycloak.token) {
      try {
        if (keycloak.isTokenExpired(10)) {
          await keycloak.updateToken(30);
        }

        config.headers.Authorization = `Bearer ${keycloak.token}`;
      } catch (error) {
        console.error('Token refresh failed:', error);
        keycloak.login();
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const buildUserFromToken = () => {
    const tokenParsed = keycloak.tokenParsed || {};

    let groups = tokenParsed.groups || [];

    if (typeof groups === 'string') {
      groups = [groups];
    }

    const normalizedGroups = groups.map((g) =>
      String(g).replace(/^\//, '').toLowerCase()
    );

    let role = 'customer';
    let bank = null;

    if (normalizedGroups.includes('rba_admin')) {
      role = 'rba_admin';
    } else if (normalizedGroups.includes('banka_admin')) {
      role = 'banka_admin';
      bank = 'BankA';
    } else if (normalizedGroups.includes('bankb_admin')) {
      role = 'bankb_admin';
      bank = 'BankB';
    } else if (
      normalizedGroups.includes('austrac_admin') ||
      normalizedGroups.includes('austrac')
    ) {
      role = 'austrac_admin';
    }

    return {
      username: tokenParsed.preferred_username || 'unknown-user',
      name:
        tokenParsed.name ||
        `${tokenParsed.given_name || ''} ${tokenParsed.family_name || ''}`.trim() ||
        tokenParsed.preferred_username ||
        'User',
      email: tokenParsed.email || '',
      role,
      bank,
      groups: normalizedGroups
    };
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authenticated = await keycloak.init({
          onLoad: 'login-required',
          checkLoginIframe: false
        });

        if (authenticated) {
          const loggedUser = buildUserFromToken();
          setUser(loggedUser);
        } else {
          keycloak.login();
        }
      } catch (error) {
        console.error('Keycloak init failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = () => {
    keycloak.login();
  };

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();

    keycloak.logout({
      redirectUri: window.location.origin
    });
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
    return (
      <div style={{ background: '#0a0c1a', minHeight: '100vh' }}>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}