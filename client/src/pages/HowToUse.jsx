import React from 'react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import '../styles.css';
import '../landing.css';

export default function HowToUse() {
  const navigate = useNavigate();

  const steps = [
    {
      number: '1',
      title: 'Sign up & create admin account',
      summary: "Start by creating your organization's administrative account providing basic company details.",
      details: [
        'Register your company with domain verification',
        'Configure your cryptographic master key pair',
        'Set organization-wide DLP and security policies'
      ],
      icon: '🏢'
    },
    {
      number: '2',
      title: 'Add employees & sync directories',
      summary: 'Invite your team members via email or sync with your existing directory services to onboard your staff.',
      details: [
        'Send one-click invite links or import via CSV/Excel',
        'Assign role-based permissions (Admin, Manager, Employee)',
        'Integrate with Google Workspace, Microsoft 365, or LDAP'
      ],
      icon: '👥'
    },
    {
      number: '3',
      title: 'Share, send & confirm securely',
      summary: 'Start sending secure emails immediately. All communications are automatically encrypted based on your rules.',
      details: [
        'Outbound attachments and bodies encrypted with AES-256',
        'Zero-friction recipient authentication with OTP or portal pass',
        'Real-time audit trail and tampering verification'
      ],
      icon: '🔐'
    }
  ];

  return (
    <div className="landing-page-root">
      <LandingHeader />

      <main>
        {/* Page Hero */}
        <section className="page-hero">
          <div className="container">
            <h1>How to Use SafeMailz?</h1>
            <p>
              Get your entire organization onboarded and sending military-grade encrypted emails in under 5 minutes.
            </p>
          </div>
        </section>

        {/* Detailed Steps */}
        <section className="container" style={{ padding: 'var(--section-padding-y, 4.5rem) var(--container-padding-x, 1.5rem)', margin: 'var(--section-margin-y, 0) auto' }}>
          <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--card-gap, 2rem)' }}>
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="step-card"
                style={{
                  padding: 'var(--card-padding, 2.25rem)',
                  alignItems: 'flex-start',
                  boxShadow: 'var(--card-shadow, 0 4px 20px rgba(0,0,0,0.04))',
                  borderRadius: 'var(--card-border-radius, 12px)',
                  border: 'var(--card-border-width, 1px) solid var(--border-color, #E2E8F0)',
                  background: 'var(--card-bg, #FFFFFF)'
                }}
              >
                <div
                  className="step-number"
                  style={{ width: '48px', height: '48px', fontSize: '1.3rem', marginTop: '0.2rem' }}
                >
                  {step.number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{step.icon}</span>
                    <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{step.title}</h2>
                  </div>
                  <p style={{ fontSize: '1.05rem', color: 'var(--text-gray)', marginBottom: '1.25rem' }}>
                    {step.summary}
                  </p>
                  <div
                    style={{
                      background: '#F8FAFC',
                      padding: '1.25rem 1.5rem',
                      borderRadius: '8px',
                      borderLeft: '4px solid var(--primary-color)'
                    }}
                  >
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>
                      Key Milestones:
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {step.details.map((d, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            fontSize: '0.9rem',
                            color: '#475569',
                            marginBottom: i === step.details.length - 1 ? 0 : '0.4rem'
                          }}
                        >
                          <span style={{ color: '#22C55E', fontWeight: 'bold' }}>✓</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '0.9rem 2.5rem', fontSize: '1.1rem' }}
              onClick={() => navigate('/signup')}
            >
              Get Started Now — Free Trial
            </button>
          </div>
        </section>

        {/* Security Assurance */}
        <section className="dark-section">
          <div className="container" style={{ textAlign: 'center', maxWidth: '800px' }}>
            <h2 style={{ color: 'white', marginBottom: '1rem', fontSize: '2rem' }}>
              Zero Installation Required for Recipients
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Your clients don't need to install any software or apps. Encrypted emails can be securely unlocked via SMS OTP, secure web-viewer, or biometrics on any modern device.
            </p>
            <button className="btn btn-outline" style={{ color: 'white', borderColor: 'white' }} onClick={() => navigate('/pricing')}>
              View Pricing & Plans
            </button>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
