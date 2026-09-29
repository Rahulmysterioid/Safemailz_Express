import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import '../styles.css';

export default function SignUp() {
    const navigate = useNavigate();
    
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

    const handleChange = (e) => {
        const { id, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: type === 'checkbox' ? checked : value
        }));
        // Clear error when typing
        if (errors[id]) {
            setErrors(prev => ({ ...prev, [id]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setErrors({});
        setGlobalError('');
        
        let newErrors = {};
        let isValid = true;
        
        if (!formData.orgName.trim()) {
            newErrors.orgName = 'Organization name is required';
            isValid = false;
        }
        if (!formData.adminName.trim()) {
            newErrors.adminName = 'Admin name is required';
            isValid = false;
        }
        if (!formData.email.trim()) {
            newErrors.email = 'Email address is required';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email address';
            isValid = false;
        }
        
        if (!formData.password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
            isValid = false;
        }
        
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }
        
        if (!formData.orgSize) {
            newErrors.orgSize = 'Please select organization size';
            isValid = false;
        }
        
        if (!formData.terms) {
            newErrors.terms = 'You must agree to the Terms of Service';
            isValid = false;
        }
        
        if (!isValid) {
            setErrors(newErrors);
            return;
        }
        
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                if (data.user) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    navigate('/dashboard');
                }
            } else {
                setGlobalError(data.error || 'Failed to create account. Please try again.');
            }
        } catch (error) {
            setGlobalError('An error occurred during sign up. Please try again later.');
            console.error('Sign up error:', error);
        } finally {
            setIsLoading(false);
        }
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
            
            <div id="globalError" className="global-error" style={{ display: globalError ? 'block' : 'none' }}>{globalError}</div>
            <form id="signupForm" noValidate onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="orgName">Organization Name *</label>
                    <input type="text" className="form-control" id="orgName" placeholder="Enter organization name" required value={formData.orgName} onChange={handleChange} />
                    <div className="form-error" id="orgNameError" style={{ display: errors.orgName ? 'block' : 'none' }}>{errors.orgName}</div>
                </div>
                
                <div className="form-group">
                    <label className="form-label" htmlFor="adminName">Admin name *</label>
                    <input type="text" className="form-control" id="adminName" placeholder="Enter admin name" required value={formData.adminName} onChange={handleChange} />
                    <div className="form-error" id="adminNameError" style={{ display: errors.adminName ? 'block' : 'none' }}>{errors.adminName}</div>
                </div>
                
                <div className="form-group">
                    <label className="form-label" htmlFor="email">Email address *</label>
                    <input type="email" className="form-control" id="email" placeholder="Enter email address" required value={formData.email} onChange={handleChange} />
                    <div className="form-error" id="emailError" style={{ display: errors.email ? 'block' : 'none' }}>{errors.email}</div>
                </div>
                
                <div className="form-group">
                    <label className="form-label" htmlFor="password">Create Password *</label>
                    <div className="password-input-wrapper">
                        <input type={showPassword ? "text" : "password"} className="form-control" id="password" placeholder="Create a password" required value={formData.password} onChange={handleChange} />
                        <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? '👁️‍🗨️' : '👁️'}
                        </button>
                    </div>
                    <div className="form-error" id="passwordError" style={{ display: errors.password ? 'block' : 'none' }}>{errors.password}</div>
                </div>
                
                <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">Re-enter Password *</label>
                    <div className="password-input-wrapper">
                        <input type={showConfirmPassword ? "text" : "password"} className="form-control" id="confirmPassword" placeholder="Re-enter your password" required value={formData.confirmPassword} onChange={handleChange} />
                        <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
                        </button>
                    </div>
                    <div className="form-error" id="confirmPasswordError" style={{ display: errors.confirmPassword ? 'block' : 'none' }}>{errors.confirmPassword}</div>
                </div>
                
                <div className="form-group">
                    <label className="form-label" htmlFor="orgSize">Organization Size *</label>
                    <div className="select-wrapper">
                        <select className="form-control" id="orgSize" required value={formData.orgSize} onChange={handleChange}>
                            <option value="" disabled>Select organization size</option>
                            <option value="1-10">1-10 employees</option>
                            <option value="11-50">11-50 employees</option>
                            <option value="51-200">51-200 employees</option>
                            <option value="201+">201+ employees</option>
                        </select>
                    </div>
                    <div className="form-error" id="orgSizeError" style={{ display: errors.orgSize ? 'block' : 'none' }}>{errors.orgSize}</div>
                </div>
                
                <div className="form-group">
                    <label className="form-label" htmlFor="backupEmail">Backup Email</label>
                    <input type="email" className="form-control" id="backupEmail" placeholder="Enter backup email (optional)" value={formData.backupEmail} onChange={handleChange} />
                    <p className="help-text">Used to recover your account and receive important security alerts if you lose access.</p>
                    <div className="form-error" id="backupEmailError" style={{ display: errors.backupEmail ? 'block' : 'none' }}>{errors.backupEmail}</div>
                </div>
                
                <div className="checkbox-group">
                    <input type="checkbox" id="terms" required checked={formData.terms} onChange={handleChange} />
                    <label htmlFor="terms">I agree to the <a href="#" onClick={(e) => { e.preventDefault(); alert('Terms of Service coming soon!'); }}>Terms of Service</a> and <a href="#" onClick={(e) => { e.preventDefault(); alert('Privacy Policy coming soon!'); }}>Privacy Policy</a></label>
                </div>
                <div className="form-error" id="termsError" style={{"marginTop":"-0.5rem","marginBottom":"1rem","display": errors.terms ? 'block' : 'none'}}>{errors.terms}</div>
                
                <div className="checkbox-group">
                    <input type="checkbox" id="updates" checked={formData.updates} onChange={handleChange} />
                    <label htmlFor="updates">Send me product updates, security tips, and best practices</label>
                </div>
                
                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" id="submitBtn" disabled={isLoading}>
                        {isLoading ? 'Creating account...' : 'Signup'}
                    </button>
                    {/*  Typo from original screenshot preserved for accuracy or replaced, using Cancel  */}
                    <button type="button" className="btn btn-outline" style={{"borderRadius":"6px"}} onClick={() => navigate('/signin')}>Cancel</button>
                </div>
                
                <div className="auth-divider">or</div>
                
                <button type="button" className="btn-google" onClick={() => {}} /* TODO: FIX HANDLER */ data-old-onclick="initiateGoogleSignup()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign up with Google
                </button>
                <button type="button" className="btn-google" style={{"marginTop":"10px"}} onClick={() => {}} /* TODO: FIX HANDLER */ data-old-onclick="initiateMicrosoftSignup()">
                    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                        <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                        <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                        <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
                    </svg>
                    Sign up with Microsoft
                </button>
            </form>
            
            <div className="security-badge">
                <div className="security-badge-icon">🛡️</div>
                <p>Your organization data is protected with enterprise-grade security. We never share your information with third parties</p>
            </div>
            
            <div className="login-link">
                Already have an account? <a href="signin.html">Sign in to your organization</a>
            </div>
        </div>

        {/*  Google Signup Modal  */}
        <div id="googleSignupModal" style={{"display":"none","position":"fixed","top":"0","left":"0","right":"0","bottom":"0","background":"rgba(0,0,0,0.5)","zIndex":"1000","alignItems":"center","justifyContent":"center"}}>
            <div style={{"background":"white","padding":"2rem","borderRadius":"12px","width":"100%","maxWidth":"500px","position":"relative","margin":"1.5rem"}}>
                <button onClick={() => {}} /* TODO: FIX HANDLER */ data-old-onclick="closeGoogleModal()" style={{"position":"absolute","right":"1.5rem","top":"1.5rem","background":"none","border":"none","fontSize":"1.5rem","cursor":"pointer","color":"var(--text-gray)"}}>&times;</button>
                
                {/*  Step 1: Connecting  */}
                <div id="googleConnecting" style={{"display":"none","textAlign":"center","padding":"2rem 0"}}>
                    <style>{`
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                        .google-spinner { animation: spin 1s linear infinite; margin-bottom: 1rem; }
                    `}</style>
                    <svg className="google-spinner" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#45AEF1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    <h3 style={{"fontSize":"1.25rem"}}>Connecting to Google...</h3>
                    <p style={{"color":"var(--text-gray)","fontSize":"0.875rem","marginTop":"0.5rem"}}>Please wait while we authenticate your account.</p>
                </div>

                {/*  Step 2: Details Form  */}
                <div id="googleDetailsForm" style={{"display":"none"}}>
                    <div style={{"display":"flex","alignItems":"center","gap":"0.75rem","marginBottom":"1.5rem","background":"#F0FDF4","border":"1px solid #BBF7D0","padding":"1rem","borderRadius":"8px"}}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <div>
                            <div style={{"fontWeight":"600","color":"#166534","fontSize":"0.875rem"}}>Google Account Connected</div>
                            <div style={{"fontSize":"0.75rem","color":"#15803D"}} id="googleMockEmail">user@gmail.com</div>
                        </div>
                    </div>

                    <h3 style={{"marginBottom":"1.5rem","fontSize":"1.25rem"}}>Complete your organization profile</h3>
                    
                    <div id="googleGlobalError" className="global-error"></div>

                    <form id="googleSignupFormHandler" noValidate>
                        <div className="form-group">
                            <label className="form-label" htmlFor="googleOrgName">Organization Name *</label>
                            <input type="text" className="form-control" id="googleOrgName" placeholder="Enter organization name" required />
                            <div className="form-error" id="googleOrgNameError"></div>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label" htmlFor="googleAdminName">Admin Name *</label>
                            <input type="text" className="form-control" id="googleAdminName" placeholder="Enter admin name" required />
                            <div className="form-error" id="googleAdminNameError"></div>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label" htmlFor="googleOrgSize">Organization Size *</label>
                            <div className="select-wrapper">
                                <select className="form-control" id="googleOrgSize" required>
                                    <option value="" disabled selected>Select organization size</option>
                                    <option value="1-10">1-10 employees</option>
                                    <option value="11-50">11-50 employees</option>
                                    <option value="51-200">51-200 employees</option>
                                    <option value="201+">201+ employees</option>
                                </select>
                            </div>
                            <div className="form-error" id="googleOrgSizeError"></div>
                        </div>
                        
                        <div className="checkbox-group">
                            <input type="checkbox" id="googleTerms" required />
                            <label htmlFor="googleTerms">I agree to the <a href="#" onClick={() => {}} /* TODO: FIX HANDLER */ data-old-onclick="alert('Terms of Service coming soon!')">Terms of Service</a> and <a href="#" onClick={() => {}} /* TODO: FIX HANDLER */ data-old-onclick="alert('Privacy Policy coming soon!')">Privacy Policy</a></label>
                        </div>
                        <div className="form-error" id="googleTermsError" style={{"marginTop":"-0.5rem","marginBottom":"1rem"}}></div>
                        
                        <div className="form-actions" style={{"marginBottom":"0"}}>
                            <button type="submit" className="btn btn-primary" id="googleSubmitBtn" style={{"width":"100%"}}>Complete Signup</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </main>

    <LandingFooter />
</div>
    );
}