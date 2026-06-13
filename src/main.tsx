import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor to support multi-browser sessions
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  const userId = localStorage.getItem('session_user_id') || 'u1';
  const token = localStorage.getItem('session_token') || '';
  const newInit = { ...init } as any;
  newInit.headers = {
    ...newInit.headers,
    'Session-User-Id': userId,
    'Session-Token': token
  };
  return originalFetch(input, newInit);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
