import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import '../styles.css';

export default function SignUp() {
    const navigate = useNavigate();
    const location = useLocation();
    
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

    // OAuth states
    const [oauthLoading, setOauthLoading] = useState('');
    const [showOAuthModal, setShowOAuthModal] = useState(false);
    const [oauthData, setOauthData] = useState({ email: '', name: '', token: '', provider: '' });
    const [oauthForm, setOauthForm] = useState({ orgName: '', adminName: '', orgSize: '', terms: false });
    const [oauthErrors, setOauthErrors] = useState({});
    const [oauthGlobalError, setOauthGlobalError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const googleAuth = params.get('google_auth');
        const msAuth = params.get('ms_auth');
        const errorParam = params.get('error');

        if (errorParam) {
            setGlobalError('OAuth authentication failed. Please try again.');
            return;
        }

        if (googleAuth === 'success' || msAuth === 'success') {
            const email = decodeURIComponent(params.get('email') || '');
            const name = decodeURIComponent(params.get('name') || '');
            const token = params.get('token') || '';
            
            if (email) {
                setOauthData({ email, name, token, provider: googleAuth ? 'google' : 'microsoft' });
                setOauthForm(prev => ({ ...prev, adminName: name }));
                setShowOAuthModal(true);
            }
        }
    }, [location.search]);

    const handleChange = (e) => {
        const { id, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
        if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
    };

    const handleOauthChange = (e) => {
        const { id, value, type, checked } = e.target;
        const key = id.replace('google', '').replace('ms', '');
        const finalKey = key.charAt(0).toLowerCase() + key.slice(1);
        setOauthForm(prev => ({ ...prev, [finalKey]: type === 'checkbox' ? checked : value }));
        if (oauthErrors[finalKey]) setOauthErrors(prev => ({ ...prev, [finalKey]: '' }));
    };

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

    const handleGoogleSignUp = async () => {
        setOauthLoading('google'); setGlobalError('');
        try {
            const res = await fetch('/api/sync/auth/google?action=signup');
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else { setGlobalError(data.error || 'Could not initiate Google signup.'); setOauthLoading(''); }
        } catch { setGlobalError('Network error.'); setOauthLoading(''); }
    };

    const handleMicrosoftSignUp = async () => {
        setOauthLoading('microsoft'); setGlobalError('');
        try {
            const res = await fetch('/api/sync/auth/microsoft?action=signup');
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else { setGlobalError(data.error || 'Could not initiate Microsoft signup.'); setOauthLoading(''); }
        } catch { setGlobalError('Network error.'); setOauthLoading(''); }
    };

    return (
        <div>
            <LandingHeader />
            <main>
                <div className="signup-container">
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
                        
                        <button type="button" className="btn-google" onClick={handleGoogleSignUp} disabled={oauthLoading === 'google'}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            Sign up with Google
                        </button>
                        <button type="button" className="btn-google" style={{marginTop: "10px"}} onClick={handleMicrosoftSignUp} disabled={oauthLoading === 'microsoft'}>
                            <svg width="20" height="20" viewBox="0 0 21 21"><path d="M10 0H0V10H10V0Z" fill="#F25022"/><path d="M21 0H11V10H21V0Z" fill="#7FBA00"/><path d="M10 11H0V21H10V11Z" fill="#00A4EF"/><path d="M21 11H11V21H21V11Z" fill="#FFB900"/></svg>
                            Sign up with Microsoft
                        </button>
                    </form>
                </div>

                {showOAuthModal && (
                    <div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"}}>
                        <div style={{background: "white", padding: "2rem", borderRadius: "12px", width: "100%", maxWidth: "500px", position: "relative", margin: "1.5rem"}}>
                            <button onClick={() => setShowOAuthModal(false)} style={{position: "absolute", right: "1.5rem", top: "1.5rem", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer"}}>&times;</button>
                            
                            <h3 style={{marginBottom: "1.5rem", fontSize: "1.25rem"}}>Complete your organization profile</h3>
                            <div className="global-error" style={{ display: oauthGlobalError ? 'block' : 'none' }}>{oauthGlobalError}</div>

                            <form noValidate onSubmit={handleOAuthSubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="googleOrgName">Organization Name *</label>
                                    <input type="text" className="form-control" id="googleOrgName" required value={oauthForm.orgName} onChange={handleOauthChange} />
                                    <div className="form-error" style={{ display: oauthErrors.orgName ? 'block' : 'none' }}>{oauthErrors.orgName}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="googleAdminName">Admin Name *</label>
                                    <input type="text" className="form-control" id="googleAdminName" required value={oauthForm.adminName} onChange={handleOauthChange} />
                                    <div className="form-error" style={{ display: oauthErrors.adminName ? 'block' : 'none' }}>{oauthErrors.adminName}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="googleOrgSize">Organization Size *</label>
                                    <div className="select-wrapper">
                                        <select className="form-control" id="googleOrgSize" required value={oauthForm.orgSize} onChange={handleOauthChange}>
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
                                    <input type="checkbox" id="googleTerms" required checked={oauthForm.terms} onChange={handleOauthChange} />
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