import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ContentLockedOverlay({ 
    subtitle = "Your organization's subscription has expired. Please renew your access to view email contents." 
}) {
    const navigate = useNavigate();
    
    return (
        <div className="content-locked-overlay" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '2rem',
        }}>
            <style>{`
                @keyframes lockPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.18), 0 0 24px 0 rgba(239, 68, 68, 0.08); }
                    50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0.0), 0 0 32px 4px rgba(239, 68, 68, 0.12); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .cl-renew-btn {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                    color: #fff; border: none; padding: 12px 28px;
                    border-radius: 10px; font-size: 0.95rem; font-weight: 600;
                    cursor: pointer; font-family: 'Inter', sans-serif;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
                }
                .cl-renew-btn:hover {
                    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
                    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
                    transform: translateY(-1px);
                }
                .cl-renew-btn:active { transform: translateY(0); }
                .cl-renew-btn svg { transition: transform 0.2s ease; }
                .cl-renew-btn:hover svg { transform: translateX(3px); }
            `}</style>

            <div style={{
                background: 'rgba(255, 255, 255, 0.82)',
                border: '1px solid rgba(226, 232, 240, 0.7)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)',
                padding: '2.5rem 2.2rem 2rem',
                maxWidth: '400px', width: '100%',
                textAlign: 'center',
                animation: 'fadeInUp 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}>
                {/* Lock Icon with Glow Ring */}
                <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    animation: 'lockPulse 2.8s ease-in-out infinite',
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>

                {/* Status Badge */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: '100px', padding: '5px 14px',
                    marginBottom: '1rem',
                }}>
                    <span style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: '#ef4444', display: 'inline-block',
                    }}></span>
                    <span style={{
                        fontSize: '0.78rem', fontWeight: 700, color: '#b91c1c',
                        fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                    }}>Subscription Expired</span>
                </div>

                {/* Heading */}
                <h3 style={{
                    fontSize: '1.3rem', fontWeight: 700, color: '#0f172a',
                    margin: '0 0 0.5rem', fontFamily: "'Inter', sans-serif",
                    letterSpacing: '-0.01em',
                }}>Content Access Restricted</h3>

                {/* Subtitle */}
                <p style={{
                    fontSize: '0.88rem', color: '#64748b', margin: '0 0 1.5rem',
                    fontFamily: "'Inter', sans-serif", lineHeight: 1.6,
                }}>{subtitle}</p>

                {/* CTA Button */}
                <button
                    className="cl-renew-btn"
                    onClick={() => navigate('/dashboard/subscription')}
                >
                    Renew Subscription
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>

                {/* Divider */}
                <div style={{
                    height: '1px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
                    margin: '1.5rem 0 1.25rem',
                }}></div>

                {/* Admin Contact Block */}
                <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '10px', padding: '12px 16px',
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    textAlign: 'left',
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '1px', flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <p style={{
                        fontSize: '0.8rem', color: '#475569', margin: 0,
                        fontFamily: "'Inter', sans-serif", lineHeight: 1.55,
                    }}>Need help? Contact your administrator at{' '}
                        <a href="mailto:support@safemailz.com" style={{
                            color: '#2563eb', fontWeight: 600, textDecoration: 'none',
                        }}>support@safemailz.com</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
