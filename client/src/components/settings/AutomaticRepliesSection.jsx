import React, { useState, useEffect, useRef } from "react";

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
        const period = h < 12 ? "AM" : "PM";
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const displayM = m === 0 ? "00" : "30";
        TIME_OPTIONS.push(`${displayH}:${displayM} ${period}`);
    }
}

function getTodayString(offsetDays = 0) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseDateTime(dateStr, timeStr) {
    if (!dateStr) return null;
    let y, m, d;
    if (dateStr.includes("-")) {
        const parts = dateStr.split("-").map(Number);
        if (parts.length < 3) return null;
        [y, m, d] = parts;
    } else if (dateStr.includes("/")) {
        const parts = dateStr.split("/").map(Number);
        if (parts.length < 3) return null;
        [m, d, y] = parts;
    } else {
        return null;
    }
    let hours = 0;
    let minutes = 0;
    if (timeStr) {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
            let h = parseInt(match[1], 10);
            const min = parseInt(match[2], 10);
            const ampm = match[3].toUpperCase();
            if (ampm === "PM" && h < 12) h += 12;
            if (ampm === "AM" && h === 12) h = 0;
            hours = h;
            minutes = min;
        }
    }
    return new Date(y, m - 1, d, hours, minutes);
}

function getHeaders() {
    const userStr = localStorage.getItem("currentUser");
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            headers["X-User-Id"] = user.id;
            headers["X-Org-Id"] = user.organization_id || "1";
            if (user.email) headers["X-Active-Email"] = String(user.email).trim();
        } catch (e) {}
    }
    return headers;
}

export default function AutomaticRepliesSection() {
    const [enabled, setEnabled] = useState(false);
    const [sendDuringPeriod, setSendDuringPeriod] = useState(false);
    const [startDate, setStartDate] = useState(getTodayString(0));
    const [startTime, setStartTime] = useState("9:00 AM");
    const [endDate, setEndDate] = useState(getTodayString(1));
    const [endTime, setEndTime] = useState("5:00 PM");
    const [onlyContacts, setOnlyContacts] = useState(false);
    const [messageHtml, setMessageHtml] = useState("<p>I am currently out of the office and will reply upon my return.</p>");
    const [toast, setToast] = useState(null);
    const [savedSnapshot, setSavedSnapshot] = useState(null);

    const editorRef = useRef(null);
    const startDateInputRef = useRef(null);
    const endDateInputRef = useRef(null);

    // Load initial state from localStorage or API
    useEffect(() => {
        let loaded = false;
        try {
            const local = localStorage.getItem("userAutomaticReplies");
            if (local) {
                const data = JSON.parse(local);
                applyState(data);
                setSavedSnapshot(data);
                loaded = true;
            }
        } catch (e) {}

        // Fetch from API to sync
        fetch("/api/settings/automatic-replies", { headers: getHeaders() })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.automaticReplies) {
                    applyState(data.automaticReplies);
                    setSavedSnapshot(data.automaticReplies);
                    try {
                        localStorage.setItem("userAutomaticReplies", JSON.stringify(data.automaticReplies));
                    } catch (e) {}
                } else if (!loaded) {
                    const defaultState = {
                        enabled: false,
                        sendDuringPeriod: false,
                        startDate: getTodayString(0),
                        startTime: "9:00 AM",
                        endDate: getTodayString(1),
                        endTime: "5:00 PM",
                        onlyContacts: false,
                        messageHtml: "<p>I am currently out of the office and will reply upon my return.</p>"
                    };
                    setSavedSnapshot(defaultState);
                    if (editorRef.current) {
                        editorRef.current.innerHTML = defaultState.messageHtml;
                    }
                }
            })
            .catch(() => {});
    }, []);

    const applyState = (data) => {
        if (!data) return;
        if (data.enabled !== undefined) setEnabled(Boolean(data.enabled));
        if (data.sendDuringPeriod !== undefined) setSendDuringPeriod(Boolean(data.sendDuringPeriod));
        if (data.startDate) setStartDate(data.startDate);
        if (data.startTime) setStartTime(data.startTime);
        if (data.endDate) setEndDate(data.endDate);
        if (data.endTime) setEndTime(data.endTime);
        if (data.onlyContacts !== undefined) setOnlyContacts(Boolean(data.onlyContacts));
        if (data.messageHtml !== undefined) {
            setMessageHtml(data.messageHtml);
            if (editorRef.current) {
                editorRef.current.innerHTML = data.messageHtml;
            }
        }
    };

    // Validation
    const startDt = parseDateTime(startDate, startTime);
    const endDt = parseDateTime(endDate, endTime);
    const isTimeInvalid = Boolean(sendDuringPeriod && startDt && endDt && endDt <= startDt);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleFormat = (command, value = null) => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
        document.execCommand(command, false, value);
    };

    const handleSave = async () => {
        if (enabled && sendDuringPeriod && isTimeInvalid) {
            showToast("End time must be after the start time.", "error");
            return;
        }

        const editorContent = editorRef.current ? editorRef.current.innerHTML : messageHtml;

        const payload = {
            enabled,
            sendDuringPeriod,
            startDate,
            startTime,
            endDate,
            endTime,
            onlyContacts,
            messageHtml: editorContent,
            updatedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem("userAutomaticReplies", JSON.stringify(payload));
        } catch (e) {}

        try {
            await fetch("/api/settings/automatic-replies", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
        } catch (e) {}

        setSavedSnapshot(payload);
        showToast("Automatic replies saved successfully", "success");
    };

    const handleDiscard = () => {
        if (savedSnapshot) {
            applyState(savedSnapshot);
        } else {
            setEnabled(false);
            setSendDuringPeriod(false);
            setStartDate(getTodayString(0));
            setStartTime("9:00 AM");
            setEndDate(getTodayString(1));
            setEndTime("5:00 PM");
            setOnlyContacts(false);
            setMessageHtml("<p>I am currently out of the office and will reply upon my return.</p>");
            if (editorRef.current) {
                editorRef.current.innerHTML = "<p>I am currently out of the office and will reply upon my return.</p>";
            }
        }
        showToast("Changes discarded", "info");
    };

    return (
        <div style={{ maxWidth: "780px", color: "#1e293b", fontFamily: "inherit" }}>
            {/* Header & Subtitle */}
            <div style={{ marginBottom: "20px" }}>
                <h3 className="text-xl font-semibold text-slate-900" style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", margin: "0 0 6px" }}>
                    Automatic replies
                </h3>
                <p className="text-sm text-slate-600 mt-2" style={{ fontSize: "0.875rem", color: "#475569", margin: 0, lineHeight: 1.5 }}>
                    Turn on automatic replies to let people know you're away.
                </p>
            </div>

            {/* Notification Toast Banner */}
            {toast && (
                <div style={{
                    padding: "10px 16px",
                    borderRadius: "6px",
                    marginBottom: "18px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: toast.type === "error" ? "#fef2f2" : (toast.type === "info" ? "#f1f5f9" : "#f0fdf4"),
                    color: toast.type === "error" ? "#991b1b" : (toast.type === "info" ? "#334155" : "#166534"),
                    border: `1px solid ${toast.type === "error" ? "#fecaca" : (toast.type === "info" ? "#cbd5e1" : "#bbf7d0")}`
                }}>
                    <span>{toast.type === "error" ? "⚠️" : (toast.type === "info" ? "ℹ️" : "✓")}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* Primary Toggle Switch */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 0 16px",
                borderBottom: "1px solid #e2e8f0"
            }}>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    className={"toggle-switch" + (enabled ? " is-on" : "")}
                    onClick={() => setEnabled(v => !v)}
                    style={{
                        cursor: "pointer",
                        outline: "none"
                    }}
                />
                <div>
                    <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a" }}>
                        Automatic replies {enabled ? "on" : "off"}
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                        {enabled ? "Automatic replies are currently turned on" : "Automatic replies are turned off"}
                    </div>
                </div>
            </div>

            {/* Sub-controls Container: dimmed & non-interactive when toggle is OFF */}
            <div style={{
                marginTop: "20px",
                opacity: enabled ? 1 : 0.45,
                pointerEvents: enabled ? "auto" : "none",
                transition: "opacity 0.2s ease"
            }}>
                {/* Checkbox 1: Send replies only during a time period */}
                <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, color: "#1e293b" }}>
                        <input
                            type="checkbox"
                            checked={sendDuringPeriod}
                            onChange={(e) => setSendDuringPeriod(e.target.checked)}
                            style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0078d4" }}
                        />
                        <span>Send replies only during a time period</span>
                    </label>
                </div>

                {/* Scheduling controls: Start & End */}
                <div style={{
                    marginLeft: "26px",
                    marginBottom: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    opacity: sendDuringPeriod ? 1 : 0.5,
                    pointerEvents: sendDuringPeriod ? "auto" : "none"
                }}>
                    {/* Start Row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ width: "45px", fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}>Start</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                                <input
                                    ref={startDateInputRef}
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{
                                        padding: "6px 32px 6px 10px",
                                        fontSize: "0.875rem",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "4px",
                                        background: "#ffffff",
                                        color: "#0f172a",
                                        outline: "none"
                                    }}
                                />
                                <button
                                    type="button"
                                    title="Pick start date"
                                    onClick={() => {
                                        try { startDateInputRef.current?.showPicker(); } catch (err) { startDateInputRef.current?.focus(); }
                                    }}
                                    style={{
                                        position: "absolute",
                                        right: "6px",
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "#0078d4",
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "2px"
                                    }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                </button>
                            </div>
                            <select
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                style={{
                                    padding: "6px 10px",
                                    fontSize: "0.875rem",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    outline: "none",
                                    minWidth: "115px"
                                }}
                            >
                                {TIME_OPTIONS.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* End Row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ width: "45px", fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}>End</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                                <input
                                    ref={endDateInputRef}
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{
                                        padding: "6px 32px 6px 10px",
                                        fontSize: "0.875rem",
                                        border: `1px solid ${isTimeInvalid ? "#ef4444" : "#cbd5e1"}`,
                                        borderRadius: "4px",
                                        background: "#ffffff",
                                        color: "#0f172a",
                                        outline: "none"
                                    }}
                                />
                                <button
                                    type="button"
                                    title="Pick end date"
                                    onClick={() => {
                                        try { endDateInputRef.current?.showPicker(); } catch (err) { endDateInputRef.current?.focus(); }
                                    }}
                                    style={{
                                        position: "absolute",
                                        right: "6px",
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        color: isTimeInvalid ? "#ef4444" : "#0078d4",
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "2px"
                                    }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                </button>
                            </div>
                            <select
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                style={{
                                    padding: "6px 10px",
                                    fontSize: "0.875rem",
                                    border: `1px solid ${isTimeInvalid ? "#ef4444" : "#cbd5e1"}`,
                                    borderRadius: "4px",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    outline: "none",
                                    minWidth: "115px"
                                }}
                            >
                                {TIME_OPTIONS.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Validation Warning */}
                    {isTimeInvalid && (
                        <div style={{ color: "#dc2626", fontSize: "0.8125rem", marginTop: "2px", fontWeight: 500 }}>
                            ⚠️ The end time must occur after the start time.
                        </div>
                    )}
                </div>

                {/* Checkbox 2: Send replies only to contacts */}
                <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, color: "#1e293b" }}>
                        <input
                            type="checkbox"
                            checked={onlyContacts}
                            onChange={(e) => setOnlyContacts(e.target.checked)}
                            style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0078d4" }}
                        />
                        <span>Send replies only to contacts</span>
                    </label>
                </div>

                {/* Rich Text Editor for Auto-Reply Message */}
                <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#334155", marginBottom: "8px" }}>
                        Send a reply once to each sender with the following message:
                    </label>

                    {/* Outlook-Style Formatting Toolbar */}
                    <div style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px 6px 0 0",
                        background: "#f8fafc",
                        padding: "6px 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        flexWrap: "wrap",
                        borderBottom: "1px solid #e2e8f0"
                    }}>
                        <button
                            type="button"
                            title="Bold (Ctrl+B)"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("bold")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", fontWeight: "bold", fontSize: "14px", color: "#1e293b" }}>
                            B
                        </button>
                        <button
                            type="button"
                            title="Italic (Ctrl+I)"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("italic")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", fontStyle: "italic", fontSize: "14px", color: "#1e293b" }}>
                            I
                        </button>
                        <button
                            type="button"
                            title="Underline (Ctrl+U)"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("underline")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", textDecoration: "underline", fontSize: "14px", color: "#1e293b" }}>
                            U
                        </button>
                        <button
                            type="button"
                            title="Strikethrough"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("strikeThrough")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", textDecoration: "line-through", fontSize: "14px", color: "#1e293b" }}>
                            S
                        </button>

                        <div style={{ width: "1px", height: "18px", background: "#cbd5e1", margin: "0 4px" }} />

                        <button
                            type="button"
                            title="Bullet List"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("insertUnorderedList")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#1e293b" }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                        </button>
                        <button
                            type="button"
                            title="Numbered List"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("insertOrderedList")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#1e293b", fontSize: "12px", fontWeight: "bold" }}>
                            1.
                        </button>

                        <div style={{ width: "1px", height: "18px", background: "#cbd5e1", margin: "0 4px" }} />

                        <button
                            type="button"
                            title="Align Left"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("justifyLeft")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#1e293b" }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
                        </button>
                        <button
                            type="button"
                            title="Align Center"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("justifyCenter")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#1e293b" }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>
                        </button>
                        <button
                            type="button"
                            title="Align Right"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("justifyRight")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#1e293b" }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
                        </button>

                        <div style={{ width: "1px", height: "18px", background: "#cbd5e1", margin: "0 4px" }} />

                        <button
                            type="button"
                            title="Clear Formatting"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormat("removeFormat")}
                            style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#64748b", fontSize: "11px", fontWeight: "bold" }}>
                            Tx
                        </button>
                    </div>

                    {/* Rich Text Editable Area */}
                    <div
                        ref={editorRef}
                        contentEditable={enabled}
                        onBlur={(e) => setMessageHtml(e.currentTarget.innerHTML)}
                        style={{
                            minHeight: "160px",
                            padding: "14px",
                            border: "1px solid #cbd5e1",
                            borderTop: "none",
                            borderRadius: "0 0 6px 6px",
                            background: "#ffffff",
                            color: "#0f172a",
                            fontSize: "0.875rem",
                            lineHeight: 1.6,
                            outline: "none",
                            cursor: enabled ? "text" : "not-allowed",
                            overflowY: "auto"
                        }}
                    />
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                paddingTop: "16px",
                borderTop: "1px solid #e2e8f0"
            }}>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={enabled && sendDuringPeriod && isTimeInvalid}
                    style={{
                        padding: "7px 22px",
                        background: "#0078d4",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        cursor: (enabled && sendDuringPeriod && isTimeInvalid) ? "not-allowed" : "pointer",
                        opacity: (enabled && sendDuringPeriod && isTimeInvalid) ? 0.6 : 1,
                        transition: "background 0.15s ease",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                    }}
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#0067b8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#0078d4"; }}
                >
                    Save
                </button>
                <button
                    type="button"
                    onClick={handleDiscard}
                    style={{
                        padding: "7px 18px",
                        background: "#ffffff",
                        color: "#334155",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "background 0.15s ease"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                >
                    Discard
                </button>
            </div>
        </div>
    );
}
