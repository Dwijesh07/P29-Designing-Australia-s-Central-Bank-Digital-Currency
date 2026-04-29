import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './AuthContext';
import keycloak from './keycloak';

// Make keycloak available globally for debugging
window.keycloak = keycloak;

// Initialize Keycloak before rendering
keycloak.init({ onLoad: 'login-required' })
  .then((authenticated) => {
    if (authenticated) {
      // Store token for debugging
      localStorage.setItem('kcToken', keycloak.token);
      
      console.log('✅ Authenticated with Keycloak');
      console.log('👤 User:', keycloak.tokenParsed?.preferred_username);
      console.log('👥 Groups:', keycloak.tokenParsed?.groups);
      
      ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
          <AuthProvider>
            <App />
          </AuthProvider>
        </React.StrictMode>
      );
    } else {
      console.log('❌ Not authenticated');
    }
  })
  .catch((err) => {
    console.error('❌ Keycloak initialization error:', err);
  });
