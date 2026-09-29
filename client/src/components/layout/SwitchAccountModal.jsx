import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SwitchAccountModal - React port of the original dashboard.html
 * switch account sliding panel.
 *
 * Props:
 *   isOpen   - boolean
 *   onClose  - () => void
 */
export default function SwitchAccountModal({ isOpen, onClose }) {
    const [accounts, setAccounts] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen) return;
        loadAccounts();
    }, [isOpen]);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    function loadAccounts() {
        let saved = [];
        try { saved = JSON.parse(localStorage.getItem("savedAccounts") || "[]"); } catch (e) {}
        let current = null;
        try { current = JSON.parse(localStorage.getItem("currentUser")); } catch (e) {}

        // Ensure current user is in savedAccounts (same as original)
        if (current && !saved.find(a => a.id === current.id)) {
            saved.push(current);
            localStorage.setItem("savedAccounts", JSON.stringify(saved));
        }

        setAccounts(saved);
        setCurrentUser(current);
    }

    function switchToAccount(accountId) {
        const target = accounts.find(a => a.id.toString() === accountId.toString());
        if (target) {
            localStorage.setItem("currentUser", JSON.stringify(target));
            window.location.reload();
        }
    }

    function addAnotherAccount() {
        window.location.href = "/signin";
    }

    function signOutCurrentAccount() {
        let saved = [];
        try { saved = JSON.parse(localStorage.getItem("savedAccounts") || "[]"); } catch (e) {}
        let current = null;
        try { current = JSON.parse(localStorage.getItem("currentUser")); } catch (e) {}

        if (current) {
            saved = saved.filter(a => a.id !== current.id);
            localStorage.setItem("savedAccounts", JSON.stringify(saved));
        }

        if (saved.length > 0) {
            localStorage.setItem("currentUser", JSON.stringify(saved[0]));
            window.location.reload();
        } else {
            localStorage.removeItem("currentUser");
            window.location.href = "/signin";
        }
    }

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="settings-overlay active"
                onClick={onClose}
                style={{ zIndex: 10000 }}
            />

            {/* Sliding panel from right */}
            <div
                id="switchAccountModal"
                style={{
                    boxSizing: "border-box",
                    maxWidth: "400px",
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 10001,
                    position: "fixed",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: "100%",
                    background: "var(--surface, #fff)",
                    boxShadow: "-4px 0 15px rgba(0,0,0,0.1)",
                    transform: "translateX(0)",
                    transition: "transform 0.3s ease",
                }}
            >
                {/* Header */}
                <div
                    className="settings-float-header"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: "1rem",
                        marginBottom: "1rem",
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Switch Account</h2>
                    <button
                        className="settings-float-close-btn"
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: "1.5rem",
                            cursor: "pointer",
                            color: "var(--text-gray)",
                        }}
                    >
                        &times;
                    </button>
                </div>

                {/* Accounts list */}
                <div id="savedAccountsList" style={{ flex: 1, overflowY: "auto" }}>
                    {accounts.length === 0 ? (
                        <p style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "2rem" }}>
                            No saved accounts found.
                        </p>
                    ) : (
                        accounts.map(account => {
                            const isActive = currentUser && currentUser.id === account.id;
                            const avatar = account.admin_name
                                ? account.admin_name.charAt(0).toUpperCase()
                                : "U";
                            return (
                                <div
                                    key={account.id}
                                    onClick={() => switchToAccount(account.id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        padding: "12px",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        transition: "background 0.2s",
                                        background: isActive ? "var(--bg-color)" : "transparent",
                                        border: isActive
                                            ? "1px solid var(--border)"
                                            : "1px solid transparent",
                                        marginBottom: "8px",
                                    }}
                                    onMouseOver={e => (e.currentTarget.style.background = "var(--bg-color)")}
                                    onMouseOut={e =>
                                        (e.currentTarget.style.background = isActive
                                            ? "var(--bg-color)"
                                            : "transparent")
                                    }
                                >
                                    {/* Avatar initial */}
                                    <div
                                        style={{
                                            width: "40px",
                                            height: "40px",
                                            borderRadius: "50%",
                                            background: "var(--primary)",
                                            color: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: 600,
                                            fontSize: "1.2rem",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {avatar}
                                    </div>

                                    {/* Name + email */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                color: "var(--text-dark)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {account.admin_name || "User"}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.8rem",
                                                color: "var(--text-secondary)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {account.email}
                                        </div>
                                    </div>

                                    {/* Active indicator (green dot) */}
                                    {isActive && (
                                        <div
                                            style={{
                                                width: "8px",
                                                height: "8px",
                                                borderRadius: "50%",
                                                background: "#34a853",
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer: Add Account + Sign Out */}
                <div
                    style={{
                        marginTop: "auto",
                        paddingTop: "1rem",
                        paddingBottom: "1rem",
                        borderTop: "1px solid var(--border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                    }}
                >
                    <button
                        onClick={addAnotherAccount}
                        style={{
                            padding: "0.75rem",
                            background: "var(--bg-color)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: "var(--text-dark)",
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Account
                    </button>
                    <button
                        onClick={signOutCurrentAccount}
                        style={{
                            padding: "0.75rem",
                            background: "#fff5f5",
                            border: "1px solid #ffd6d6",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: "#d93025",
                            fontWeight: 500,
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}
