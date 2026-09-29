import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global fetch interceptor for 403 Blocked user
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    if (response.status === 403) {
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
