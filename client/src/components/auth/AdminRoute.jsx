import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasAdminPrivileges } from '../../utils/permissions';

export default function AdminRoute({ children }) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!hasAdminPrivileges(currentUser)) {
        return <Navigate to="/dashboard/email/inbox" replace />;
    }

    return children;
}
