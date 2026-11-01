import { saveAccountSession } from '../utils/accountSession';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import '../styles.css';

export default function ForceChangePassword() {
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [globalError, setGlobalError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Ensure user has a token / session, otherwise redirect to signin
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('currentUser');
        if (!token && !user) {
            navigate('/signin', { replace: true });
        }
    }, [navigate]);

    // Real-time validation helper
    const validate = () => {
        let valid = true;
        setNewPasswordError('');
        setConfirmPasswordError('');

        if (!newPassword) {
            setNewPasswordError('New password is required');
            valid = false;
        } else if (newPassword.length < 8) {
            setNewPasswordError('Password must be at least 8 characters long');
            valid = false;
        }

        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            valid = false;
        } else if (newPassword !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            valid = false;
        }

        return valid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGlobalError('');
        setSuccessMessage('');

        if (!validate()) {
            return;
        }

        setIsLoading(true);

        const token = localStorage.getItem('token') || '';
        let currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        } catch (err) {
            currentUser = {};
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
            'x-user-id': currentUser.id ? String(currentUser.id) : ''
        };

        try {
            let response = await fetch('/api/force-change-password', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    newPassword,
                    confirmPassword
                })
            });

            // Fallback to /api/auth/force-change-password if /api/force-change-password returned 404
            if (response.status === 404) {
                response = await fetch('/api/auth/force-change-password', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        newPassword,
                        confirmPassword
                    })
                });
            }

            const data = await response.json();

            if (response.ok && (data.success || response.status === 200)) {
                setSuccessMessage('Password changed successfully! Redirecting to your dashboard...');

                // Update currentUser in localStorage with mustChangePassword = false
                const updatedUser = data.user || {
                    ...currentUser,
                    mustChangePassword: false,
                    must_change_password: 0
                };
                updatedUser.mustChangePassword = false;
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));

                // Save fresh token if returned
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    saveAccountSession(updatedUser, data.token);
                }

                // Redirect to dashboard after a short notification display
                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 1000);
            } else {
                setGlobalError(data.error || data.message || 'Failed to update password. Please try again.');
            }
        } catch (err) {
            console.error('Error submitting password change:', err);
            setGlobalError('Network error. Unable to reach the server. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isLengthValid = newPassword.length >= 8;
    const isMatching = confirmPassword.length > 0 && newPassword === confirmPassword;

    return (
        <div>
            <LandingHeader />

            <main>
                <div className="login-container">
                    <div className="login-header">
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(69, 174, 241, 0.1)',
                            color: '#1A60A4',
                            marginBottom: '1rem'
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                        <h1>Change Your Password</h1>
                        <p>Your organization owner has required you to set a new password before accessing your account.</p>
                    </div>

                    {globalError && (
                        <div id="globalError" className="global-error" style={{ display: 'block' }}>
                            {globalError}
                        </div>
                    )}

                    {successMessage && (
                        <div style={{
                            backgroundColor: '#e6f4ea',
                            color: '#137333',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            textAlign: 'center'
                        }}>
                            {successMessage}
                        </div>
                    )}

                    <form id="forceChangePasswordForm" noValidate onSubmit={handleSubmit}>
                        {/* New Password */}
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label" htmlFor="newPassword">
                                New Password <span className="required">*</span>
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    className="form-control"
                                    id="newPassword"
                                    placeholder="Enter new password (min. 8 characters)"
                                    required
                                    style={{ paddingRight: '3rem' }}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    aria-label="Toggle new password visibility"
                                >
                                    {showNewPassword ? (
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
                            {newPasswordError && (
                                <div className="form-error" style={{ display: 'block' }}>
                                    {newPasswordError}
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label" htmlFor="confirmPassword">
                                Confirm Password <span className="required">*</span>
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className="form-control"
                                    id="confirmPassword"
                                    placeholder="Confirm new password"
                                    required
                                    style={{ paddingRight: '3rem' }}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label="Toggle confirm password visibility"
                                >
                                    {showConfirmPassword ? (
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
                            {confirmPasswordError && (
                                <div className="form-error" style={{ display: 'block' }}>
                                    {confirmPasswordError}
                                </div>
                            )}
                        </div>

                        {/* Password Requirements Checklist */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '0.85rem 1rem',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            marginBottom: '1.5rem',
                            fontSize: '0.85rem'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: isLengthValid ? '#16a34a' : '#64748b',
                                marginBottom: '0.4rem',
                                transition: 'color 0.2s'
                            }}>
                                <span style={{ fontWeight: 'bold' }}>{isLengthValid ? '✓' : '○'}</span>
                                <span>At least 8 characters long</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: isMatching ? '#16a34a' : '#64748b',
                                transition: 'color 0.2s'
                            }}>
                                <span style={{ fontWeight: 'bold' }}>{isMatching ? '✓' : '○'}</span>
                                <span>Passwords match</span>
                            </div>
                        </div>

                        {/* Submit button */}
                        <div className="form-actions" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Updating Password...' : 'Update Password & Access Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
