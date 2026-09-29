import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import '../styles.css';
import '../landing.css';

export default function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [openFaq, setOpenFaq] = useState(-1);

  const plans = [
    {
      name: 'Basic',
      monthlyPrice: 300,
      yearlyPrice: 3000,
      desc: 'Ideal for small teams requiring fundamental email protection.',
      features: [
        'Up to 10 users',
        'Standard AES-256 Encryption',
        'Basic DLP Policies',
        'Email Support',
        '7-day Audit Log Retention'
      ]
    },
    {
      name: 'Pro',
      popular: true,
      monthlyPrice: 600,
      yearlyPrice: 6000,
      desc: 'Engineered for growing businesses handling client financial & confidential data.',
      features: [
        'Up to 50 users',
        'Advanced DLP & Regex Filters',
        'Attachment OCR & Redaction',
        'Multi-Factor Authentication',
        'Priority 24/7 Email Support',
        '1-Year Audit Log Retention'
      ]
    },
    {
      name: 'Enterprise',
      monthlyPrice: 1000,
      yearlyPrice: 10000,
      desc: 'Tailored for large organizations demanding strict compliance and custom infrastructure.',
      features: [
        'Unlimited users',
        'Custom Integrations & APIs',
        'Active Directory / LDAP Sync',
        'Dedicated Account Manager',
        '24/7 Phone & Priority SLA Support',
        'Unlimited Audit Log Retention'
      ]
    }
  ];

  const comparisonRows = [
    { name: 'Max User Seats', basic: 'Up to 10', pro: 'Up to 50', ent: 'Unlimited' },
    { name: 'AES-256 End-to-End Encryption', basic: '✓', pro: '✓', ent: '✓' },
    { name: 'Data Loss Prevention (DLP)', basic: 'Basic Rules', pro: 'Advanced & Custom', ent: 'Enterprise Custom' },
    { name: 'OCR Attachment Redaction', basic: '—', pro: '✓', ent: '✓' },
    { name: 'Multi-Factor Authentication (MFA)', basic: 'SMS / Email', pro: 'TOTP & Security Keys', ent: 'Custom SSO / SAML' },
    { name: 'Audit Log Retention', basic: '7 Days', pro: '1 Year', ent: 'Unlimited / SIEM' },
    { name: 'Support SLA', basic: 'Standard Email', pro: 'Priority Email (4h)', ent: '24/7 Dedicated Phone' }
  ];

  const pricingFaqs = [
    {
      q: 'Can I change my plan or add users later?',
      a: 'Yes, you can easily upgrade, downgrade, or add additional seats directly from your admin dashboard at any time. Prorated charges will apply automatically.'
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept Razorpay, UPI, Net Banking, and all major Credit and Debit Cards (Visa, MasterCard, American Express, RuPay).'
    },
    {
      q: 'Is there a free trial available?',
      a: 'Yes! You can start a 14-day free trial on any plan without entering any credit card information.'
    },
    {
      q: 'Do recipients need to pay to view encrypted emails?',
      a: 'Never. Recipients can view, decrypt, and securely reply to your encrypted emails completely free of charge.'
    }
  ];

  return (
    <div className="landing-page-root">
      <LandingHeader />

      <main>
        {/* Page Hero */}
        <section className="page-hero">
          <div className="container">
            <h1>Simple, Transparent Pricing</h1>
            <p>
              Predictable pricing designed to protect your organization's most sensitive communications. No hidden fees.
            </p>

            <div className="pricing-toggle" style={{ marginTop: '2.5rem' }}>
              <button
                className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly Billing
              </button>
              <button
                className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly Billing <span style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 'bold' }}>Save 17%</span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container" style={{ padding: 'var(--section-padding-y, 4rem) var(--container-padding-x, 1.5rem)', margin: 'var(--section-margin-y, 0) auto' }}>
          <div className="pricing-grid">
            {plans.map((plan, i) => {
              const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              const unit = billingCycle === 'monthly' ? '/seat/month' : '/seat/year';
              return (
                <div key={i} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                  {plan.popular && <div className="pricing-badge">Most Popular</div>}
                  <div className="pricing-title">{plan.name}</div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-gray)', minHeight: '40px', marginBottom: '1.25rem' }}>
                    {plan.desc}
                  </p>
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
                    Get Started with {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="container" style={{ padding: 'var(--section-padding-y, 4rem) var(--container-padding-x, 1.5rem)', margin: 'var(--section-margin-y, 0) auto' }}>
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            Plan Comparison
          </h2>
          <p className="section-subtitle" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            Detailed breakdown of capabilities across all plan tiers.
          </p>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Feature</th>
                  <th style={{ width: '20%' }}>Basic</th>
                  <th style={{ width: '20%' }}>Pro</th>
                  <th style={{ width: '20%' }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '500', color: 'var(--text-dark)' }}>{row.name}</td>
                    <td>{row.basic === '✓' ? <span className="check-icon">✓</span> : row.basic}</td>
                    <td>{row.pro === '✓' ? <span className="check-icon">✓</span> : row.pro}</td>
                    <td>{row.ent === '✓' ? <span className="check-icon">✓</span> : row.ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing FAQs */}
        <section className="faq container" style={{ borderTop: '1px solid var(--border-color, #E2E8F0)', padding: 'var(--section-padding-y, 4.5rem) var(--container-padding-x, 1.5rem)', margin: 'var(--section-margin-y, 0) auto' }}>
          <div className="faq-container">
            <div className="faq-intro">
              <h2 className="section-title" style={{ textAlign: 'left' }}>
                Pricing Questions?
              </h2>
              <p>Everything you need to know about our subscriptions and billing policies.</p>
            </div>

            <div className="faq-list">
              {pricingFaqs.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="faq-item">
                    <div className="faq-question" onClick={() => setOpenFaq(isOpen ? -1 : idx)}>
                      <span>{item.q}</span>
                      <span className="faq-icon">{isOpen ? '−' : '+'}</span>
                    </div>
                    {isOpen && <div className="faq-answer">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
