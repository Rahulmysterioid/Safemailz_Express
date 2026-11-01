import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import '../styles.css';

export default function SignUp() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Regular Org Signup Form State
    const [formData, setFormData] = useState({
        orgName: '',
        adminName: '',
        email: '',
        password: '',
        confirmPassword: '',
        orgSize: '',
        backupEmail: '',
        terms: false,
        updates: false
    });
    
    const [errors, setErrors] = useState({});
    const [globalError, setGlobalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // OAuth States
    const [oauthLoading, setOauthLoading] = useState('');
    const [showOAuthModal, setShowOAuthModal] = useState(false);
    const [oauthData, setOauthData] = useState({ email: '', name: '', token: '', provider: '' });
    const [oauthForm, setOauthForm] = useState({ orgName: '', adminName: '', orgSize: '', terms: false });
    const [oauthErrors, setOauthErrors] = useState({});
    const [oauthGlobalError, setOauthGlobalError] = useState('');

    // Invitation Flow States
    const [isInviteFlow, setIsInviteFlow] = useState(false);
    const [inviteToken, setInviteToken] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteOrgName, setInviteOrgName] = useState('');
    const [isCheckingInvite, setIsCheckingInvite] = useState(false);
    const [inviteError, setInviteError] = useState('');

    // Onboarding Info Template States (Post-Google Signup for Invited Employee)
    const [showOnboardingModal, setShowOnboardingModal] = useState(false);
    const [onboardingForm, setOnboardingForm] = useState({
        fullName: '',
        dob: '',
        workMode: 'Remote',
        workLocation: 'Gilgit Baltistan, Pakistan',
        bio: '',
        terms: true
    });
    const [onboardingErrors, setOnboardingErrors] = useState({});
    const [onboardingGlobalError, setOnboardingGlobalError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tokenParam = params.get('token');
        const emailParam = params.get('email');
        const inviteEmailParam = params.get('invite_email');
        const googleAuth = params.get('google_auth');
        const msAuth = params.get('ms_auth');
        const errorParam = params.get('error');

        if (errorParam) {
            setGlobalError('OAuth authentication failed. Please try again.');
            return;
        }

        // 1. Read token & email search parameters from URL or recover from session
        const activeToken = tokenParam || sessionStorage.getItem('pending_invite_token');
        const activeEmail = emailParam || inviteEmailParam || sessionStorage.getItem('pending_invite_email');

        if (tokenParam) {
            sessionStorage.setItem('pending_invite_token', tokenParam);
            if (emailParam) sessionStorage.setItem('pending_invite_email', emailParam);
        }

        if (activeToken) {
            setIsInviteFlow(true);
            setInviteToken(activeToken);
            if (activeEmail) setInviteEmail(decodeURIComponent(activeEmail));

            // Verify the invite token with the backend
            setIsCheckingInvite(true);
            fetch(`/api/invite/verify/${activeToken}`)
                .then(res => res.json())
                .then(data => {
                    setIsCheckingInvite(false);
                    if (data.success) {
                        setInviteOrgName(data.organization_name || 'Safemailz');
                        if (data.email) setInviteEmail(data.email);
                    } else {
                        setInviteError(data.error || 'Invalid or expired invitation link.');
                    }
                })
                .catch(err => {
                    setIsCheckingInvite(false);
                    console.error('Failed to verify invitation:', err);
                });
        }

        // 2. Handle Google/Microsoft OAuth Callback
        if (googleAuth === 'success' || msAuth === 'success') {
            const email = decodeURIComponent(params.get('email') || '');
            const name = decodeURIComponent(params.get('name') || '');
            const token = params.get('token') || '';
            const oauthToken = params.get('oauth_token') || token;
            
            if (email) {
                setOauthData({ email, name, token: oauthToken, provider: googleAuth ? 'google' : 'microsoft' });

                if (activeToken) {
                    // Invited Employee Google OAuth Success -> Display Onboarding Info Template!
                    setOnboardingForm(prev => ({
                        ...prev,
                        fullName: name || prev.fullName || '',
                        workLocation: 'Gilgit Baltistan, Pakistan',
                        workMode: 'Remote'
                    }));
                    setShowOnboardingModal(true);
                } else {
                    // Regular Org Owner OAuth Complete Modal
                    setOauthForm(prev => ({ ...prev, adminName: name }));
                    setShowOAuthModal(true);
                }
            }
        }
    }, [location.search]);

    const handleChange = (e) => {
        const { id, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
        if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
    };

    const handleGoogleSignUp = async () => {
        setOauthLoading('google');
        setGlobalError('');

        const tokenToUse = inviteToken || sessionStorage.getItem('pending_invite_token');
        const emailToUse = inviteEmail || sessionStorage.getItem('pending_invite_email');

        if (tokenToUse) {
            sessionStorage.setItem('pending_invite_token', tokenToUse);
            if (emailToUse) sessionStorage.setItem('pending_invite_email', emailToUse);
        }

        try {
            const url = tokenToUse 
                ? `/api/sync/auth/google?action=signup&invite_token=${encodeURIComponent(tokenToUse)}&email=${encodeURIComponent(emailToUse || '')}`
                : '/api/sync/auth/google?action=signup';
            const res = await fetch(url);
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setGlobalError(data.error || 'Could not initiate Google signup.');
                setOauthLoading('');
            }
        } catch {
            setGlobalError('Network error. Could not connect to Google.');
            setOauthLoading('');
        }
    };

    const handleMicrosoftSignUp = async () => {
        setOauthLoading('microsoft');
        setGlobalError('');
        try {
            const res = await fetch('/api/sync/auth/microsoft?action=signup');
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else { setGlobalError(data.error || 'Could not initiate Microsoft signup.'); setOauthLoading(''); }
        } catch { setGlobalError('Network error.'); setOauthLoading(''); }
    };

    // Standard Org Owner Signup Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({}); setGlobalError('');
        
        let newErrors = {}; let isValid = true;
        
        if (!formData.orgName.trim()) { newErrors.orgName = 'Organization name is required'; isValid = false; }
        if (!formData.adminName.trim()) { newErrors.adminName = 'Admin name is required'; isValid = false; }
        if (!formData.email.trim()) { newErrors.email = 'Email address is required'; isValid = false; }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { newErrors.email = 'Invalid email address'; isValid = false; }
        if (!formData.password) { newErrors.password = 'Password is required'; isValid = false; }
        else if (formData.password.length < 8) { newErrors.password = 'Password must be at least 8 characters'; isValid = false; }
        if (formData.password !== formData.confirmPassword) { newErrors.confirmPassword = 'Passwords do not match'; isValid = false; }
        if (!formData.orgSize) { newErrors.orgSize = 'Please select organization size'; isValid = false; }
        if (!formData.terms) { newErrors.terms = 'You must agree to the Terms of Service'; isValid = false; }
        
        if (!isValid) { setErrors(newErrors); return; }
        
        setIsLoading(true);
        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok && data.user) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                navigate('/dashboard');
            } else {
                setGlobalError(data.error || 'Failed to create account.');
            }
        } catch (error) {
            setGlobalError('An error occurred during sign up.');
        } finally {
            setIsLoading(false);
        }
    };

    // Standard Org Owner OAuth Complete Submit
    const handleOAuthSubmit = async (e) => {
        e.preventDefault();
        setOauthErrors({}); setOauthGlobalError('');
        
        let newErrors = {}; let isValid = true;
        if (!oauthForm.orgName.trim()) { newErrors.orgName = 'Required'; isValid = false; }
        if (!oauthForm.adminName.trim()) { newErrors.adminName = 'Required'; isValid = false; }
        if (!oauthForm.orgSize) { newErrors.orgSize = 'Required'; isValid = false; }
        if (!oauthForm.terms) { newErrors.terms = 'Required'; isValid = false; }
        
        if (!isValid) { setOauthErrors(newErrors); return; }
        
        setIsLoading(true);
        try {
            const response = await fetch(`/api/signup/${oauthData.provider}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: oauthData.email,
                    orgName: oauthForm.orgName,
                    adminName: oauthForm.adminName,
                    orgSize: oauthForm.orgSize
                })
            });
            const data = await response.json();
            if (response.ok && data.user) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                navigate('/dashboard');
            } else {
                setOauthGlobalError(data.error || 'Failed to create account.');
            }
        } catch (error) {
            setOauthGlobalError('An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    // Post-Google Signup Onboarding Info Template Submit (Invited Employee)
    const handleOnboardingSubmit = async (e) => {
        e.preventDefault();
        setOnboardingErrors({});
        setOnboardingGlobalError('');

        let hasError = false;
        let errors = {};

        if (!onboardingForm.fullName.trim()) {
            errors.fullName = 'Full Name is required';
            hasError = true;
        }
        if (!onboardingForm.dob) {
            errors.dob = 'Date of Birth is required';
            hasError = true;
        }
        if (!onboardingForm.terms) {
            errors.terms = 'You must agree to the Terms & Conditions';
            hasError = true;
        }

        if (hasError) {
            setOnboardingErrors(errors);
            return;
        }

        setIsLoading(true);
        const tokenToUse = inviteToken || sessionStorage.getItem('pending_invite_token');
        const emailToUse = oauthData.email || inviteEmail || sessionStorage.getItem('pending_invite_email');

        try {
            const res = await fetch('/api/invite/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: tokenToUse,
                    firstName: onboardingForm.fullName.trim(),
                    email: emailToUse,
                    dob: onboardingForm.dob,
                    workMode: onboardingForm.workMode,
                    workLocation: onboardingForm.workLocation,
                    bio: onboardingForm.bio,
                    isGoogleAuth: true
                })
            });

            const data = await res.json();
            if (res.ok && data.user) {
                // Clear pending session items
                sessionStorage.removeItem('pending_invite_token');
                sessionStorage.removeItem('pending_invite_email');

                // Update purchased seats in local storage if present
                try {
                    const storedSeats = localStorage.getItem('purchasedSeats');
                    if (storedSeats) {
                        const seats = JSON.parse(storedSeats);
                        const updatedSeats = seats.map(s => {
                            if (s.email && s.email.toLowerCase() === emailToUse.toLowerCase()) {
                                return {
                                    ...s,
                                    status: 'filled',
                                    isPending: false,
                                    firstName: onboardingForm.fullName.trim(),
                                    dob: onboardingForm.dob,
                                    workMode: onboardingForm.workMode,
                                    workLocation: onboardingForm.workLocation,
                                    bio: onboardingForm.bio
                                };
                            }
                            return s;
                        });
                        localStorage.setItem('purchasedSeats', JSON.stringify(updatedSeats));
                    }
                } catch (err) {
                    console.error('Error updating purchasedSeats:', err);
                }

                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.dispatchEvent(new Event('storage'));
                navigate('/dashboard');
            } else {
                setOnboardingGlobalError(data.error || 'Failed to complete profile onboarding.');
            }
        } catch (error) {
            console.error('Onboarding submission error:', error);
            setOnboardingGlobalError('An error occurred during onboarding.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <LandingHeader />
            <main>
                <div className="signup-container">
                    {/* ────────────────────────────────────────────────────────── */}
                    {/* INVITATION FLOW: Dedicated Employee Signup Screen */}
                    {/* ────────────────────────────────────────────────────────── */}
                    {isInviteFlow ? (
                        <div>
                            <div className="signup-header">
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#2563EB',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    marginBottom: '1rem',
                                    border: '1px solid #BFDBFE'
                                }}>
                                    ✨ Team Invitation
                                </div>
                                <h1 style={{ fontSize: '1.85rem', marginBottom: '0.5rem' }}>
                                    Join {inviteOrgName || 'Your Organization'}
                                </h1>
                                <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                                    You've been invited to join Safemailz as an employee. Sign up with Google to activate your secure mailbox workspace.
                                </p>
                            </div>

                            {globalError && (
                                <div className="global-error" style={{ display: 'block', marginBottom: '1.25rem' }}>
                                    {globalError}
                                </div>
                            )}

                            {isCheckingInvite ? (
                                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748B' }}>
                                    <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>Verifying your invitation details...</p>
                                </div>
                            ) : inviteError ? (
                                <div style={{
                                    backgroundColor: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    color: '#991B1B',
                                    padding: '1.25rem',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    marginBottom: '1.5rem'
                                }}>
                                    <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Invitation Unavailable</p>
                                    <p style={{ fontSize: '0.875rem' }}>{inviteError}</p>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        style={{ marginTop: '1rem', borderRadius: '6px' }}
                                        onClick={() => navigate('/signin')}
                                    >
                                        Return to Sign In
                                    </button>
                                </div>
                            ) : (
                                <div style={{
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '2rem',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                }}>
                                    {inviteEmail && (
                                        <div style={{
                                            backgroundColor: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '8px',
                                            padding: '1rem 1.25rem',
                                            marginBottom: '1.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: '600' }}>
                                                    Invited Email
                                                </div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#0F172A', marginTop: '2px' }}>
                                                    {inviteEmail}
                                                </div>
                                            </div>
                                            <span style={{
                                                backgroundColor: '#DCFCE7',
                                                color: '#15803D',
                                                fontSize: '11px',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontWeight: '600'
                                            }}>
                                                Verified Invite
                                            </span>
                                        </div>
                                    )}

                                    {/* Google Sign-Up button matching exact requirements */}
                                    <button 
                                        type="button"
                                        onClick={handleGoogleSignUp}
                                        disabled={oauthLoading === 'google'}
                                        className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
                                        style={{
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            backgroundColor: '#FFFFFF',
                                            color: '#1E293B',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <FcGoogle className="w-5 h-5"/>
                                        {oauthLoading === 'google' ? 'Connecting to Google...' : 'Sign up with Google'}
                                    </button>

                                    <div style={{
                                        marginTop: '1.5rem',
                                        padding: '0.85rem 1rem',
                                        backgroundColor: '#F1F5F9',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        color: '#475569',
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'center'
                                    }}>
                                        <span>🔒</span>
                                        <span>Google authentication verifies your identity and activates your protected corporate mailbox.</span>
                                    </div>

                                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                        <button 
                                            type="button" 
                                            className="btn btn-outline" 
                                            style={{ borderRadius: '6px', fontSize: '0.85rem', padding: '0.5rem 1.25rem' }} 
                                            onClick={() => navigate('/signin')}
                                        >
                                            Cancel & Go to Sign In
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ────────────────────────────────────────────────────────── */
                        /* REGULAR FLOW: Organization Registration */
                        /* ────────────────────────────────────────────────────────── */
                        <div>
                            <div className="signup-header">
                                <h1>Create an Organization account</h1>
                                <p>Please enter your organization details to create an account</p>
                            </div>
                            
                            <div className="global-error" style={{ display: globalError ? 'block' : 'none' }}>{globalError}</div>
                            
                            <form noValidate onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="orgName">Organization Name *</label>
                                    <input type="text" className="form-control" id="orgName" required value={formData.orgName} onChange={handleChange} />
                                    <div className="form-error" style={{ display: errors.orgName ? 'block' : 'none' }}>{errors.orgName}</div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="form-label" htmlFor="adminName">Admin name *</label>
                                    <input type="text" className="form-control" id="adminName" required value={formData.adminName} onChange={handleChange} />
                                    <div className="form-error" style={{ display: errors.adminName ? 'block' : 'none' }}>{errors.adminName}</div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="form-label" htmlFor="email">Email address *</label>
                                    <input type="email" className="form-control" id="email" required value={formData.email} onChange={handleChange} />
                                    <div className="form-error" style={{ display: errors.email ? 'block' : 'none' }}>{errors.email}</div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="form-label" htmlFor="password">Create Password *</label>
                                    <div className="password-input-wrapper">
                                        <input type={showPassword ? "text" : "password"} className="form-control" id="password" required value={formData.password} onChange={handleChange} />
                                        <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '👁️‍🗨️' : '👁️'}</button>
                                    </div>
                                    <div className="form-error" style={{ display: errors.password ? 'block' : 'none' }}>{errors.password}</div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="form-label" htmlFor="confirmPassword">Re-enter Password *</label>
                                    <div className="password-input-wrapper">
                                        <input type={showConfirmPassword ? "text" : "password"} className="form-control" id="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} />
                                        <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? '👁️‍🗨️' : '👁️'}</button>
                                    </div>
                                    <div className="form-error" style={{ display: errors.confirmPassword ? 'block' : 'none' }}>{errors.confirmPassword}</div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="form-label" htmlFor="orgSize">Organization Size *</label>
                                    <div className="select-wrapper">
                                        <select className="form-control" id="orgSize" required value={formData.orgSize} onChange={handleChange}>
                                            <option value="" disabled>Select size</option>
                                            <option value="1-10">1-10</option>
                                            <option value="11-50">11-50</option>
                                            <option value="51-200">51-200</option>
                                            <option value="201+">201+</option>
                                        </select>
                                    </div>
                                    <div className="form-error" style={{ display: errors.orgSize ? 'block' : 'none' }}>{errors.orgSize}</div>
                                </div>
                                
                                <div className="checkbox-group">
                                    <input type="checkbox" id="terms" required checked={formData.terms} onChange={handleChange} />
                                    <label htmlFor="terms">I agree to Terms</label>
                                </div>
                                <div className="form-error" style={{ display: errors.terms ? 'block' : 'none', marginBottom: '1rem' }}>{errors.terms}</div>
                                
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Loading...' : 'Signup'}</button>
                                    <button type="button" className="btn btn-outline" style={{borderRadius: "6px"}} onClick={() => navigate('/signin')}>Cancel</button>
                                </div>
                                
                                <div className="auth-divider">or</div>
                                
                                <button 
                                    type="button" 
                                    onClick={handleGoogleSignUp} 
                                    disabled={oauthLoading === 'google'}
                                    className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
                                    style={{
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        backgroundColor: '#FFFFFF',
                                        color: '#1E293B',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <FcGoogle className="w-5 h-5"/>
                                    {oauthLoading === 'google' ? 'Connecting to Google...' : 'Sign up with Google'}
                                </button>

                                <button type="button" className="btn-google" style={{marginTop: "10px"}} onClick={handleMicrosoftSignUp} disabled={oauthLoading === 'microsoft'}>
                                    <svg width="20" height="20" viewBox="0 0 21 21"><path d="M10 0H0V10H10V0Z" fill="#F25022"/><path d="M21 0H11V10H21V0Z" fill="#7FBA00"/><path d="M10 11H0V21H10V11Z" fill="#00A4EF"/><path d="M21 11H11V21H21V11Z" fill="#FFB900"/></svg>
                                    Sign up with Microsoft
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* ────────────────────────────────────────────────────────── */}
                {/* POST-SIGNUP ONBOARDING INFO TEMPLATE MODAL */}
                {/* ────────────────────────────────────────────────────────── */}
                {showOnboardingModal && (
                    <div style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(4px)",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1rem"
                    }}>
                        <div style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "16px",
                            width: "100%",
                            maxWidth: "520px",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                            overflow: "hidden"
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                padding: "1.5rem 1.75rem",
                                borderBottom: "1px solid #E2E8F0",
                                backgroundColor: "#F8FAFC",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between"
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#0F172A" }}>
                                        Complete Employee Profile
                                    </h3>
                                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748B" }}>
                                        Finish your onboarding details to unlock your workspace.
                                    </p>
                                </div>
                                <span style={{
                                    backgroundColor: "#EFF6FF",
                                    color: "#2563EB",
                                    padding: "4px 10px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "600"
                                }}>
                                    Step 2 of 2
                                </span>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: "1.75rem", maxHeight: "calc(85vh - 120px)", overflowY: "auto" }}>
                                {onboardingGlobalError && (
                                    <div className="global-error" style={{ display: 'block', marginBottom: '1.25rem' }}>
                                        {onboardingGlobalError}
                                    </div>
                                )}

                                <form noValidate onSubmit={handleOnboardingSubmit}>
                                    {/* Full Name */}
                                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                                        <label className="form-label" htmlFor="onboardingFullName">Full Name *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="onboardingFullName"
                                            required
                                            value={onboardingForm.fullName}
                                            onChange={(e) => {
                                                setOnboardingForm(prev => ({ ...prev, fullName: e.target.value }));
                                                if (onboardingErrors.fullName) setOnboardingErrors(prev => ({ ...prev, fullName: '' }));
                                            }}
                                            placeholder="e.g. John Doe"
                                        />
                                        {onboardingErrors.fullName && (
                                            <div className="form-error" style={{ display: 'block' }}>{onboardingErrors.fullName}</div>
                                        )}
                                    </div>

                                    {/* Email (Read Only) */}
                                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                                        <label className="form-label" htmlFor="onboardingEmail">Work Email Address</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="onboardingEmail"
                                            readOnly
                                            disabled
                                            value={oauthData.email || inviteEmail}
                                            style={{ backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}
                                        />
                                        <div style={{ fontSize: "11px", color: "#059669", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                                            ✓ Authenticated via Google
                                        </div>
                                    </div>

                                    {/* Date of Birth */}
                                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                                        <label className="form-label" htmlFor="onboardingDob">Date of Birth *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            id="onboardingDob"
                                            required
                                            value={onboardingForm.dob}
                                            onChange={(e) => {
                                                setOnboardingForm(prev => ({ ...prev, dob: e.target.value }));
                                                if (onboardingErrors.dob) setOnboardingErrors(prev => ({ ...prev, dob: '' }));
                                            }}
                                        />
                                        {onboardingErrors.dob && (
                                            <div className="form-error" style={{ display: 'block' }}>{onboardingErrors.dob}</div>
                                        )}
                                    </div>

                                    {/* Work Mode */}
                                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                                        <label className="form-label" htmlFor="onboardingWorkMode">Work Mode</label>
                                        <div className="select-wrapper">
                                            <select
                                                className="form-control"
                                                id="onboardingWorkMode"
                                                value={onboardingForm.workMode}
                                                onChange={(e) => setOnboardingForm(prev => ({ ...prev, workMode: e.target.value }))}
                                            >
                                                <option value="Remote">Remote</option>
                                                <option value="Hybrid">Hybrid</option>
                                                <option value="On-site">On-site</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Work Location */}
                                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                                        <label className="form-label" htmlFor="onboardingWorkLocation">Work Location</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="onboardingWorkLocation"
                                            value={onboardingForm.workLocation}
                                            onChange={(e) => setOnboardingForm(prev => ({ ...prev, workLocation: e.target.value }))}
                                            placeholder="City, Country"
                                        />
                                    </div>

                                    {/* Short Bio */}
                                    <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                                        <label className="form-label" htmlFor="onboardingBio">Short Bio (Optional)</label>
                                        <textarea
                                            className="form-control"
                                            id="onboardingBio"
                                            rows="2"
                                            value={onboardingForm.bio}
                                            onChange={(e) => setOnboardingForm(prev => ({ ...prev, bio: e.target.value }))}
                                            placeholder="Tell your team a little about yourself"
                                            style={{ resize: "none" }}
                                        />
                                    </div>

                                    {/* Terms Checkbox */}
                                    <div className="checkbox-group" style={{ marginBottom: "1.5rem" }}>
                                        <input
                                            type="checkbox"
                                            id="onboardingTerms"
                                            required
                                            checked={onboardingForm.terms}
                                            onChange={(e) => setOnboardingForm(prev => ({ ...prev, terms: e.target.checked }))}
                                        />
                                        <label htmlFor="onboardingTerms" style={{ fontSize: "0.85rem", color: "#475569" }}>
                                            I agree to the Safemailz Terms of Service & Corporate Privacy Policies
                                        </label>
                                    </div>
                                    {onboardingErrors.terms && (
                                        <div className="form-error" style={{ display: 'block', marginBottom: '1rem' }}>
                                            {onboardingErrors.terms}
                                        </div>
                                    )}

                                    {/* Submit Action */}
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", fontWeight: "600", borderRadius: "8px" }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Setting Up Your Workspace...' : 'Complete Onboarding & Enter Dashboard'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* REGULAR ORG OWNER OAUTH COMPLETE MODAL */}
                {/* ────────────────────────────────────────────────────────── */}
                {showOAuthModal && (
                    <div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"}}>
                        <div style={{background: "white", padding: "2rem", borderRadius: "12px", width: "100%", maxWidth: "500px", position: "relative", margin: "1.5rem"}}>
                            <button onClick={() => setShowOAuthModal(false)} style={{position: "absolute", right: "1.5rem", top: "1.5rem", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer"}}>&times;</button>
                            
                            <h3 style={{marginBottom: "1.5rem", fontSize: "1.25rem"}}>Complete your organization profile</h3>
                            <div className="global-error" style={{ display: oauthGlobalError ? 'block' : 'none' }}>{oauthGlobalError}</div>

                            <form noValidate onSubmit={handleOAuthSubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="googleOrgName">Organization Name *</label>
                                    <input type="text" className="form-control" id="googleOrgName" required value={oauthForm.orgName} onChange={(e) => { setOauthForm(prev => ({ ...prev, orgName: e.target.value })); if(oauthErrors.orgName) setOauthErrors(prev => ({ ...prev, orgName: '' })); }} />
                                    <div className="form-error" style={{ display: oauthErrors.orgName ? 'block' : 'none' }}>{oauthErrors.orgName}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="googleAdminName">Admin Name *</label>
                                    <input type="text" className="form-control" id="googleAdminName" required value={oauthForm.adminName} onChange={(e) => { setOauthForm(prev => ({ ...prev, adminName: e.target.value })); if(oauthErrors.adminName) setOauthErrors(prev => ({ ...prev, adminName: '' })); }} />
                                    <div className="form-error" style={{ display: oauthErrors.adminName ? 'block' : 'none' }}>{oauthErrors.adminName}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="googleOrgSize">Organization Size *</label>
                                    <div className="select-wrapper">
                                        <select className="form-control" id="googleOrgSize" required value={oauthForm.orgSize} onChange={(e) => { setOauthForm(prev => ({ ...prev, orgSize: e.target.value })); if(oauthErrors.orgSize) setOauthErrors(prev => ({ ...prev, orgSize: '' })); }}>
                                            <option value="" disabled>Select size</option>
                                            <option value="1-10">1-10</option>
                                            <option value="11-50">11-50</option>
                                            <option value="51-200">51-200</option>
                                            <option value="201+">201+</option>
                                        </select>
                                    </div>
                                    <div className="form-error" style={{ display: oauthErrors.orgSize ? 'block' : 'none' }}>{oauthErrors.orgSize}</div>
                                </div>
                                <div className="checkbox-group">
                                    <input type="checkbox" id="googleTerms" required checked={oauthForm.terms} onChange={(e) => { setOauthForm(prev => ({ ...prev, terms: e.target.checked })); if(oauthErrors.terms) setOauthErrors(prev => ({ ...prev, terms: '' })); }} />
                                    <label htmlFor="googleTerms">I agree to Terms</label>
                                </div>
                                <div className="form-error" style={{ display: oauthErrors.terms ? 'block' : 'none', marginBottom: '1rem' }}>{oauthErrors.terms}</div>
                                
                                <button type="submit" className="btn btn-primary" style={{width: "100%"}} disabled={isLoading}>{isLoading ? 'Loading...' : 'Complete Signup'}</button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
            <LandingFooter />
        </div>
    );
}