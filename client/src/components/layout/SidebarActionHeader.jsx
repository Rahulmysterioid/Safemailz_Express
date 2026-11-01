import React from 'react';

/**
 * Standardized sidebar action header container for dashboard sidebars.
 * Enforces identical top padding (p-3 = 12px), vertical rhythm (space-y-2.5 = 10px),
 * and subtle bottom divider border (border-b border-slate-100) across
 * Admins, Clients, Projects, Email IDs, Tasks, and Employees sidebars.
 */
export default function SidebarActionHeader({ children, className = '', id, ...props }) {
    return (
        <div 
            id={id}
            className={`sidebar-action-header p-3 space-y-2.5 border-b border-slate-100 dark:border-[#2b2b2b] flex flex-col shrink-0 gap-2.5 ${className}`.trim()}
            {...props}
        >
            {children}
        </div>
    );
}
