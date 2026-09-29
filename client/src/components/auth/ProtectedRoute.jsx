import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute - redirects to /signin if user is not authenticated.
 * Auth is determined by the presence of a 'token' in localStorage.
 */
export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        return <Navigate to="/signin" replace />;
    }
    return children;
}
