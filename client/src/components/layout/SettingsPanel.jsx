import React, { useState, useEffect } from "react";
import SignatureEditorModal from "../dashboard/SignatureEditorModal";
import AutomaticRepliesSection from "../settings/AutomaticRepliesSection";
import CategoriesSection from "../settings/CategoriesSection";
import StorageSection from "../settings/StorageSection";
import LanguageTimeSection from "../settings/LanguageTimeSection";
import AppearanceSection from "../settings/AppearanceSection";
import NotificationsSection from "../settings/NotificationsSection";
import AccessibilitySection from "../settings/AccessibilitySection";
import PrivacyDataSection from "../settings/PrivacyDataSection";
import SearchSection from "../settings/SearchSection";

const SETTINGS_SUBMENUS = {
    account: [
        { id: "settingsAccountInfo",        label: "Account Info" },
        { id: "settingsAutomaticReplies",   label: "Automatic replies" },
        { id: "settingsSignatures",         label: "Signatures" },
        { id: "settingsCategories",         label: "Categories" },
        { id: "settingsStorage",            label: "Storage" },
        { id: "settingsOrgInfo",            label: "Organization" },
        { id: "settingsSignupDetails",      label: "Signup Details" },
        { id: "settingsAccountSettings",    label: "Settings" },
        { id: "settingsPassword",           label: "Security" },
        { id: "settingsLiveSync",           label: "Live Sync" },
        { id: "settingsDangerZone",         label: "Danger Zone" },
    ],
    general: [
        { id: "settingsLanguageTime",  label: "Language and time" },
        { id: "settingsAppearance",    label: "Appearance" },
        { id: "settingsNotifications", label: "Notifications" },
        { id: "settingsAccessibility", label: "Accessibility" },
        { id: "settingsPrivacyData",   label: "Privacy and data" },
        { id: "settingsSearch",        label: "Search" },
    ],
    mail: [
        { id: "settingsMailLayout",       label: "Layout" },
        { id: "settingsCompose",          label: "Compose" },
        { id: "settingsSmartSuggestions", label: "Smart Suggestions" },
        { id: "settingsRules",            label: "Rules" },
    ],
};

const SECTION_TO_TAB = {
    // Account Tab
    settingsAccountInfo:        "account",
    settingsAutomaticReplies:   "account",
    settingsSignatures:         "account",
    settingsCategories:         "account",
    settingsStorage:            "account",
    settingsOrgInfo:            "account",
    settingsSignupDetails:      "account",
    settingsAccountSettings:    "account",
    settingsPassword:           "account",
    settingsLiveSync:           "account",
    settingsDangerZone:         "account",

    // General Tab (All 6 Outlook Items)
    settingsLanguageTime:       "general",
    settingsAppearance:         "general",
    settingsNotifications:      "general",
    settingsAccessibility:      "general",
    settingsPrivacyData:        "general",
    settingsSearch:             "general",

    // Legacy Aliases for General
    settingsLanguage:           "general",

    // Mail Tab
    settingsMailLayout:         "mail",
    settingsLayout:             "mail", // Legacy alias for relocated Mail Layout
    settingsCompose:            "mail",
    settingsSmartSuggestions:   "mail",
    settingsRules:              "mail",
};

function getHeaders() {
    const userStr = localStorage.getItem("currentUser");
    const headers = { "Content-Type": "application/json" };
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            headers["X-User-Id"] = user.id;
            headers["X-Org-Id"] = user.organization_id;
            if (user.email) headers["X-Active-Email"] = String(user.email).trim();
        } catch (e) {}
    }
    return headers;
}

function InfoRow({ label, value }) {
    return (
        <div className="settings-float-row">
            <span className="settings-float-row-label">{label}</span>
            <span className="settings-float-row-value">{value || "-"}</span>
        </div>
    );
}

function ToggleSwitch({ label, description, defaultOn }) {
    const [on, setOn] = useState(defaultOn || false);
    return (
        <div className="settings-float-toggle-row">
            <div className="settings-float-toggle-info">
                <strong>{label}</strong>
                <small>{description}</small>
            </div>
            <button
                className={"toggle-switch" + (on ? " is-on" : "")}
                type="button" role="switch" aria-checked={on}
                onClick={() => setOn(v => !v)}
            />
        </div>
    );
}

function PlaceholderSection({ title }) {
    return (
        <div className="settings-float-card">
            <div className="settings-float-placeholder">
                <p>{title} settings will be available in a future update.</p>
            </div>
        </div>
    );
}

function Section({ id, active, children }) {
    return (
        <div className={"settings-float-section" + (active ? " active" : "")} id={id}>
            {children}
        </div>
    );
}

function TabBtn({ label, tab, active, onClick }) {
    return (
        <button
            className={`settings-float-tab ${active ? "active text-[var(--accent-primary)] font-semibold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#292929]"}`}
            data-settings-tab={tab} onClick={onClick}
        >
            {label}
        </button>
    );
}

export default function SettingsPanel({ isOpen, initialSection, onClose }) {
    const [activeTab, setActiveTab]         = useState("general");
    const [activeSection, setActiveSection] = useState("settingsLanguageTime");
    const [searchQuery, setSearchQuery]     = useState("");
    const [profile, setProfile]   = useState(null);
    const [loading, setLoading]   = useState(false);
    const [pwCurrent, setPwCurrent]   = useState("");
    const [pwNew, setPwNew]           = useState("");
    const [pwConfirm, setPwConfirm]   = useState("");
    const [pwAlert, setPwAlert]       = useState(null);
    const [pwLoading, setPwLoading]   = useState(false);

    // Signature state
    const [signatures, setSignatures] = useState([]);
    const [defaultSigNew, setDefaultSigNew] = useState("");
    const [defaultSigReply, setDefaultSigReply] = useState("");
    const [isSigModalOpen, setIsSigModalOpen] = useState(false);
    const [editingSig, setEditingSig] = useState(null);

    const loadSignatures = () => {
        try {
            const sigs = JSON.parse(localStorage.getItem("userSignatures") || "[]");
            setSignatures(sigs);
            setDefaultSigNew(localStorage.getItem("defaultSignatureNew") || "");
            setDefaultSigReply(localStorage.getItem("defaultSignatureReply") || "");
        } catch (e) {
            setSignatures([]);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = "hidden";
        if (initialSection && SECTION_TO_TAB[initialSection]) {
            setActiveTab(SECTION_TO_TAB[initialSection]);
            // Normalize legacy section IDs
            let targetSection = initialSection;
            if (initialSection === "settingsLanguage") {
                targetSection = "settingsLanguageTime";
            } else if (initialSection === "settingsLayout") {
                targetSection = "settingsMailLayout";
            }
            setActiveSection(targetSection);
        } else {
            setActiveTab("general");
            setActiveSection("settingsLanguageTime");
        }
        fetchProfile();
        loadSignatures();
        return () => { document.body.style.overflow = ""; };
    }, [isOpen, initialSection]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    async function fetchProfile() {
        setLoading(true);
        try {
            const res = await fetch("/api/settings/profile", { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setProfile(data.profile);
            } else if (res.status === 401 || res.status === 404) {
                localStorage.removeItem("currentUser");
                window.location.href = "/signin";
            }
        } catch (e) {
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveSignature = ({ id, name, content, defaultNew, defaultReply }) => {
        let currentSigs = [];
        try {
            currentSigs = JSON.parse(localStorage.getItem("userSignatures") || "[]");
        } catch (e) {}

        const existingIdx = currentSigs.findIndex(s => s.id === id);
        const updatedSig = { id, name, content };
        if (existingIdx >= 0) {
            currentSigs[existingIdx] = updatedSig;
        } else {
            currentSigs.push(updatedSig);
        }
        localStorage.setItem("userSignatures", JSON.stringify(currentSigs));

        if (defaultNew) {
            localStorage.setItem("defaultSignatureNew", id);
        } else if (localStorage.getItem("defaultSignatureNew") === id) {
            localStorage.removeItem("defaultSignatureNew");
        }

        if (defaultReply) {
            localStorage.setItem("defaultSignatureReply", id);
        } else if (localStorage.getItem("defaultSignatureReply") === id) {
            localStorage.removeItem("defaultSignatureReply");
        }

        setIsSigModalOpen(false);
        setEditingSig(null);
        loadSignatures();
    };

    const handleDeleteSignature = (id) => {
        if (!window.confirm("Are you sure you want to delete this signature?")) return;
        try {
            let currentSigs = JSON.parse(localStorage.getItem("userSignatures") || "[]");
            currentSigs = currentSigs.filter(s => s.id !== id);
            localStorage.setItem("userSignatures", JSON.stringify(currentSigs));

            if (localStorage.getItem("defaultSignatureNew") === id) {
                localStorage.removeItem("defaultSignatureNew");
            }
            if (localStorage.getItem("defaultSignatureReply") === id) {
                localStorage.removeItem("defaultSignatureReply");
            }
            loadSignatures();
        } catch (e) {}
    };

    const handleDefaultChange = (type, val) => {
        if (type === "new") {
            setDefaultSigNew(val);
            if (val) localStorage.setItem("defaultSignatureNew", val);
            else localStorage.removeItem("defaultSignatureNew");
        } else {
            setDefaultSigReply(val);
            if (val) localStorage.setItem("defaultSignatureReply", val);
            else localStorage.removeItem("defaultSignatureReply");
        }
    };

    function switchTab(tab) {
        setActiveTab(tab);
        const firstSection = SETTINGS_SUBMENUS[tab]?.[0]?.id;
        if (firstSection) setActiveSection(firstSection);
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        setPwAlert(null);
        if (pwNew !== pwConfirm) { setPwAlert({ msg: "New passwords do not match", type: "error" }); return; }
        if (pwNew.length < 6) { setPwAlert({ msg: "Password must be at least 6 characters", type: "error" }); return; }
        setPwLoading(true);
        try {
            const res = await fetch("/api/settings/password", {
                method: "POST", headers: getHeaders(),
                body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
            });
            const data = await res.json();
            if (res.ok) {
                setPwAlert({ msg: data.message, type: "success" });
                setPwCurrent(""); setPwNew(""); setPwConfirm("");
            } else {
                setPwAlert({ msg: data.error || "Failed to update password", type: "error" });
            }
        } catch (err) {
            setPwAlert({ msg: "Server error occurred", type: "error" });
        } finally {
            setPwLoading(false);
        }
    }

    async function initiateDeleteAccount() {
        if (!window.confirm("WARNING: This will permanently delete your account and all associated data. Are you absolutely sure you want to proceed?")) return;
        const input = window.prompt("Type \"DELETE\" to confirm account deletion:");
        if (input !== "DELETE") {
            if (input !== null) alert("Account deletion cancelled: You didn't type DELETE exactly.");
            return;
        }
        try {
            const res = await fetch("/api/settings/account", { method: "DELETE", headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                alert(data.message || "Account deleted.");
                localStorage.removeItem("currentUser");
                localStorage.removeItem("token");
                window.location.href = "/signin";
            } else {
                alert(data.error || "Failed to delete account.");
            }
        } catch (err) {
            alert("Server error occurred.");
        }
    }

    const allSections = [
        ...SETTINGS_SUBMENUS.account.map(i => ({ ...i, tab: "account" })),
        ...SETTINGS_SUBMENUS.general.map(i => ({ ...i, tab: "general" })),
        ...SETTINGS_SUBMENUS.mail.map(i => ({ ...i, tab: "mail" })),
    ];
    const allSectionsMap = {
        ...Object.fromEntries(allSections.map(s => [s.id, s.label])),
        settingsLanguage: "Language and time",
        settingsLayout: "Layout",
    };

    const isSearching = searchQuery.trim().length > 0;
    const submenuItems = SETTINGS_SUBMENUS[activeTab] || [];
    const displayedItems = isSearching
        ? allSections.filter(i => i.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : submenuItems;

    const activeSectionLabel = allSectionsMap[activeSection] || "Settings";
    const tabHeaderMap = { account: "Account", general: "General", mail: "Mail" };

    const handleSelectSection = (item) => {
        if (item.tab && item.tab !== activeTab) {
            setActiveTab(item.tab);
        }
        setActiveSection(item.id);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="settings-overlay active" id="settingsOverlay" onClick={onClose} />
            <div className="settings-floating-panel active bg-white dark:bg-[#1f1f1f] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-[#333333]" id="settingsFloatingPanel">
                <div className="settings-float-body">

                    {/* LEFT: title + search + tabs */}
                    <div className="settings-float-left bg-slate-50 dark:bg-[#141414] border-r border-slate-200 dark:border-[#2d2d2d]">
                        <h2 className="settings-float-title text-slate-900 dark:text-white">Settings</h2>
                        <div className="settings-float-search">
                            <div className="settings-float-search-wrapper" style={{ position: "relative" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search settings"
                                    className="bg-white dark:bg-[#292929] border border-slate-200 dark:border-[#3d3d3d] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded px-3 py-1.5 w-full text-xs"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && displayedItems.length > 0) {
                                            handleSelectSection(displayedItems[0]);
                                        }
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        style={{
                                            position: "absolute",
                                            right: "8px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: "2px 6px",
                                            color: "#94a3b8",
                                            fontSize: "14px",
                                            lineHeight: 1
                                        }}
                                        title="Clear search"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="settings-float-tabs">
                            <TabBtn label="Account" tab="account" active={activeTab === "account"} onClick={() => { setSearchQuery(""); switchTab("account"); }} />
                            <TabBtn label="General" tab="general" active={activeTab === "general"} onClick={() => { setSearchQuery(""); switchTab("general"); }} />
                            <TabBtn label="Mail"    tab="mail"    active={activeTab === "mail"}    onClick={() => { setSearchQuery(""); switchTab("mail"); }} />
                        </div>
                    </div>

                    {/* MIDDLE: submenu */}
                    <div className="settings-float-submenu-pane bg-slate-100/70 dark:bg-[#1a1a1a] border-r border-slate-200 dark:border-[#2d2d2d]">
                        <div className="settings-float-submenu-header text-slate-900 dark:text-white" id="settingsSubmenuHeader">
                            {isSearching ? `Search Results (${displayedItems.length})` : tabHeaderMap[activeTab]}
                        </div>
                        <div className="settings-float-submenu" id="settingsSubmenu">
                            {displayedItems.length === 0 ? (
                                <div style={{ padding: "16px 20px", color: "#64748b", fontSize: "0.8125rem" }}>
                                    No settings found
                                </div>
                            ) : (
                                displayedItems.map(item => (
                                    <button key={item.id}
                                        className={`settings-float-submenu-item ${activeSection === item.id ? "active text-[var(--accent-primary)] bg-white/80 dark:bg-[#292929] border-l-4 border-[var(--accent-primary)] font-semibold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#292929]"}`}
                                        data-section={item.id}
                                        onClick={() => handleSelectSection(item)}>
                                        {item.label}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT: content pane */}
                    <div className="settings-float-content-pane bg-white dark:bg-[#1f1f1f]">
                        <div className="settings-float-content-top">
                            <h3 className="settings-float-content-title text-slate-900 dark:text-white" id="settingsContentTitle">{activeSectionLabel}</h3>
                            <button className="settings-float-close-btn text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#292929]" onClick={onClose} aria-label="Close settings">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <div className="settings-float-content" id="settingsContentArea">

                            {/* Account Info */}
                            <Section id="settingsAccountInfo" active={activeSection === "settingsAccountInfo"}>
                                <h3 className="settings-float-section-title">Account / User Information</h3>
                                <p className="settings-float-section-desc">Your personal account details.</p>
                                {loading ? <div className="settings-float-card" style={{padding:"1rem",color:"var(--text-secondary)"}}>Loading...</div>
                                : (() => {
                                    const isEmp = profile?.user?.role?.toLowerCase() === 'employee';
                                    const resName = profile?.user?.admin_name || profile?.user?.name || `${profile?.user?.firstName || profile?.user?.first_name || ''} ${profile?.user?.lastName || profile?.user?.last_name || ''}`.trim() || profile?.user?.email;
                                    const wMode = profile?.user?.work_mode || profile?.user?.workMode;
                                    const wLoc = profile?.user?.work_location || profile?.user?.workLocation;
                                    const wDays = profile?.user?.workDays || profile?.user?.work_days;
                                    const daysStr = Array.isArray(wDays) ? wDays.join(', ') : wDays;
                                    return (
                                        <div className="settings-float-card">
                                            <InfoRow label={isEmp ? "Full Name" : "Admin Name"} value={resName} />
                                            <InfoRow label="Email Address" value={profile?.user?.email} />
                                            <InfoRow label="User ID"       value={profile?.user?.id} />
                                            <InfoRow label="Role"          value={profile?.user?.role} />
                                            {profile?.user?.dob && <InfoRow label="Date of Birth" value={profile.user.dob} />}
                                            {wMode && <InfoRow label="Work Mode" value={wMode} />}
                                            {wLoc && <InfoRow label="Work Location" value={wLoc} />}
                                            {wDays && <InfoRow label="Work Days" value={daysStr} />}
                                            {profile?.user?.bio && <InfoRow label="Bio" value={profile.user.bio} />}
                                            <InfoRow label="Status"        value={profile?.user?.status} />
                                            <InfoRow label="Joined Date"   value={profile?.user?.joined_date} />
                                        </div>
                                    );
                                })()}
                            </Section>

                            {/* Automatic replies */}
                            <Section id="settingsAutomaticReplies" active={activeSection === "settingsAutomaticReplies"}>
                                <AutomaticRepliesSection />
                            </Section>

                            {/* Signatures */}
                            <Section id="settingsSignatures" active={activeSection === "settingsSignatures"}>
                                <h3 className="settings-float-section-title">Signatures</h3>
                                <p className="settings-float-section-desc" style={{marginBottom:"24px"}}>
                                    You can add and modify signatures that can be added to your emails.
                                    You can also choose which signature to add by default to your new emails and replies.
                                </p>
                                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"20px"}}>
                                    <button type="button" className="btn btn-primary"
                                        style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 12px",fontWeight:500}}
                                        onClick={() => { setEditingSig(null); setIsSigModalOpen(true); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                        </svg>
                                        Add signature
                                    </button>
                                </div>
                                <div style={{display:"flex",gap:"24px",marginBottom:"24px"}}>
                                    <div style={{flex:1}}>
                                        <label style={{display:"block",fontSize:"13px",marginBottom:"6px",fontWeight:500,color:"var(--text-primary)"}}>Default for new messages</label>
                                        <select
                                            value={defaultSigNew}
                                            onChange={(e) => handleDefaultChange("new", e.target.value)}
                                            style={{width:"100%",padding:"8px",border:"1px solid var(--border-light)",borderRadius:"4px",background:"var(--surface)",color:"var(--text-primary)"}}
                                        >
                                            <option value="">No signature</option>
                                            {signatures.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{flex:1}}>
                                        <label style={{display:"block",fontSize:"13px",marginBottom:"6px",fontWeight:500,color:"var(--text-primary)"}}>Default for replies and forwards</label>
                                        <select
                                            value={defaultSigReply}
                                            onChange={(e) => handleDefaultChange("reply", e.target.value)}
                                            style={{width:"100%",padding:"8px",border:"1px solid var(--border-light)",borderRadius:"4px",background:"var(--surface)",color:"var(--text-primary)"}}
                                        >
                                            <option value="">No signature</option>
                                            {signatures.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {signatures.length === 0 ? (
                                    <div className="settings-float-card" style={{minHeight:"160px",display:"flex",flexDirection:"column",justifyContent:"center",background:"var(--surface)"}}>
                                        <div style={{padding:"30px",textAlign:"center",color:"var(--text-secondary)"}}>
                                            <div style={{marginBottom:"6px",fontWeight:600,fontSize:"14px",color:"var(--text-primary)"}}>No signature yet</div>
                                            <div style={{fontSize:"13px"}}>Create your first signature.</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="settings-float-card" style={{display:"flex",flexDirection:"column",background:"var(--surface)",padding:0,overflow:"hidden"}}>
                                        {signatures.map((s, index) => {
                                            const plainText = (s.content || "").replace(/<[^>]*>?/gm, " ").trim();
                                            return (
                                                <div
                                                    key={s.id}
                                                    style={{
                                                        padding: "14px 18px",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        borderBottom: index < signatures.length - 1 ? "1px solid var(--border-light)" : "none"
                                                    }}
                                                >
                                                    <div style={{maxWidth:"70%"}}>
                                                        <div style={{fontWeight:600,fontSize:"14px",color:"var(--text-primary)",marginBottom:"4px"}}>
                                                            {s.name}
                                                        </div>
                                                        <div style={{fontSize:"12px",color:"var(--text-secondary)",maxHeight:"20px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                                            {plainText || "No text"}
                                                        </div>
                                                    </div>
                                                    <div style={{display:"flex",gap:"8px"}}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline"
                                                            onClick={() => { setEditingSig(s); setIsSigModalOpen(true); }}
                                                            style={{padding:"4px 10px",fontSize:"12px",borderRadius:"4px"}}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline"
                                                            onClick={() => handleDeleteSignature(s.id)}
                                                            style={{padding:"4px 10px",fontSize:"12px",borderRadius:"4px",color:"var(--danger, #DC2626)",borderColor:"rgba(220,38,38,0.3)"}}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Section>

                            {/* Categories */}
                            <Section id="settingsCategories" active={activeSection === "settingsCategories"}>
                                <CategoriesSection />
                            </Section>

                            {/* Storage */}
                            <Section id="settingsStorage" active={activeSection === "settingsStorage"}>
                                <StorageSection />
                            </Section>

                            {/* Organization Info */}
                            <Section id="settingsOrgInfo" active={activeSection === "settingsOrgInfo"}>
                                <h3 className="settings-float-section-title">Organization Information</h3>
                                <p className="settings-float-section-desc">Details about your organization.</p>
                                {loading ? <div className="settings-float-card" style={{padding:"1rem",color:"var(--text-secondary)"}}>Loading...</div>
                                : <div className="settings-float-card">
                                    <InfoRow label="Organization Name" value={profile?.organization?.organization_name} />
                                    <InfoRow label="Organization ID"   value={profile?.organization?.id} />
                                    <InfoRow label="Organization Size" value={profile?.organization?.organization_size} />
                                    <InfoRow label="Backup Email"      value={profile?.organization?.backup_email || "N/A"} />
                                    <InfoRow label="Joined Date"       value={profile?.organization?.joined_date} />
                                </div>}
                            </Section>

                            {/* Signup Details */}
                            <Section id="settingsSignupDetails" active={activeSection === "settingsSignupDetails"}>
                                <h3 className="settings-float-section-title">Signup Details</h3>
                                <p className="settings-float-section-desc">All details collected during account registration.</p>
                                {loading ? <div className="settings-float-card" style={{padding:"1rem",color:"var(--text-secondary)"}}>Loading...</div>
                                : (() => {
                                    const isEmp = profile?.user?.role?.toLowerCase() === 'employee';
                                    const resName = profile?.user?.admin_name || profile?.user?.name || `${profile?.user?.firstName || profile?.user?.first_name || ''} ${profile?.user?.lastName || profile?.user?.last_name || ''}`.trim() || profile?.user?.email;
                                    const wMode = profile?.user?.work_mode || profile?.user?.workMode;
                                    const wLoc = profile?.user?.work_location || profile?.user?.workLocation;
                                    const wDays = profile?.user?.workDays || profile?.user?.work_days;
                                    const daysStr = Array.isArray(wDays) ? wDays.join(', ') : wDays;
                                    return (
                                        <div className="settings-float-card">
                                            <InfoRow label="Organization Name" value={profile?.organization?.organization_name} />
                                            <InfoRow label={isEmp ? "Full Name" : "Admin Name"} value={resName} />
                                            <InfoRow label="Email Address"     value={profile?.user?.email} />
                                            {profile?.user?.dob && <InfoRow label="Date of Birth" value={profile.user.dob} />}
                                            {wMode && <InfoRow label="Work Mode" value={wMode} />}
                                            {wLoc && <InfoRow label="Work Location" value={wLoc} />}
                                            {wDays && <InfoRow label="Work Days" value={daysStr} />}
                                            {profile?.user?.bio && <InfoRow label="Bio" value={profile.user.bio} />}
                                            <InfoRow label="Organization Size" value={profile?.organization?.organization_size} />
                                            <InfoRow label="Backup Email"      value={profile?.organization?.backup_email || "Not provided"} />
                                            <InfoRow label="Marketing Opt-in"  value={profile?.user?.marketing_opt_in ? "Yes" : "No"} />
                                            <InfoRow label="Terms Accepted"    value={profile?.user?.terms_accepted ? "Yes" : "No"} />
                                            <InfoRow label="Account Created"   value={profile?.user?.joined_date} />
                                        </div>
                                    );
                                })()}
                            </Section>

                            {/* Account Settings */}
                            <Section id="settingsAccountSettings" active={activeSection === "settingsAccountSettings"}>
                                <h3 className="settings-float-section-title">Account Settings</h3>
                                <p className="settings-float-section-desc">Manage notifications and security preferences.</p>
                                <div className="settings-float-card">
                                    <ToggleSwitch label="Email Notifications" defaultOn={true}
                                        description="Receive an email when new team members are added or permissions change." />
                                    <ToggleSwitch label="Marketing Communications" defaultOn={false}
                                        description="Receive product updates, newsletters, and promotional content." />
                                    <ToggleSwitch label="Two-Factor Authentication (2FA)" defaultOn={false}
                                        description="Add an extra layer of security to your account." />
                                </div>
                            </Section>

                            {/* Security / Password */}
                            <Section id="settingsPassword" active={activeSection === "settingsPassword"}>
                                <h3 className="settings-float-section-title">Security / Change Password</h3>
                                <p className="settings-float-section-desc">Update your account password.</p>
                                <div className="settings-float-card">
                                    {pwAlert && (
                                        <div className={"alert-box " + pwAlert.type} style={{display:"block",marginBottom:"1rem"}}>
                                            {pwAlert.msg}
                                        </div>
                                    )}
                                    <form id="changePasswordForm" onSubmit={handleChangePassword}>
                                        <div className="settings-float-form-row">
                                            <label htmlFor="currentPassword">Current Password</label>
                                            <input type="password" id="currentPassword" required value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} />
                                        </div>
                                        <div className="settings-float-form-row">
                                            <label htmlFor="newPassword">New Password</label>
                                            <input type="password" id="newPassword" required value={pwNew} onChange={e => setPwNew(e.target.value)} />
                                        </div>
                                        <div className="settings-float-form-row">
                                            <label htmlFor="confirmPassword">Confirm New Password</label>
                                            <input type="password" id="confirmPassword" required value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
                                        </div>
                                        <button type="submit" className="btn-modal btn-modal-proceed" style={{marginTop:"0.5rem"}} disabled={pwLoading}>
                                            {pwLoading ? "Updating..." : "Update Password"}
                                        </button>
                                    </form>
                                </div>
                            </Section>

                            {/* Live Sync */}
                            <Section id="settingsLiveSync" active={activeSection === "settingsLiveSync"}>
                                <h3 className="settings-float-section-title">Live Sync</h3>
                                <p className="settings-float-section-desc">Keep your mailbox in sync across devices.</p>
                                <PlaceholderSection title="Live Sync" />
                            </Section>

                            {/* Danger Zone */}
                            <Section id="settingsDangerZone" active={activeSection === "settingsDangerZone"}>
                                <h3 className="settings-float-section-title" style={{color:"#DC2626"}}>Danger Zone</h3>
                                <p className="settings-float-section-desc">Irreversible and destructive actions.</p>
                                <div className="settings-float-card settings-float-danger">
                                    <h4>Delete Account</h4>
                                    <p style={{color:"#991B1B",fontSize:"0.8125rem",margin:"0 0 16px"}}>
                                        Permanently delete your account and all associated data. This action cannot be undone.
                                    </p>
                                    <button type="button" className="btn btn-danger"
                                        style={{backgroundColor:"#DC2626",color:"white",border:"none",padding:"0.6rem 1.25rem",borderRadius:"6px",fontWeight:600,cursor:"pointer",fontSize:"0.8125rem"}}
                                        onClick={initiateDeleteAccount}>
                                        Delete Account
                                    </button>
                                </div>
                            </Section>

                            {/* =========================================================================
                                GENERAL TAB SECTIONS (Outlook 365 Architecture)
                                ========================================================================= */}

                            {/* 1. Language and time (Milestone 2) */}
                            <Section id="settingsLanguageTime" active={activeSection === "settingsLanguageTime" || activeSection === "settingsLanguage"}>
                                <h3 className="settings-float-section-title">Language and time</h3>
                                <LanguageTimeSection />
                            </Section>

                            {/* 2. Appearance */}
                            <Section id="settingsAppearance" active={activeSection === "settingsAppearance"}>
                                <h3 className="settings-float-section-title">Appearance</h3>
                                <AppearanceSection />
                            </Section>

                            {/* 3. Notifications */}
                            <Section id="settingsNotifications" active={activeSection === "settingsNotifications"}>
                                <h3 className="settings-float-section-title">Notifications</h3>
                                <NotificationsSection />
                            </Section>

                            {/* 4. Accessibility */}
                            <Section id="settingsAccessibility" active={activeSection === "settingsAccessibility"}>
                                <h3 className="settings-float-section-title">Accessibility</h3>
                                <AccessibilitySection />
                            </Section>

                            {/* 5. Privacy and data */}
                            <Section id="settingsPrivacyData" active={activeSection === "settingsPrivacyData"}>
                                <h3 className="settings-float-section-title">Privacy and data</h3>
                                <PrivacyDataSection />
                            </Section>

                            {/* 6. Search */}
                            <Section id="settingsSearch" active={activeSection === "settingsSearch"}>
                                <h3 className="settings-float-section-title">Search</h3>
                                <SearchSection />
                            </Section>

                            {/* =========================================================================
                                MAIL TAB SECTIONS
                                ========================================================================= */}

                            {/* Relocated Mail Layout */}
                            <Section id="settingsMailLayout" active={activeSection === "settingsMailLayout" || activeSection === "settingsLayout"}>
                                <h3 className="settings-float-section-title">Layout</h3>
                                <p className="settings-float-section-desc">Customize reading pane and email list layout preferences.</p>
                                <PlaceholderSection title="Layout" />
                            </Section>

                            {/* Mail Compose */}
                            <Section id="settingsCompose" active={activeSection === "settingsCompose"}>
                                <h3 className="settings-float-section-title">Compose</h3>
                                <p className="settings-float-section-desc">Email composition preferences.</p>
                                <PlaceholderSection title="Compose" />
                            </Section>

                            {/* Smart Suggestions */}
                            <Section id="settingsSmartSuggestions" active={activeSection === "settingsSmartSuggestions"}>
                                <h3 className="settings-float-section-title">Smart Suggestions</h3>
                                <p className="settings-float-section-desc">AI-powered email suggestions.</p>
                                <PlaceholderSection title="Smart Suggestions" />
                            </Section>

                            {/* Rules */}
                            <Section id="settingsRules" active={activeSection === "settingsRules"}>
                                <h3 className="settings-float-section-title">Rules</h3>
                                <p className="settings-float-section-desc">Email filtering and automation rules.</p>
                                <PlaceholderSection title="Rules" />
                            </Section>

                        </div>
                    </div>

                </div>
            </div>

            {/* Signature Editor Modal */}
            <SignatureEditorModal
                isOpen={isSigModalOpen}
                signature={editingSig}
                onClose={() => { setIsSigModalOpen(false); setEditingSig(null); }}
                onSave={handleSaveSignature}
            />
        </>
    );
}
