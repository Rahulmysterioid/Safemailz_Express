import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/' || location.pathname === '/home';

  const handleNavClick = (e, sectionId, route) => {
    setMobileMenuOpen(false);
    if (isHome && sectionId) {
      e.preventDefault();
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `#${sectionId}`);
        return;
      }
    }
  };

  return (
    <header>
      <div className="container flex justify-between items-center">
        <Link to="/" className="logo" onClick={() => setMobileMenuOpen(false)}>
          <span className="logo-icon">M</span>
          <span className="logo-text">SAFEMAILZ</span>
          <span className="logo-subtext">PROTECT YOUR CLIENTS</span>
        </Link>

        <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link
            to="/"
            className={isHome ? 'active' : ''}
            style={isHome ? { color: 'var(--primary-color)', fontWeight: '600' } : {}}
            onClick={(e) => {
              setMobileMenuOpen(false);
              if (isHome) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            Home
          </Link>
          <Link
            to="/how-to-use"
            className={location.pathname === '/how-to-use' ? 'active' : ''}
            style={location.pathname === '/how-to-use' ? { color: 'var(--primary-color)', fontWeight: '600' } : {}}
            onClick={(e) => handleNavClick(e, 'how-to-use', '/how-to-use')}
          >
            How to use
          </Link>
          <Link
            to="/features"
            className={location.pathname === '/features' ? 'active' : ''}
            style={location.pathname === '/features' ? { color: 'var(--primary-color)', fontWeight: '600' } : {}}
            onClick={(e) => handleNavClick(e, 'features', '/features')}
          >
            Features
          </Link>
          <Link
            to="/pricing"
            className={location.pathname === '/pricing' ? 'active' : ''}
            style={location.pathname === '/pricing' ? { color: 'var(--primary-color)', fontWeight: '600' } : {}}
            onClick={(e) => handleNavClick(e, 'pricing', '/pricing')}
          >
            Pricing
          </Link>

          <Link
            to="/signin"
            className={location.pathname === '/signin' ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="nav-btn-signup"
            onClick={() => setMobileMenuOpen(false)}
          >
            Sign up
          </Link>
        </nav>

        <button
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  );
}
