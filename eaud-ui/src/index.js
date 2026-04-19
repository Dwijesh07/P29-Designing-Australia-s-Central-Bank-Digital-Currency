import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LoginPage from './LoginPage';
import { AuthProvider, useAuth } from './AuthContext';

function Main() {
  const { user } = useAuth();
  
  if (!user) {
    return <LoginPage />;
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
