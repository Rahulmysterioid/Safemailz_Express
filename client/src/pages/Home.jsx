import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import '../styles.css';
import '../landing.css';

export default function Home() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState(1); // 2nd FAQ open by default like original
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Check URL hash on initial load (e.g. /#features, /#how-to-use, /#pricing)
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, []);

  const features = [
    {
      icon: '🛡️',
      title: 'End-to-End Encryption',
      desc: 'Military-grade encryption ensures your messages remain confidential from send to receive.'
    },
    {
      icon: '👤',
      title: 'Multi-Factor Authentication',
      desc: 'Add an extra layer of security with advanced multi-factor authentication protocols.'
    },
    {
      icon: '⚙️',
      title: 'User Access Control',
      desc: 'Granular permissions let you control exactly who can view, edit, or forward emails.'
    },
    {
      icon: '📊',
      title: 'Data DLP Policy',
      desc: 'Prevent sensitive data like credit cards and SSNs from ever leaving your network.'
    },
    {
      icon: '🔍',
      title: 'Vulnerability Assessment',
      desc: 'Continuous scanning to identify and patch potential security vulnerabilities proactively.'
    },
    {
      icon: '📝',
      title: 'Audit & Monitoring Logs',
      desc: 'Detailed tracking of all activities for compliance and security investigations.'
    }
  ];

  const pricingPlans = [
    {
      name: 'Basic',
      monthlyPrice: 300,
      yearlyPrice: 3000,
      features: ['Up to 10 users', 'Standard Encryption', 'Email Support']
    },
    {
      name: 'Pro',
      popular: true,
      monthlyPrice: 600,
      yearlyPrice: 6000,
      features: ['Up to 50 users', 'Advanced DLP', 'Priority Support']
    },
    {
      name: 'Enterprise',
      monthlyPrice: 1000,
      yearlyPrice: 10000,
      features: ['Unlimited users', 'Custom integrations', '24/7 Phone Support']
    }
  ];

  const faqs = [
    {
      question: 'How does Safemailz work?',
      answer: 'Safemailz integrates with your existing email provider to encrypt outbound messages and attachments automatically.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we use military-grade AES-256 encryption. We never store your encryption keys, meaning even we cannot read your emails.'
    },
    {
      question: 'Does this work with large teams?',
      answer: 'Absolutely. Our Enterprise plan is designed for organizations with thousands of users, featuring advanced administration tools.'
    },
    {
      question: 'How do I create an account?',
      answer: 'Simply click "Sign up", choose your plan, and follow the onboarding wizard to configure your organization.'
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? -1 : index);
  };

  return (
    <div className="landing-page-root">
      <LandingHeader />

      <main>
        {/* Hero Section */}
        <section className="hero container">
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', padding: '0.4rem 1.25rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', color: '#2563EB', marginBottom: '1.5rem', letterSpacing: '0.02em' }}>
            🔒 Trusted by 500+ Organizations
          </div>
          <h1 className="hero-title">
            Protect Your Clients'<br /><span style={{ background: 'linear-gradient(135deg, #3DA2F3, #2563EB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sensitive Information</span>
          </h1>
          <p className="hero-subtitle">
            Enterprise-grade email security solutions designed for modern businesses to safeguard their most important communications.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }} onClick={() => navigate('/signup')}>
              Get Started Now
            </button>
            <button className="btn btn-outline" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }} onClick={() => setShowDemoModal(true)}>
              ▶ Watch a Demo
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features">
          <div className="container">
            <h2 className="section-title">Enterprise features designed to prevent data leaks</h2>
            <p className="section-subtitle">Comprehensive tools to monitor and protect your organization's data.</p>

            <div className="features-grid">
              {features.map((feat, index) => {
                const isActive = activeFeatureIndex === index;
                return (
                  <div
                    key={index}
                    className={`feature-card ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveFeatureIndex(index)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="feature-icon">{feat.icon}</div>
                    <h3>{feat.title}</h3>
                    <p>{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Dark Section */}
        <section className="dark-section">
          <div className="container dark-content">
            <div className="dark-images">
              <img src="/images/office_workers.png" alt="Team working securely in office" />
              <div
                className="play-button"
                onClick={() => setShowDemoModal(true)}
                title="Watch overview video"
              />
            </div>
            <div className="dark-text">
              <h2>Know More About Safemailz</h2>
              <p>
                A comprehensive suite of security tools that ensure your business stays protected. We use industry-leading encryption and security protocols to keep your data safe and compliant.
              </p>

              <div className="stats-grid">
                <div className="stat">
                  <h3>4.5/5</h3>
                  <p>Client Rating</p>
                </div>
                <div className="stat">
                  <h3>425+</h3>
                  <p>Security Experts</p>
                </div>
              </div>

              <button className="btn btn-primary" onClick={() => navigate('/signup')}>
                Get Started
              </button>
            </div>
          </div>
        </section>

        {/* How to Use Section */}
        <section id="how-to-use" className="how-to container">
          <h2 className="section-title">How to Use SafeMailz?</h2>

          <div className="steps">
            <div className="step-card">
              <div className="step-number">1</div>
              <div>
                <h3>Sign up & create admin account</h3>
                <p>Start by creating your organization's administrative account providing basic company details.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div>
                <h3>Add employees</h3>
                <p>Invite your team members via email or sync with your existing directory services to onboard your staff.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div>
                <h3>Share & confirm</h3>
                <p>Start sending secure emails immediately. All communications are automatically encrypted based on your rules.</p>
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => navigate('/signup')}>
            Get Started Now
          </button>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="pricing">
          <div className="container">
            <h2 className="section-title">Pricing Plans</h2>

            <div className="pricing-toggle">
              <button
                className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly
              </button>
            </div>

            <div className="pricing-grid">
              {pricingPlans.map((plan, i) => {
                const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                const unit = billingCycle === 'monthly' ? '/seat/mo' : '/seat/yr';
                return (
                  <div key={i} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                    {plan.popular && <div className="pricing-badge">Most Popular</div>}
                    <div className="pricing-title">{plan.name}</div>
                    <div className="pricing-price">
                      <span className="price-currency">₹</span>
                      <span className="price-value">{price}</span>
                      <span className="price-unit">{unit}</span>
                    </div>
                    <ul className="pricing-features">
                      {plan.features.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: 'auto' }}
                      onClick={() => navigate(`/signup?plan=${plan.name.toLowerCase()}`)}
                    >
                      Choose Plan
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Security CTA Section */}
        <section className="security-cta container">
          <h2 className="section-title">Enterprise-Grade Email Security</h2>
          <p className="section-subtitle">Join thousands of organizations that trust Safemailz to protect their data.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => navigate('/signup')}>
              Start Free Trial
            </button>
            <button
              className="btn btn-outline"
              onClick={() => alert('Our enterprise sales team will contact you shortly!')}
            >
              Contact Sales
            </button>
          </div>
        </section>

        {/* Testimonials */}
        <section className="testimonials">
          <div className="container testimonials-container">
            <div className="testimonials-intro">
              <h2 className="section-title" style={{ textAlign: 'left' }}>
                What others are saying about Us
              </h2>
              <p>Don't just take our word for it. See what leading industry experts have to say.</p>
              <div className="stars">★★★★★</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)', marginTop: '0.5rem', fontWeight: '600' }}>
                Rated 4.9/5 on G2
              </p>
            </div>

            <div className="testimonials-grid">
              <div className="testimonial-card">
                <img src="/images/avatar_1.png" alt="Oliver" className="testimonial-avatar" />
                <div className="testimonial-content">
                  <h4>Oliver</h4>
                  <p>"It has never been easier to protect our sensitive data. Safemailz is an essential tool."</p>
                  <div className="stars">★★★★★</div>
                </div>
              </div>
              <div className="testimonial-card">
                <img src="/images/avatar_2.png" alt="James" className="testimonial-avatar" />
                <div className="testimonial-content">
                  <h4>James</h4>
                  <p>"The best investment we've made in our cybersecurity infrastructure this year."</p>
                  <div className="stars">★★★★★</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq container">
          <div className="faq-container">
            <div className="faq-intro">
              <h2 className="section-title" style={{ textAlign: 'left' }}>
                Frequently Asked Questions
              </h2>
              <p>Find answers to common questions about our platform, features, and security protocols.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '1.5rem' }}
                onClick={() => alert('Additional FAQs and documentation available in our Help Center!')}
              >
                See All
              </button>
            </div>

            <div className="faq-list">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="faq-item">
                    <div className="faq-question" onClick={() => toggleFaq(idx)}>
                      <span>{faq.question}</span>
                      <span className="faq-icon">{isOpen ? '−' : '+'}</span>
                    </div>
                    {isOpen && <div className="faq-answer">{faq.answer}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />

      {/* Demo Video Modal */}
      {showDemoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
          onClick={() => setShowDemoModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDemoModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-gray)'
              }}
            >
              ✕
            </button>
            <h3 style={{ marginBottom: '1rem' }}>Safemailz Product Demo</h3>
            <div
              style={{
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
                background: '#0F172A',
                aspectRatio: '16/9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                textAlign: 'center',
                padding: '2rem'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Interactive Demo Walkthrough</h4>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: '400px' }}>
                Safemailz automates military-grade encryption and outbound DLP rules to safeguard sensitive client communications.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowDemoModal(false)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowDemoModal(false);
                  navigate('/signup');
                }}
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
