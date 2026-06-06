import React, { createContext, useState, useContext } from 'react';
import LoginPage from './LoginPage';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const demoUsers = {
    rba_admin: {
      username: 'rba_admin',
      name: 'RBA Administrator',
      role: 'rba_admin',
      bank: null
    },
    banka_admin: {
      username: 'banka_admin',
      name: 'Bank A Admin',
      role: 'banka_admin',
      bank: 'BankA'
    },
    bankb_admin: {
      username: 'bankb_admin',
      name: 'Bank B Admin',
      role: 'bankb_admin',
      bank: 'BankB'
    },
    austrac_admin: {
      username: 'austrac_admin',
      name: 'AUSTRAC Regulator',
      role: 'austrac_admin',
      bank: null
    },
    customer1: {
      username: 'customer1',
      name: 'John Doe',
      role: 'customer',
      bank: null
    }
  };

  const login = async (username, password) => {
    if (demoUsers[username]) {
      setUser(demoUsers[username]);
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid demo username'
    };
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isRBA: user?.role === 'rba_admin',
    isBankA: user?.role === 'banka_admin',
    isBankB: user?.role === 'bankb_admin',
    isAUSTRAC: user?.role === 'austrac_admin',
    isCustomer: user?.role === 'customer'
  };

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}