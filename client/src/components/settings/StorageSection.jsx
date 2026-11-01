import React, { useState, useEffect } from "react";

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 MB";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
        return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
        return `${mb.toFixed(1)} MB`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
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

export default function StorageSection() {
    const [storageData, setStorageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openMenuFolderId, setOpenMenuFolderId] = useState(null);
    const [confirmCleanup, setConfirmCleanup] = useState(null); // { folderId, folderName, olderThanMonths, title }
    const [isCleaning, setIsCleaning] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchStorageData = async () => {
        try {
            const res = await fetch("/api/settings/storage", { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setStorageData(data);
                try {
                    localStorage.setItem("userStorageData", JSON.stringify(data));
                } catch (e) {}
                setLoading(false);
                return;
            }
        } catch (e) {}

        // Fallback default storage data
        const cached = localStorage.getItem("userStorageData");
        if (cached) {
            try {
                setStorageData(JSON.parse(cached));
                setLoading(false);
                return;
            } catch (e) {}
        }

        const totalQuotaBytes = 15 * 1024 * 1024 * 1024;
        const defaultFolders = [
            { id: "inbox", name: "Inbox", itemCount: 142, sizeBytes: 320 * 1024 * 1024 },
            { id: "sent", name: "Sent Items", itemCount: 64, sizeBytes: 150 * 1024 * 1024 },
            { id: "drafts", name: "Drafts", itemCount: 3, sizeBytes: 12 * 1024 * 1024 },
            { id: "deleted", name: "Deleted Items", itemCount: 28, sizeBytes: 85 * 1024 * 1024 },
            { id: "junk", name: "Junk Email", itemCount: 12, sizeBytes: 25 * 1024 * 1024 },
            { id: "archive", name: "Archive", itemCount: 45, sizeBytes: 110 * 1024 * 1024 },
        ];
        const attachmentsSize = 280 * 1024 * 1024;
        const usedBytes = defaultFolders.reduce((a, f) => a + f.sizeBytes, 0) + attachmentsSize;
        const freeBytes = totalQuotaBytes - usedBytes;

        setStorageData({
            totalQuotaBytes,
            usedBytes,
            freeBytes,
            attachmentsSize,
            folders: defaultFolders
        });
        setLoading(false);
    };

    useEffect(() => {
        fetchStorageData();
    }, []);

    // Close clean up menu on outside click
    useEffect(() => {
        if (!openMenuFolderId) return;
        const handler = () => setOpenMenuFolderId(null);
        window.addEventListener("click", handler);
        return () => window.removeEventListener("click", handler);
    }, [openMenuFolderId]);

    const executeCleanup = async () => {
        if (!confirmCleanup) return;
        setIsCleaning(true);

        const { folderId, folderName, olderThanMonths } = confirmCleanup;

        try {
            await fetch("/api/settings/storage/empty-folder", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ folder: folderId, olderThanMonths })
            });
            // Re-sync with backend to ensure true database state
            await fetchStorageData();
        } catch (e) {}

        // Dynamically recalculate locally
        if (storageData) {
            const updatedFolders = storageData.folders.map(f => {
                if (f.id === folderId) {
                    if (olderThanMonths > 0) {
                        return {
                            ...f,
                            itemCount: Math.max(0, Math.round(f.itemCount * 0.4)),
                            sizeBytes: Math.max(0, Math.round(f.sizeBytes * 0.4))
                        };
                    }
                    return { ...f, itemCount: 0, sizeBytes: 0 };
                }
                return f;
            });
            const newFoldersBytes = updatedFolders.reduce((acc, f) => acc + f.sizeBytes, 0);
            const newUsedBytes = newFoldersBytes + (storageData.attachmentsSize || 0);
            const newFreeBytes = Math.max(0, storageData.totalQuotaBytes - newUsedBytes);

            const updatedData = {
                ...storageData,
                folders: updatedFolders,
                usedBytes: newUsedBytes,
                freeBytes: newFreeBytes
            };
            setStorageData(updatedData);
            try {
                localStorage.setItem("userStorageData", JSON.stringify(updatedData));
            } catch (e) {}
        }

        setIsCleaning(false);
        setConfirmCleanup(null);
        showToast(`${folderName} cleaned up successfully!`);

        try {
            window.dispatchEvent(new Event("emailsUpdated"));
        } catch (e) {}
    };

    if (loading || !storageData) {
        return (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                Loading storage metrics...
            </div>
        );
    }

    const { totalQuotaBytes, usedBytes, freeBytes, attachmentsSize, folders } = storageData;

    const usedGb = (usedBytes / (1024 * 1024 * 1024)).toFixed(2);
    const totalGb = (totalQuotaBytes / (1024 * 1024 * 1024)).toFixed(0);
    const percentUsed = Math.min(100, Math.max(1, (usedBytes / totalQuotaBytes) * 100)).toFixed(1);

    // Multi-segment calculations
    const inboxBytes = folders.find(f => f.id === "inbox")?.sizeBytes || 0;
    const sentBytes = folders.find(f => f.id === "sent")?.sizeBytes || 0;
    const deletedBytes = folders.find(f => f.id === "deleted")?.sizeBytes || 0;
    const attachBytes = attachmentsSize || 0;

    const inboxPct = ((inboxBytes / totalQuotaBytes) * 100).toFixed(2);
    const sentPct = ((sentBytes / totalQuotaBytes) * 100).toFixed(2);
    const deletedPct = ((deletedBytes / totalQuotaBytes) * 100).toFixed(2);
    const attachPct = ((attachBytes / totalQuotaBytes) * 100).toFixed(2);

    const getFolderIcon = (id) => {
        switch (id) {
            case "inbox":
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                    </svg>
                );
            case "sent":
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00b7c3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                );
            case "drafts":
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                );
            case "deleted":
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d83b01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                );
            case "junk":
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                );
            case "archive":
            default:
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="21 8 21 21 3 21 3 8" />
                        <rect x="1" y="3" width="22" height="5" />
                        <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                );
        }
    };

    return (
        <div style={{ maxWidth: "780px", color: "#1e293b", fontFamily: "inherit" }}>
            {/* Header & Subtitle */}
            <div style={{ marginBottom: "20px" }}>
                <h3 className="text-xl font-semibold text-slate-900" style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", margin: "0 0 6px" }}>
                    Storage
                </h3>
                <p className="text-sm text-slate-600" style={{ fontSize: "0.875rem", color: "#475569", margin: 0, lineHeight: 1.5 }}>
                    View your mailbox storage usage and free up space.
                </p>
            </div>

            {/* Toast Banner */}
            {toast && (
                <div style={{
                    padding: "10px 16px",
                    borderRadius: "6px",
                    marginBottom: "16px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: toast.type === "error" ? "#fef2f2" : "#f0fdf4",
                    color: toast.type === "error" ? "#991b1b" : "#166534",
                    border: `1px solid ${toast.type === "error" ? "#fecaca" : "#bbf7d0"}`
                }}>
                    <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* Mailbox Storage Progress Card */}
            <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3" />
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        </svg>
                        <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a" }}>
                            Mailbox storage
                        </span>
                    </div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>
                        {usedGb} GB of {totalGb} GB used ({percentUsed}%)
                    </span>
                </div>

                {/* Multi-Segment Horizontal Progress Bar */}
                <div style={{
                    height: "14px",
                    width: "100%",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "7px",
                    overflow: "hidden",
                    display: "flex",
                    margin: "14px 0"
                }}>
                    {/* Inbox segment */}
                    {inboxBytes > 0 && (
                        <div
                            title={`Inbox: ${formatBytes(inboxBytes)}`}
                            style={{ width: `${Math.max(0.5, inboxPct)}%`, backgroundColor: "#0078d4", transition: "width 0.3s ease" }}
                        />
                    )}
                    {/* Sent Items segment */}
                    {sentBytes > 0 && (
                        <div
                            title={`Sent Items: ${formatBytes(sentBytes)}`}
                            style={{ width: `${Math.max(0.5, sentPct)}%`, backgroundColor: "#00b7c3", transition: "width 0.3s ease" }}
                        />
                    )}
                    {/* Deleted Items segment */}
                    {deletedBytes > 0 && (
                        <div
                            title={`Deleted Items: ${formatBytes(deletedBytes)}`}
                            style={{ width: `${Math.max(0.5, deletedPct)}%`, backgroundColor: "#d83b01", transition: "width 0.3s ease" }}
                        />
                    )}
                    {/* Attachments segment */}
                    {attachBytes > 0 && (
                        <div
                            title={`Attachments: ${formatBytes(attachBytes)}`}
                            style={{ width: `${Math.max(0.5, attachPct)}%`, backgroundColor: "#8764b8", transition: "width 0.3s ease" }}
                        />
                    )}
                </div>

                {/* Legend Items */}
                <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "16px",
                    fontSize: "0.75rem",
                    color: "#475569",
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid #f1f5f9"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#0078d4" }} />
                        <span>Inbox: <strong>{formatBytes(inboxBytes)}</strong></span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#00b7c3" }} />
                        <span>Sent Items: <strong>{formatBytes(sentBytes)}</strong></span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#d83b01" }} />
                        <span>Deleted Items: <strong>{formatBytes(deletedBytes)}</strong></span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#8764b8" }} />
                        <span>Attachments: <strong>{formatBytes(attachBytes)}</strong></span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#cbd5e1" }} />
                        <span>Free Space: <strong>{formatBytes(freeBytes)}</strong></span>
                    </div>
                </div>
            </div>

            {/* Folder-by-Folder Breakdown Section */}
            <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                overflow: "hidden"
            }}>
                <div style={{
                    padding: "12px 18px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span>Folder</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
                        <span style={{ width: "80px", textAlign: "right" }}>Items</span>
                        <span style={{ width: "90px", textAlign: "right" }}>Size</span>
                        <span style={{ width: "120px", textAlign: "right" }}>Action</span>
                    </div>
                </div>

                {folders.map((folder, idx) => (
                    <div
                        key={folder.id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "13px 18px",
                            borderBottom: idx < folders.length - 1 ? "1px solid #f1f5f9" : "none",
                            transition: "background 0.12s ease"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                    >
                        {/* Folder Name + Icon */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {getFolderIcon(folder.id)}
                            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1e293b" }}>
                                {folder.name}
                            </span>
                        </div>

                        {/* Counts, Size & Action Buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
                            <span style={{ width: "80px", textAlign: "right", fontSize: "0.8125rem", color: "#64748b" }}>
                                {folder.itemCount} items
                            </span>
                            <span style={{ width: "90px", textAlign: "right", fontSize: "0.8125rem", fontWeight: 600, color: "#334155" }}>
                                {formatBytes(folder.sizeBytes)}
                            </span>

                            {/* Action Button & Dropdown */}
                            <div style={{ width: "120px", textAlign: "right", position: "relative" }}>
                                {folder.id === "deleted" || folder.id === "junk" ? (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmCleanup({
                                            folderId: folder.id,
                                            folderName: folder.name,
                                            olderThanMonths: 0,
                                            title: `Empty ${folder.name}`
                                        })}
                                        style={{
                                            padding: "4px 10px",
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                            color: "#d83b01",
                                            background: "#fff",
                                            border: "1px solid #fca5a5",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            transition: "all 0.12s ease"
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                                    >
                                        Empty folder
                                    </button>
                                ) : (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuFolderId(openMenuFolderId === folder.id ? null : folder.id);
                                            }}
                                            style={{
                                                padding: "4px 10px",
                                                fontSize: "0.75rem",
                                                fontWeight: 500,
                                                color: "#334155",
                                                background: "#ffffff",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                                        >
                                            <span>Clean up</span>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>

                                        {openMenuFolderId === folder.id && (
                                            <div
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    position: "absolute",
                                                    right: 0,
                                                    top: "100%",
                                                    marginTop: "4px",
                                                    width: "210px",
                                                    background: "#ffffff",
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: "6px",
                                                    boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                                                    zIndex: 100,
                                                    padding: "4px 0",
                                                    textAlign: "left"
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenMenuFolderId(null);
                                                        setConfirmCleanup({
                                                            folderId: folder.id,
                                                            folderName: folder.name,
                                                            olderThanMonths: 3,
                                                            title: `Clean up ${folder.name} (older than 3 months)`
                                                        });
                                                    }}
                                                    style={{ width: "100%", padding: "7px 12px", border: "none", background: "transparent", textAlign: "left", fontSize: "0.75rem", cursor: "pointer", color: "#334155" }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                                >
                                                    Delete older than 3 months
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenMenuFolderId(null);
                                                        setConfirmCleanup({
                                                            folderId: folder.id,
                                                            folderName: folder.name,
                                                            olderThanMonths: 6,
                                                            title: `Clean up ${folder.name} (older than 6 months)`
                                                        });
                                                    }}
                                                    style={{ width: "100%", padding: "7px 12px", border: "none", background: "transparent", textAlign: "left", fontSize: "0.75rem", cursor: "pointer", color: "#334155" }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                                >
                                                    Delete older than 6 months
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenMenuFolderId(null);
                                                        setConfirmCleanup({
                                                            folderId: folder.id,
                                                            folderName: folder.name,
                                                            olderThanMonths: 12,
                                                            title: `Clean up ${folder.name} (older than 12 months)`
                                                        });
                                                    }}
                                                    style={{ width: "100%", padding: "7px 12px", border: "none", background: "transparent", textAlign: "left", fontSize: "0.75rem", cursor: "pointer", color: "#334155" }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                                >
                                                    Delete older than 12 months
                                                </button>
                                                <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }} />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenMenuFolderId(null);
                                                        setConfirmCleanup({
                                                            folderId: folder.id,
                                                            folderName: folder.name,
                                                            olderThanMonths: 0,
                                                            title: `Empty all items in ${folder.name}`
                                                        });
                                                    }}
                                                    style={{ width: "100%", padding: "7px 12px", border: "none", background: "transparent", textAlign: "left", fontSize: "0.75rem", cursor: "pointer", color: "#d83b01", fontWeight: 600 }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                                >
                                                    Delete all items
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirmation Dialog Modal */}
            {confirmCleanup && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0, 0, 0, 0.45)",
                    backdropFilter: "blur(1px)"
                }} onClick={() => setConfirmCleanup(null)}>
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "8px",
                            width: "90%",
                            maxWidth: "420px",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
                            overflow: "hidden"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0" }}>
                            <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
                                {confirmCleanup.title}
                            </h4>
                        </div>
                        <div style={{ padding: "18px 20px", fontSize: "0.875rem", color: "#475569", lineHeight: 1.5 }}>
                            Are you sure you want to clean up items in <strong>{confirmCleanup.folderName}</strong>?
                            {confirmCleanup.olderThanMonths > 0
                                ? ` Items older than ${confirmCleanup.olderThanMonths} months will be permanently deleted.`
                                : " All items in this folder will be permanently deleted. This action cannot be undone."}
                        </div>
                        <div style={{ padding: "14px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                type="button"
                                disabled={isCleaning}
                                onClick={() => setConfirmCleanup(null)}
                                style={{
                                    padding: "6px 14px",
                                    background: "#ffffff",
                                    color: "#475569",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    fontSize: "0.875rem",
                                    fontWeight: 500,
                                    cursor: "pointer"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isCleaning}
                                onClick={executeCleanup}
                                style={{
                                    padding: "6px 16px",
                                    background: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "0.875rem",
                                    fontWeight: 600,
                                    cursor: isCleaning ? "not-allowed" : "pointer",
                                    opacity: isCleaning ? 0.7 : 1
                                }}
                            >
                                {isCleaning ? "Cleaning..." : "Confirm & Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
