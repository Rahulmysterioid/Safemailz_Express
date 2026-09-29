import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import SettingsPanel from "./SettingsPanel";

export default function Topbar({ searchQuery, setSearchQuery }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsSection, setSettingsSection] = useState(null);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    // Load user from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("currentUser");
        if (stored) {
            try { setUser(JSON.parse(stored)); } catch (e) { console.error(e); }
        }
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

    // Multi-account logout — mirrors original signOutCurrentAccount()
    const handleLogout = useCallback(() => {
        let savedAccounts = [];
        try { savedAccounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]"); } catch (e) {}
        let currentUser = null;
        try { currentUser = JSON.parse(localStorage.getItem("currentUser")); } catch (e) {}

        if (currentUser) {
            savedAccounts = savedAccounts.filter(a => a.id !== currentUser.id);
            localStorage.setItem("savedAccounts", JSON.stringify(savedAccounts));
        }

        if (savedAccounts.length > 0) {
            // Switch to next saved account
            localStorage.setItem("currentUser", JSON.stringify(savedAccounts[0]));
            window.location.reload();
        } else {
            localStorage.removeItem("currentUser");
            localStorage.removeItem("token");
            navigate("/signin");
        }
    }, [navigate]);

    // Open settings panel, optionally to a specific section
    function openSettings(section) {
        setDropdownOpen(false);
        setSettingsSection(section || null);
        setSettingsOpen(true);
    }

    return (
        <>
            <header className="topbar">
                <div className="topbar-left">
                    {/* Mobile Hamburger Menu */}
                    <button
                        className="mobile-menu-btn"
                        aria-label="Open Menu"
                        style={{ display: "none", background: "none", border: "none", padding: "4px", cursor: "pointer", color: "var(--text-primary)", marginRight: "8px" }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>

                    {/* Grid / Waffle icon */}
                    <div className="grid-icon" aria-label="Menu">
                        <span></span><span></span><span></span>
                        <span></span><span></span><span></span>
                        <span></span><span></span><span></span>
                    </div>

                    {/* Logo */}
                    <Link to="/dashboard/employees" className="topbar-logo" aria-label="Safemailz Home">
                        <span style={{ fontSize: "1.4rem", fontWeight: "900", background: "linear-gradient(90deg,#3DA2F3,#68D1FA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: "1" }}>M</span>
                        <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#1A60A4", letterSpacing: "0.5px" }}>SAFEMAILZ</span>
                        <span style={{ fontSize: "0.35rem", textTransform: "uppercase", color: "#333", letterSpacing: "1.5px" }}>PROTECT YOUR CLIENTS</span>
                    </Link>
                </div>

                {/* Search */}
                <div className="topbar-search" style={{ position: "relative", flex: 1, maxWidth: "480px", margin: "0 1.5rem" }}>
                    <svg
                        className="topbar-search-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "var(--text-muted)", pointerEvents: "none" }}
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search..."
                        id="topbarSearch"
                        aria-label="Search"
                        value={searchQuery || ""}
                        onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            height: "36px",
                            padding: "0 1rem 0 2.25rem",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--surface-subtle)",
                            fontSize: "0.85rem",
                            color: "var(--text-primary)",
                            outline: "none",
                            transition: "all var(--transition-fast)"
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.backgroundColor = "#FFFFFF";
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-focus)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--surface-subtle)";
                            e.currentTarget.style.borderColor = "var(--border-subtle)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />
                </div>

                {/* Right icons */}
                <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {/* Notifications */}
                    <button
                        className="icon-btn"
                        aria-label="Notifications"
                        title="Notifications"
                        onClick={() => alert("No new notifications")}
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "var(--radius-md)", border: "1px solid transparent", background: "none", color: "var(--text-secondary)", cursor: "pointer", transition: "all var(--transition-fast)" }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </button>

                    {/* Settings — opens real settings panel */}
                    <button
                        className="icon-btn"
                        aria-label="Settings"
                        title="Settings"
                        onClick={() => openSettings(null)}
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "var(--radius-md)", border: "1px solid transparent", background: "none", color: "var(--text-secondary)", cursor: "pointer", transition: "all var(--transition-fast)" }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>

                    {/* Profile avatar + dropdown */}
                    <div className="profile-dropdown-container" style={{ position: "relative", marginLeft: "4px" }} ref={dropdownRef}>
                        <img
                            src="/images/avatar_1.png"
                            alt="Profile"
                            className="avatar"
                            style={{ cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-subtle)", transition: "border-color var(--transition-fast)" }}
                            title="Profile Menu"
                            onClick={() => setDropdownOpen(prev => !prev)}
                            onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.admin_name || "Admin")}&background=2563EB&color=fff`;
                            }}
                        />
                        {dropdownOpen && (
                            <div
                                className="profile-dropdown-menu"
                                id="profileDropdown"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    position: "absolute",
                                    right: 0,
                                    top: "44px",
                                    background: "#FFFFFF",
                                    border: "1px solid var(--border-subtle)",
                                    boxShadow: "var(--shadow-lg)",
                                    borderRadius: "var(--radius-lg)",
                                    zIndex: 100,
                                    minWidth: "180px",
                                    padding: "6px"
                                }}
                            >
                                <button
                                    className="profile-dropdown-item"
                                    type="button"
                                    onClick={() => openSettings("settingsAccountInfo")}
                                    style={{ padding: "8px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "background-color var(--transition-fast)" }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--surface-subtle)"}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    Account Info
                                </button>
                                <button
                                    className="profile-dropdown-item"
                                    type="button"
                                    onClick={() => openSettings("settingsAccountSettings")}
                                    style={{ padding: "8px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "background-color var(--transition-fast)" }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--surface-subtle)"}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    Account Settings
                                </button>
                                <button
                                    className="profile-dropdown-item"
                                    type="button"
                                    onClick={() => openSettings("settingsPassword")}
                                    style={{ padding: "8px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "background-color var(--transition-fast)" }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--surface-subtle)"}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    Password Change
                                </button>
                                <div className="profile-dropdown-divider" style={{ height: "1px", background: "var(--border-subtle)", margin: "4px 0" }}></div>
                                <button
                                    className="profile-dropdown-item"
                                    type="button"
                                    style={{ padding: "8px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.85rem", fontWeight: 600, color: "var(--danger)", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "background-color var(--transition-fast)" }}
                                    onClick={handleLogout}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--danger-light)"}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
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
