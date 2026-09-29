import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import '../styles.css';
import '../landing.css';

export default function Features() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const allFeatures = [
    {
      category: 'security',
      icon: '🛡️',
      title: 'End-to-End Encryption',
      desc: 'Military-grade AES-256 and asymmetric RSA 4096-bit encryption ensures that your messages and files remain confidential from send to receive.',
      points: ['Client-side key derivation', 'Zero-knowledge architecture', 'Automatic attachment encryption']
    },
    {
      category: 'access',
      icon: '👤',
      title: 'Multi-Factor Authentication',
      desc: 'Enforce MFA across your entire organization with support for Authenticator apps, hardware security keys (FIDO2), and SMS OTPs.',
      points: ['FIDO2 / WebAuthn support', 'Adaptive risk-based challenge', 'SMS and Email backup OTP']
    },
    {
      category: 'access',
      icon: '⚙️',
      title: 'User Access Control',
      desc: 'Granular permissions let you control exactly who can view, forward, download, print, or reply to sensitive communications.',
      points: ['Role-Based Access Control (RBAC)', 'Revocable access at any time', 'Dynamic recipient watermarking']
    },
    {
      category: 'compliance',
      icon: '📊',
      title: 'Data DLP Policy',
      desc: 'Prevent confidential information like credit card numbers, tax IDs, health records, and source code from leaving your organization.',
      points: ['Pre-built compliance regexes', 'OCR scanning inside PDF & images', 'Real-time outbound block or quarantine']
    },
    {
      category: 'security',
      icon: '🔍',
      title: 'Vulnerability Assessment',
      desc: 'Continuous automated scanning to identify and patch configuration vulnerabilities, weak ciphers, and misconfigured SPF/DKIM records.',
      points: ['Automated email domain health checks', 'Anti-spoofing enforcement', 'DKIM, SPF & DMARC verification']
    },
    {
      category: 'compliance',
      icon: '📝',
      title: 'Audit & Monitoring Logs',
      desc: 'Comprehensive immutable logging of every email dispatch, view event, decryption attempt, and administrative configuration change.',
      points: ['Tamper-evident audit trails', 'Export to SIEM (Splunk, Datadog)', 'HIPAA & GDPR compliance ready']
    }
  ];

  const filteredFeatures = activeTab === 'all' 
    ? allFeatures 
    : allFeatures.filter(f => f.category === activeTab);

  return (
    <div className="landing-page-root">
      <LandingHeader />

      <main>
        {/* Page Hero */}
        <section className="page-hero">
          <div className="container">
            <h1>Enterprise Security Features</h1>
            <p>
              Explore the robust suite of defenses designed to prevent data leaks, enforce compliance, and protect client privacy.
            </p>

            <div className="features-filter-bar">
              <button
                className={`filter-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Features
              </button>
              <button
                className={`filter-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                Cryptography & Protection
              </button>
              <button
                className={`filter-btn ${activeTab === 'compliance' ? 'active' : ''}`}
                onClick={() => setActiveTab('compliance')}
              >
                DLP & Compliance
              </button>
              <button
                className={`filter-btn ${activeTab === 'access' ? 'active' : ''}`}
                onClick={() => setActiveTab('access')}
              >
                Access & Identity
              </button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container" style={{ padding: 'var(--section-padding-y, 4.5rem) var(--container-padding-x, 1.5rem)', margin: 'var(--section-margin-y, 0) auto' }}>
          <div className="features-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {filteredFeatures.map((feat, index) => (
              <div
                key={index}
                className="feature-card"
                style={{
                  padding: 'var(--card-padding, 2.5rem)',
                  borderRadius: 'var(--card-border-radius, 16px)',
                  border: 'var(--card-border-width, 1px) solid var(--border-color, #E2E8F0)',
                  background: 'var(--card-bg, #FFFFFF)',
                  boxShadow: 'var(--card-shadow, 0 4px 20px rgba(0,0,0,0.03))'
                }}
              >
                <div className="feature-icon" style={{ fontSize: '1.5rem' }}>
                  {feat.icon}
                </div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>{feat.title}</h3>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                  {feat.desc}
                </p>
                <div style={{ marginTop: 'auto', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {feat.points.map((p, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: '0.85rem',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.35rem'
                        }}
                      >
                        <span style={{ color: '#22C55E', fontWeight: 'bold' }}>✓</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="dark-section">
          <div className="container" style={{ textAlign: 'center', maxWidth: '750px' }}>
            <h2 style={{ color: 'white', fontSize: '2.25rem', marginBottom: '1rem' }}>
              Protect Your Enterprise Data Today
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Join forward-thinking companies securing their intellectual property and client communications with Safemailz.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate('/signup')}>
                Start 14-Day Free Trial
              </button>
              <button className="btn btn-outline" style={{ color: 'white', borderColor: 'white' }} onClick={() => navigate('/pricing')}>
                Check Pricing
              </button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
