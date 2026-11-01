import React from 'react';
import { useSidebarUI } from '../../context/SidebarUIContext';

const getInitials = name => name ? name.substring(0, 2).toUpperCase() : 'U';

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    'linear-gradient(135deg, #059669 0%, #047857 100%)',
    'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
];

export default function EmployeeSidebarCard({seat,i,isSelected,onSelect,activeDropdownIndex,setActiveDropdownIndex,resendInvite,deleteEmployee}) {
    const {sidebarSettings,applyCustomColors}=useSidebarUI();
    const fullName=`${seat.firstName || ''} ${seat.lastName || ''}`.trim() || 'Employee';
                        const usedStorage = seat?.usedStorage || 0;
                        const totalStorage = seat?.totalStorage || 15;
                        const storagePct = Math.min(100, Math.round((usedStorage / totalStorage) * 100));
                        const initials = getInitials(fullName);
                        const avatarBg = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];

                        let daysLeftText = "Expire in 30 days";
                        if (seat?.joined_date) {
                            const joined = new Date(seat.joined_date);
                            if (!isNaN(joined.getTime())) {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                let nextBilling = new Date(joined);
                                nextBilling.setHours(0, 0, 0, 0);

                                while (nextBilling <= today) {
                                    nextBilling.setMonth(nextBilling.getMonth() + 1);
                                }
                                const diffTime = nextBilling - today;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                daysLeftText = `Expire in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                            }
                        }

    return (
                            <div
                                key={seat?.id || i}
                                className={`sidebar-emp-card w-full rounded-xl p-3 transition-all cursor-pointer ${isSelected
                                        ? 'selected active bg-blue-50 dark:bg-[#152438] border border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
                                        : 'bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#303030] shadow-sm hover:bg-slate-50 hover:border-slate-300 dark:hover:border-[#404040]'
                                    }`}
                                style={{
                                    backgroundColor: applyCustomColors
                                        ? (isSelected ? sidebarSettings?.activeCardBgColor : sidebarSettings?.cardBgColor)
                                        : undefined,
                                    borderColor: applyCustomColors
                                        ? (isSelected ? sidebarSettings?.activeCardBorderColor : sidebarSettings?.cardBorderColor)
                                        : undefined,
                                    borderRadius: sidebarSettings?.cardBorderRadius ? `${sidebarSettings.cardBorderRadius}px` : undefined
                                }}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                onKeyDown={e=>{if(e.target===e.currentTarget && (e.key==='Enter'||e.key===' ')){e.preventDefault();onSelect();}}}
                                data-seat-index={i}
                                onClick={() => {
                                    onSelect();
                                }}
                            >
                                {/* Top Badge Row */}
                                <div className="sidebar-emp-badges flex items-center justify-between gap-1.5 w-full mb-2.5">
                                    <span className="sidebar-emp-expiry inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-200/70 whitespace-nowrap shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        <span>{daysLeftText}</span>
                                    </span>
                                    <span className={`sidebar-emp-status-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 ${seat?.permissions?.blocked
                                            ? 'blocked bg-rose-50 text-rose-700 border border-rose-200/70'
                                            : (seat.isPending
                                                ? 'pending bg-amber-50 text-amber-700 border border-amber-200/70'
                                                : 'active bg-emerald-50 text-emerald-700 border border-emerald-200/70')
                                        }`}>
                                        <span className="sidebar-emp-status-dot w-1.5 h-1.5 rounded-full shrink-0" aria-hidden="true"></span>
                                        <span>{seat?.permissions?.blocked ? 'Blocked' : (seat.isPending ? 'Pending' : 'Active')}</span>
                                    </span>
                                </div>

                                {/* Middle Row: Avatar + Name/Email Column + 3-Dot Menu */}
                                <div className="sidebar-emp-header flex items-center gap-2.5 w-full mb-3">
                                    <div className="sidebar-emp-avatar w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: avatarBg }}>
                                        {initials}
                                    </div>
                                    <div className="sidebar-emp-name-wrap flex-1 min-w-0">
                                        <span
                                            className="name-placeholder text-[13px] font-semibold text-slate-900 dark:text-white truncate leading-snug block"
                                            title={`${i + 1}. ${fullName}`}
                                            style={{
                                                color: applyCustomColors ? sidebarSettings?.textColor : undefined,
                                                fontSize: sidebarSettings?.cardTitleFontSize ? `${sidebarSettings.cardTitleFontSize}px` : undefined
                                            }}
                                        >
                                            <span className="sidebar-emp-index">{i + 1}.</span> {fullName}
                                        </span>
                                        {seat?.email ? (
                                            <span
                                                className="sidebar-emp-email-sub text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight block mt-0.5"
                                                title={seat.email}
                                                style={{
                                                    color: applyCustomColors ? sidebarSettings?.subtextColor : undefined,
                                                    fontSize: sidebarSettings?.cardSubFontSize ? `${sidebarSettings.cardSubFontSize}px` : undefined
                                                }}
                                            >
                                                {seat.email}
                                            </span>
                                        ) : (
                                            <span
                                                className="sidebar-emp-email-sub text-[11px] text-slate-400 truncate leading-tight block mt-0.5"
                                                style={{
                                                    color: applyCustomColors ? sidebarSettings?.subtextColor : undefined,
                                                    fontSize: sidebarSettings?.cardSubFontSize ? `${sidebarSettings.cardSubFontSize}px` : undefined
                                                }}
                                            >
                                                Seat #{i + 1}
                                            </span>
                                        )}
                                    </div>

                                    <div
                                        className="sidebar-emp-kebab w-6 h-6 -mr-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2d2d2d] flex items-center justify-center shrink-0 transition-colors relative"
                                        title="Options"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdownIndex(activeDropdownIndex === i ? null : i);
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="12" cy="5" r="1"></circle>
                                            <circle cx="12" cy="19" r="1"></circle>
                                        </svg>
                                        {activeDropdownIndex === i && (
                                            <div className="sidebar-dropdown" style={{ display: 'block' }}>
                                                <div className="sidebar-dropdown-item" onClick={(e) => { e.stopPropagation(); setActiveDropdownIndex(null); resendInvite(i); }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                        <polyline points="22,6 12,13 2,6"></polyline>
                                                    </svg>
                                                    Invite
                                                </div>
                                                <div className="sidebar-dropdown-item danger" onClick={(e) => { e.stopPropagation(); setActiveDropdownIndex(null); deleteEmployee(i); }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                    Delete
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Storage Section */}
                                <div className="sidebar-emp-storage pt-2 border-t border-slate-100 dark:border-[#2b2b2b] flex flex-col">
                                    <div className="sidebar-emp-storage-meta flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                                        <span
                                            className="sidebar-emp-storage-label flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300"
                                            style={{
                                                color: applyCustomColors ? sidebarSettings?.subtextColor : undefined,
                                                fontSize: sidebarSettings?.cardSubFontSize ? `${sidebarSettings.cardSubFontSize}px` : undefined
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                                            </svg>
                                            Storage
                                        </span>
                                        <span
                                            className="sidebar-emp-storage-val"
                                            style={{
                                                color: applyCustomColors ? sidebarSettings?.subtextColor : undefined,
                                                fontSize: sidebarSettings?.cardSubFontSize ? `${sidebarSettings.cardSubFontSize}px` : undefined
                                            }}
                                        >
                                            <strong
                                                className="font-semibold text-slate-800 dark:text-slate-200"
                                                style={{ color: applyCustomColors ? sidebarSettings?.textColor : undefined }}
                                            >
                                                {usedStorage} GB
                                            </strong>
                                            <span className="text-slate-400" style={{ color: applyCustomColors ? sidebarSettings?.subtextColor : undefined }}> / {totalStorage} GB</span>
                                        </span>
                                    </div>
                                    <div className="sidebar-emp-storage-track w-full h-1.5 bg-slate-200 dark:bg-[#2d2d2d] rounded-full overflow-hidden">
                                        <div className="sidebar-emp-storage-fill h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${storagePct}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        );
}
