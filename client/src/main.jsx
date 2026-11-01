import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Handle revoked sessions before failed requests appear as empty dashboard data.
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const requestUrl = new URL(args[0] instanceof Request ? args[0].url : String(args[0]), window.location.href);
    const isOwnApi = requestUrl.origin === window.location.origin && requestUrl.pathname.startsWith('/api/');
    if (isOwnApi && response.status === 401) {
        try {
            const data = await response.clone().json();
            if (data.code === 'SESSION_EXPIRED') {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('token');
                if (window.location.pathname !== '/signin') {
                    window.location.replace('/signin?error=session_expired');
                }
            }
        } catch (e) {}
    }
    if (isOwnApi && response.status === 403) {
        const clone = response.clone();
        try {
            const data = await clone.json();
            if (data.is_blocked || (data.message && data.message.includes('blocked'))) {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('token');
                if (window.location.pathname !== '/signin') {
                    window.location.href = '/signin?error=blocked';
                }
            }
        } catch(e) {}
    }
    return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
