import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingFooter() {
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email && email.includes('@') && email.includes('.')) {
      setStatusMessage('Thank you for subscribing to our newsletter!');
      setEmail('');
      setTimeout(() => setStatusMessage(''), 4000);
    } else {
      setStatusMessage('Please enter a valid email address.');
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  return (
    <footer>
      {/* Gradient accent bar */}
      <div className="footer-accent-bar" />

      <div className="container">
        <div className="footer-grid">
          {/* Brand + Subscribe Column */}
          <div className="footer-col footer-brand-col">
            <div className="footer-brand">
              <h4 className="footer-brand-name">Safemailz</h4>
              <p className="footer-brand-tagline">
                Protecting your clients' data and revolutionizing how companies engage with their clients & their team.
              </p>
            </div>
            <div className="footer-subscribe-card">
              <h5 className="footer-subscribe-title">Stay Updated</h5>
              <form className="subscribe-form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  className="subscribe-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Subscribe email"
                />
                <button type="submit" className="subscribe-btn" aria-label="Subscribe">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </form>
              {statusMessage && (
                <p className="subscribe-status">{statusMessage}</p>
              )}
            </div>
          </div>

          {/* Links Columns */}
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#about" onClick={(e) => { e.preventDefault(); alert('About page coming soon!'); }}>About us</a></li>
              <li><a href="#news" onClick={(e) => { e.preventDefault(); alert('News page coming soon!'); }}>News</a></li>
              <li><a href="#career" onClick={(e) => { e.preventDefault(); alert('Careers page coming soon!'); }}>Careers</a></li>
              <li><a href="#partner" onClick={(e) => { e.preventDefault(); alert('Partner program coming soon!'); }}>Partner</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link to="/features">Features</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
              <li><Link to="/how-to-use">How to Use</Link></li>
              <li><a href="#enterprise" onClick={(e) => { e.preventDefault(); alert('Enterprise details coming soon!'); }}>Enterprise</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="#docs" onClick={(e) => { e.preventDefault(); alert('Documentation coming soon!'); }}>Documentation</a></li>
              <li><a href="#blog" onClick={(e) => { e.preventDefault(); alert('Blog coming soon!'); }}>Blog</a></li>
              <li><a href="#webinar" onClick={(e) => { e.preventDefault(); alert('Webinars coming soon!'); }}>Webinar</a></li>
              <li><a href="#help" onClick={(e) => { e.preventDefault(); alert('Help center coming soon!'); }}>Help center</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">© {new Date().getFullYear()} Safemailz. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms of Service'); }}>Terms</a>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Privacy Policy'); }}>Privacy</a>
            <a href="#cookies" onClick={(e) => { e.preventDefault(); alert('Cookie Policy'); }}>Cookies</a>
          </div>
          <div className="social-links">
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="LinkedIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="Twitter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
