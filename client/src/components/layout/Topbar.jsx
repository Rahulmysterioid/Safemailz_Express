import { signInToAccount, forgetAccountSession } from '../../utils/accountSession';
import './AccountDropdown.css';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import SettingsPanel from "./SettingsPanel";
import { DEFAULT_LOGO_CONFIG, LOGO_CONFIG_STORAGE_KEY } from "./LogoUiControllerPopover";

export default function Topbar({ searchQuery, setSearchQuery , mobileMenuOpen, onToggleMobileMenu }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsSection, setSettingsSection] = useState(null);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const searchWrapperRef = useRef(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);

    // Persisted Logo & Brand styling configuration
    const [logoConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(LOGO_CONFIG_STORAGE_KEY);
            return saved ? { ...DEFAULT_LOGO_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_LOGO_CONFIG };
        } catch {
            return { ...DEFAULT_LOGO_CONFIG };
        }
    });

    // Fetch search suggestions if enabled in general settings
    useEffect(() => {
        const fetchSuggestions = async () => {
            const generalSettings = (typeof window !== 'undefined' && typeof window.__SAFEMAILZ_GET_GENERAL_SETTINGS__ === 'function')
                ? window.__SAFEMAILZ_GET_GENERAL_SETTINGS__()
                : null;
            const suggestionsEnabled = generalSettings?.search?.suggestions ?? generalSettings?.search?.showSuggestions ?? true;
            if (!suggestionsEnabled) {
                setSuggestions([]);
                return;
            }

            try {
                const userStr = localStorage.getItem('currentUser');
                const token = localStorage.getItem('token');
                const headers = { 'Accept': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (userStr) {
                    try {
                        const u = JSON.parse(userStr);
                        if (u.id) headers['x-user-id'] = String(u.id);
                    } catch {}
                }
                const res = await fetch('/api/settings/search-history', { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.history)) {
                        setSuggestions(data.history.slice(0, 5));
                    }
                }
            } catch (e) {}
        };

        fetchSuggestions();
    }, [searchQuery]);

    // Close suggestions dropdown on outside click
    useEffect(() => {
        function handleOutsideSearch(e) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
                setShowSuggestionsDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleOutsideSearch);
        return () => document.removeEventListener("mousedown", handleOutsideSearch);
    }, []);

    // Load user from localStorage and listen to updates
    useEffect(() => {
        const syncUser = () => {
            const stored = localStorage.getItem("currentUser");
            if (stored) {
                try { setUser(JSON.parse(stored)); } catch (e) { console.error(e); }
            }
        };
        syncUser();
        window.addEventListener("storage", syncUser);
        window.addEventListener("employeeStateUpdate", syncUser);
        window.addEventListener("accountSessionChanged", syncUser);
        return () => {
            window.removeEventListener("storage", syncUser);
            window.removeEventListener("employeeStateUpdate", syncUser);
            window.removeEventListener("accountSessionChanged", syncUser);
        };
    }, []);

    // Close dropdown when clicking outside (same as original window.addEventListener)
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!dropdownOpen) return;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setDropdownOpen(false);
                dropdownRef.current?.querySelector('.topbar-profile-btn')?.focus();
            }
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [dropdownOpen]);

    // Multi-account logout — mirrors original signOutCurrentAccount()
    const handleLogout = useCallback(() => {
        let savedAccounts = [];
        try { savedAccounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]"); } catch (e) { }
        let currentUser = null;
        try { currentUser = JSON.parse(localStorage.getItem("currentUser")); } catch (e) { }

        if (currentUser) {
            forgetAccountSession(currentUser.id);
            savedAccounts = savedAccounts.filter(a => a.id !== currentUser.id);
            localStorage.setItem("savedAccounts", JSON.stringify(savedAccounts));
        }

        signInToAccount(savedAccounts[0], { preserveCurrent: false });
    }, [navigate]);

    // Open settings panel, optionally to a specific section
    function openSettings(section) {
        setDropdownOpen(false);
        setSettingsSection(section || null);
        setSettingsOpen(true);
    }

    return (
        <>
            <header className="topbar bg-white dark:bg-[#181818] border-b border-slate-200 dark:border-[#2b2b2b] text-slate-700 dark:text-slate-200 px-4">
                <div className="topbar-left flex items-center h-full">
                    {/* Mobile Hamburger Menu */}
                    <button
                        className="mobile-menu-btn text-slate-700 dark:text-slate-200"
                        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={mobileMenuOpen}
                        aria-controls="responsiveSidebar"
                        onClick={onToggleMobileMenu}
                        style={{ display: "none", background: "none", border: "none", padding: "4px", cursor: "pointer", color: "inherit", marginRight: "8px" }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>

                    {/* Grid / Waffle App Switcher icon */}
                    <div 
                        className="grid-icon" 
                        role="button" 
                        tabIndex={0} 
                        aria-label="App Launcher" 
                        title="App Launcher"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                            }
                        }}
                    >
                        <span></span><span></span><span></span>
                        <span></span><span></span><span></span>
                        <span></span><span></span><span></span>
                    </div>

                    {/* Subtle Vertical Divider */}
                    <div className="topbar-divider" aria-hidden="true" />

                    {/* Brand Lockup: Horizontal Logo Badge + 2-Line Text Stack */}
                    <div className="flex items-center" style={{ position: 'relative' }}>
                        <Link 
                            to="/dashboard" 
                            className="topbar-logo group flex items-center no-underline select-none" 
                            aria-label="Safemailz Dashboard Home"
                            style={{
                                transform: `translate(${logoConfig.shiftX || 0}px, ${logoConfig.shiftY || 0}px) scale(${logoConfig.scale || 1})`,
                                transformOrigin: 'left center',
                                gap: `${logoConfig.gap ?? 10}px`,
                                transition: 'transform 0.1s ease-out, gap 0.1s ease-out'
                            }}
                        >
                            {/* Upgraded 34x34px Rounded-Square Badge */}
                            <div 
                                className="topbar-logo-badge" 
                                aria-hidden="true"
                                style={{
                                    width: `${logoConfig.badgeSize || 34}px`,
                                    height: `${logoConfig.badgeSize || 34}px`,
                                    borderRadius: `${logoConfig.badgeRadius ?? 8}px`,
                                    transition: 'width 0.1s ease-out, height 0.1s ease-out, border-radius 0.1s ease-out'
                                }}
                            >
                                <svg 
                                    className="topbar-logo-icon" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                    style={{
                                        width: `${logoConfig.iconSize || 19}px`,
                                        height: `${logoConfig.iconSize || 19}px`,
                                        transition: 'width 0.1s ease-out, height 0.1s ease-out'
                                    }}
                                >
                                    {/* Shield Contour */}
                                    <path 
                                        d="M12 2L4 5.5V11C4 16.25 7.4 21.15 12 22.5C16.6 21.15 20 16.25 20 11V5.5L12 2Z" 
                                        fill="rgba(255, 255, 255, 0.16)"
                                        stroke="#FFFFFF" 
                                        strokeWidth="1.8" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                    />
                                    {/* Bold M Monogram + Envelope Flap */}
                                    <path 
                                        d="M7 15.5V9.5L12 13.5L17 9.5V15.5" 
                                        stroke="#FFFFFF" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                    />
                                </svg>
                            </div>

                            {/* Refined Brand Typography & Tagline Hierarchy */}
                            <div 
                                className="topbar-brand-text flex flex-col items-start justify-center"
                                style={{
                                    transform: `translate(${logoConfig.textShiftX || 0}px, ${logoConfig.textShiftY || 0}px)`,
                                    transition: 'transform 0.1s ease-out'
                                }}
                            >
                                <span 
                                    className="topbar-brand-name font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
                                    style={{
                                        fontSize: `${logoConfig.nameFontSize || 15}px`,
                                        lineHeight: 1.15,
                                        transition: 'font-size 0.1s ease-out'
                                    }}
                                >
                                    SAFEMAILZ
                                </span>
                                <span 
                                    className="topbar-brand-tagline font-medium uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap"
                                    style={{
                                        fontSize: `${logoConfig.taglineFontSize || 9.5}px`,
                                        letterSpacing: `${logoConfig.taglineSpacing ?? 0.08}em`,
                                        transform: `translateY(${logoConfig.taglineShiftY || 0}px)`,
                                        lineHeight: 1.1,
                                        transition: 'font-size 0.1s ease-out, transform 0.1s ease-out, letter-spacing 0.1s ease-out'
                                    }}
                                >
                                    PROTECT YOUR CLIENTS
                                </span>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Search */}
                <div ref={searchWrapperRef} className="topbar-search" style={{ position: "relative", flex: 1, maxWidth: "480px", margin: "0 1.5rem" }}>
                    <svg
                        className="topbar-search-icon text-slate-400 dark:text-slate-500"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", pointerEvents: "none" }}
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search..."
                        id="topbarSearch"
                        aria-label="Search"
                        className="bg-slate-100 dark:bg-[#262626] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#383838] placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md"
                        value={searchQuery || ""}
                        onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            height: "36px",
                            padding: "0 1rem 0 2.25rem",
                            fontSize: "0.85rem",
                            outline: "none",
                            transition: "all var(--transition-fast)"
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-focus)";
                            setShowSuggestionsDropdown(true);
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />
                    {showSuggestionsDropdown && suggestions.length > 0 && (
                        <div className="bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#383838] rounded-md shadow-lg" style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            overflow: "hidden"
                        }}>
                            <div className="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-[#2d2d2d]" style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
                                Recent searches
                            </div>
                            {suggestions.map((item, idx) => (
                                <div
                                    key={item.id || idx}
                                    onClick={() => {
                                        if (setSearchQuery) setSearchQuery(item.query);
                                        setShowSuggestionsDropdown(false);
                                    }}
                                    className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#292929] cursor-pointer flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                                >
                                    <span style={{ color: "#94a3b8" }}>🔍</span>
                                    <span>{item.query}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right icons — Premium Action Cluster */}
                <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Notifications — Premium Duotone Bell with Status Dot */}
                    <button
                        className="icon-btn topbar-premium-btn group"
                        aria-label="Notifications"
                        title="Notifications"
                        onClick={() => alert("No new notifications")}
                    >
                        <span className="topbar-premium-btn-glow" aria-hidden="true" />
                        <svg
                            className="topbar-premium-svg topbar-bell-svg"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            {/* Soft inner fill for depth */}
                            <path
                                d="M18 8.4C18 5.08629 15.3137 2.4 12 2.4C8.68629 2.4 6 5.08629 6 8.4C6 14.2 3.6 16.2 3.6 16.2H20.4C20.4 16.2 18 14.2 18 8.4Z"
                                fill="currentColor"
                                fillOpacity="0.12"
                            />
                            {/* Top bell finial */}
                            <path
                                d="M12 2V3.2"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                            {/* Main bell contour */}
                            <path
                                d="M18 8.5C18 5.18629 15.3137 2.5 12 2.5C8.68629 2.5 6 5.18629 6 8.5C6 13.8 4.1 15.9 3.55 16.65C3.31 16.98 3.55 17.45 3.96 17.45H20.04C20.45 17.45 20.69 16.98 20.45 16.65C19.9 15.9 18 13.8 18 8.5Z"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Clapper arc */}
                            <path
                                d="M9.75 17.75C10.15 19.15 10.98 20 12 20C13.02 20 13.85 19.15 14.25 17.75"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        {/* Subtle notification accent badge */}
                        <span className="topbar-notif-dot" aria-hidden="true" />
                    </button>

                    {/* Settings — Premium Precision Gear Icon */}
                    <button
                        id="btnOpenSettingsModal"
                        className="icon-btn topbar-premium-btn group"
                        aria-label="Settings"
                        title="Settings"
                        onClick={() => openSettings(null)}
                    >
                        <span className="topbar-premium-btn-glow" aria-hidden="true" />
                        <svg
                            className="topbar-premium-svg topbar-gear-svg"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            {/* Outer precision cog */}
                            <path
                                d="M10.325 4.317C10.751 2.561 13.249 2.561 13.675 4.317C13.951 5.451 15.248 5.988 16.247 5.382C17.791 4.445 19.555 6.209 18.618 7.753C18.012 8.752 18.549 10.049 19.683 10.325C21.439 10.751 21.439 13.249 19.683 13.675C18.549 13.951 18.012 15.248 18.618 16.247C19.555 17.791 17.791 19.555 16.247 18.618C15.248 18.012 13.951 18.549 13.675 19.683C13.249 21.439 10.751 21.439 10.325 19.683C10.049 18.549 8.752 18.012 7.753 18.618C6.209 19.555 4.445 17.791 5.382 16.247C5.988 15.248 5.451 13.951 4.317 13.675C2.561 13.249 2.561 10.751 4.317 10.325C5.451 10.049 5.988 8.752 5.382 7.753C4.445 6.209 6.209 4.445 7.753 5.382C8.752 5.988 10.049 5.451 10.325 4.317Z"
                                fill="currentColor"
                                fillOpacity="0.1"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Inner core ring */}
                            <circle
                                cx="12"
                                cy="12"
                                r="3.1"
                                fill="currentColor"
                                fillOpacity="0.18"
                                stroke="currentColor"
                                strokeWidth="1.75"
                            />
                        </svg>
                    </button>

                    {/* Subtle vertical separator */}
                    <div className="topbar-right-divider" aria-hidden="true" />

                    {/* Profile Avatar Button + Dropdown */}
                    <div className="profile-dropdown-container" style={{ position: "relative" }} ref={dropdownRef}>
                        <button
                            type="button"
                            className={`topbar-profile-btn avatar ${dropdownOpen ? "is-open" : ""}`}
                            title="Profile Menu"
                            aria-label="Profile Menu"
                            aria-expanded={dropdownOpen}
                            aria-controls="profileDropdown"
                            onClick={() => setDropdownOpen(prev => !prev)}
                        >
                            <span className="topbar-profile-avatar-ring" aria-hidden="true">
                                <span className="topbar-profile-avatar-core">
                                    {/* Premium Executive User Shield/Portrait Icon */}
                                    <svg
                                        className="topbar-profile-svg"
                                         xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <defs>
                                            <linearGradient id="safemailzAvatarGrad" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="#60A5FA" />
                                                <stop offset="100%" stopColor="#2563EB" />
                                            </linearGradient>
                                        </defs>
                                        {/* Head contour with soft duotone fill */}
                                        <circle
                                            cx="12"
                                            cy="8.5"
                                            r="3.6"
                                            fill="url(#safemailzAvatarGrad)"
                                            fillOpacity="0.35"
                                            stroke="#FFFFFF"
                                            strokeWidth="1.8"
                                        />
                                        {/* Shoulders / torso arc */}
                                        <path
                                            d="M5.5 19.2C6.35 16.05 8.92 14.2 12 14.2C15.08 14.2 17.65 16.05 18.5 19.2"
                                            stroke="#FFFFFF"
                                            strokeWidth="1.85"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </span>
                            </span>
                            {/* Online Presence Dot */}
                            <span className="topbar-profile-status-dot" aria-hidden="true" />
                        </button>

                        {dropdownOpen && (
                            <div
                                className="profile-dropdown-menu bg-white dark:bg-[#1b1e24] border border-slate-200 dark:border-[#2e333d] shadow-xl rounded-xl"
                                id="profileDropdown"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    position: "absolute",
                                    right: 0,
                                    top: "46px",
                                    zIndex: 100,
                                    minWidth: "215px",
                                    padding: "6px"
                                }}
                            >
                                {user && (
                                    <div className="px-3 py-2.5 mb-1 border-b border-slate-100 dark:border-[#282c35]">
                                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                                            {user.admin_name || user.name || `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email || (user.role?.toLowerCase() === 'employee' ? 'Employee' : 'Admin Account')}
                                        </div>
                                        {user.email && (
                                            <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5">
                                                {user.email}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button
                                    className="profile-dropdown-item text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#262a33]"
                                    type="button"
                                    onClick={() => openSettings("settingsAccountInfo")}
                                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.84rem", fontWeight: 500, borderRadius: "8px", cursor: "pointer", transition: "background-color var(--transition-fast)" }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    Account Info
                                </button>
                                <button
                                    className="profile-dropdown-item text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#262a33]"
                                    type="button"
                                    onClick={() => openSettings("settingsAccountSettings")}
                                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.84rem", fontWeight: 500, borderRadius: "8px", cursor: "pointer", transition: "background-color var(--transition-fast)" }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                    </svg>
                                    Account Settings
                                </button>
                                <button
                                    className="profile-dropdown-item text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#262a33]"
                                    type="button"
                                    onClick={() => openSettings("settingsPassword")}
                                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.84rem", fontWeight: 500, borderRadius: "8px", cursor: "pointer", transition: "background-color var(--transition-fast)" }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    Password Change
                                </button>
                                <div className="profile-dropdown-divider border-t border-slate-100 dark:border-[#282c35]" style={{ margin: "4px 0" }}></div>
                                <button
                                    className="profile-dropdown-item hover:bg-rose-50 dark:hover:bg-[#331818]"
                                    type="button"
                                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.84rem", fontWeight: 600, color: "var(--danger)", borderRadius: "8px", cursor: "pointer", transition: "background-color var(--transition-fast)" }}
                                    onClick={handleLogout}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Floating Settings Panel */}
            <SettingsPanel
                isOpen={settingsOpen}
                initialSection={settingsSection}
                onClose={() => setSettingsOpen(false)}
            />
        </>
    );
}
