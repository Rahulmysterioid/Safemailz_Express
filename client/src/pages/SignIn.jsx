import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import '../styles.css';

export default function SignIn() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [globalError, setGlobalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState(''); // 'google' | 'microsoft' | ''

    // ── Handle Google / Microsoft OAuth callback redirect ────────────────────
    useEffect(() => {
        const params = new URLSearchParams(location.search);

        const googleAuth = params.get('google_auth');
        const msAuth = params.get('ms_auth');
        const errorParam = params.get('error');

        if (errorParam === 'blocked') {
            setGlobalError('You are blocked. Please contact your admin.');
            return;
        } else if (errorParam) {
            setGlobalError('OAuth authentication failed. Please try again.');
            return;
        }

        if (googleAuth === 'success') {
            const emailParam = decodeURIComponent(params.get('email') || '');
            if (emailParam) {
                setIsLoading(true);
                setGlobalError('');
                fetch('/api/signin/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailParam })
                })
                    .then(r => r.json())
                    .then(data => {
                        if (data.user) {
                            localStorage.setItem('currentUser', JSON.stringify(data.user));
                            localStorage.setItem('token', data.token || data.user?.token || 'authenticated');
                            navigate('/dashboard');
                        } else {
                            setGlobalError(data.error || 'Google sign in failed. Please try again.');
                        }
                    })
                    .catch(() => setGlobalError('Network error during Google sign in.'))
                    .finally(() => setIsLoading(false));
            }
        }

        if (msAuth === 'success') {
            const emailParam = decodeURIComponent(params.get('email') || '');
            if (emailParam) {
                setIsLoading(true);
                setGlobalError('');
                fetch('/api/signin/microsoft', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailParam })
                })
                    .then(r => r.json())
                    .then(data => {
                        if (data.user) {
                            localStorage.setItem('currentUser', JSON.stringify(data.user));
                            localStorage.setItem('token', data.token || data.user?.token || 'authenticated');
                            navigate('/dashboard');
                        } else {
                            setGlobalError(data.error || 'Microsoft sign in failed. Please try again.');
                        }
                    })
                    .catch(() => setGlobalError('Network error during Microsoft sign in.'))
                    .finally(() => setIsLoading(false));
            }
        }
    }, [location.search]);

    // ── Standard Email/Password Sign In ─────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setEmailError('');
        setPasswordError('');
        setGlobalError('');
        
        let isValid = true;
        
        if (!email.trim()) {
            setEmailError('Email address is required');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Invalid email address');
            isValid = false;
        }
        
        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
        }
        
        if (!isValid) return;
        
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.user) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                }
                const token = data.token || data.user?.token || 'authenticated';
                localStorage.setItem('token', token);
                navigate('/dashboard');
            } else {
                setGlobalError(data.error || 'Failed to sign in. Please try again.');
            }
        } catch (error) {
            setGlobalError('An error occurred during sign in. Please try again later.');
            console.error('Sign in error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Google OAuth ─────────────────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        setOauthLoading('google');
        setGlobalError('');
        try {
            const res = await fetch('/api/sync/auth/google?action=signin');
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setGlobalError(data.error || 'Could not initiate Google sign in.');
                setOauthLoading('');
            }
        } catch {
            setGlobalError('Network error. Could not reach server.');
            setOauthLoading('');
        }
    };

    // ── Microsoft OAuth ──────────────────────────────────────────────────────
    const handleMicrosoftSignIn = async () => {
        setOauthLoading('microsoft');
        setGlobalError('');
        try {
            const res = await fetch('/api/sync/auth/microsoft?action=signin');
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setGlobalError(data.error || 'Could not initiate Microsoft sign in.');
                setOauthLoading('');
            }
        } catch {
            setGlobalError('Network error. Could not reach server.');
            setOauthLoading('');
        }
    };

    return (
        <div>
            <LandingHeader />

    <main>
        <div className="login-container">
            <div className="login-header">
                <h1>Log in</h1>
                <p>start your journey to Protect Your Clients' Sensitive Information</p>
            </div>
            
            <div id="globalError" className="global-error" style={{ display: globalError ? 'block' : 'none' }}>{globalError}</div>
            <form id="signinForm" noValidate onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="email">Email *</label>
                    <input type="email" className="form-control" id="email" placeholder="Enter your email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    <div className="form-error" id="emailError" style={{ display: emailError ? 'block' : 'none' }}>{emailError}</div>
                </div>
                
                <div className="form-group" style={{"marginBottom":"0.5rem"}}>
                    <label className="form-label" htmlFor="password">Password *</label>
                    <div className="password-input-wrapper">
                        <input type={showPassword ? "text" : "password"} className="form-control" id="password" placeholder="Enter your password" required style={{"paddingRight":"3rem"}} value={password} onChange={(e) => setPassword(e.target.value)} />
                        <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                </svg>
                            )}
                        </button>
                    </div>
                    <div className="form-error" id="passwordError" style={{ display: passwordError ? 'block' : 'none' }}>{passwordError}</div>
                </div>

                <div className="forgot-password-wrapper">
                    <a href="#" className="forgot-password-link" onClick={(e) => { e.preventDefault(); alert('Forgot password flow coming soon!'); }}>Forget Password?</a>
                </div>
                
                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" id="submitBtn" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                </div>

                <div className="auth-divider">or</div>
                
                <button type="button" className="btn-google" onClick={handleGoogleSignIn} disabled={oauthLoading === 'google' || isLoading}>
                    {oauthLoading === 'google' ? (
                        <span style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <svg style={{animation:'spin 1s linear infinite'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                            Connecting to Google...
                        </span>
                    ) : (<>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign in with Google
                    </>)}
                </button>
                <button type="button" className="btn-google" style={{"marginTop":"10px"}} onClick={handleMicrosoftSignIn} disabled={oauthLoading === 'microsoft' || isLoading}>
                    {oauthLoading === 'microsoft' ? (
                        <span style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <svg style={{animation:'spin 1s linear infinite'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                            Connecting to Microsoft...
                        </span>
                    ) : (<>
                    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                        <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                        <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                        <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
                    </svg>
                    Sign in with Microsoft
                    </>)}
                </button>
            </form>
        </div>

        {/* Spin animation keyframes for OAuth loading buttons */}
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </main>

    <LandingFooter />
</div>
    );
}