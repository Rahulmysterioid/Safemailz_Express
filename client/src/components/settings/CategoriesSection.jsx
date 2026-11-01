import React, { useState, useEffect } from "react";

export const DEFAULT_CATEGORIES = [
    { id: "cat-red",    name: "Red category",    color: "#ef4444", bg: "#fee2e2", border: "#f87171", isFavorite: true },
    { id: "cat-orange", name: "Orange category", color: "#f97316", bg: "#ffedd5", border: "#fb923c", isFavorite: false },
    { id: "cat-yellow", name: "Yellow category", color: "#eab308", bg: "#fef9c3", border: "#facc15", isFavorite: false },
    { id: "cat-green",  name: "Green category",  color: "#22c55e", bg: "#dcfce7", border: "#4ade80", isFavorite: true },
    { id: "cat-blue",   name: "Blue category",   color: "#0078d4", bg: "#dbeafe", border: "#60a5fa", isFavorite: true },
    { id: "cat-purple", name: "Purple category", color: "#a855f7", bg: "#f3e8ff", border: "#c084fc", isFavorite: false },
];

export const COLOR_PALETTE = [
    { id: "red",       label: "Red",       color: "#ef4444", bg: "#fee2e2", border: "#f87171" },
    { id: "orange",    label: "Orange",    color: "#f97316", bg: "#ffedd5", border: "#fb923c" },
    { id: "peach",     label: "Peach",     color: "#fb923c", bg: "#fff7ed", border: "#fdba74" },
    { id: "yellow",    label: "Yellow",    color: "#eab308", bg: "#fef9c3", border: "#facc15" },
    { id: "green",     label: "Green",     color: "#22c55e", bg: "#dcfce7", border: "#4ade80" },
    { id: "teal",      label: "Teal",      color: "#14b8a6", bg: "#ccfbf1", border: "#5eead4" },
    { id: "olive",     label: "Olive",     color: "#84cc16", bg: "#ecfccb", border: "#bef264" },
    { id: "blue",      label: "Blue",      color: "#0078d4", bg: "#dbeafe", border: "#60a5fa" },
    { id: "purple",    label: "Purple",    color: "#a855f7", bg: "#f3e8ff", border: "#c084fc" },
    { id: "cranberry", label: "Cranberry", color: "#f43f5e", bg: "#ffe4e6", border: "#fda4af" },
    { id: "steel",     label: "Steel",     color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
    { id: "darkgray",  label: "Dark Gray", color: "#334155", bg: "#e2e8f0", border: "#94a3b8" },
];

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

export default function CategoriesSection() {
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [catName, setCatName] = useState("");
    const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
    const [shortcutKey, setShortcutKey] = useState("None");
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load initial categories
    useEffect(() => {
        let hasStored = false;
        try {
            const stored = localStorage.getItem("userCategories");
            if (stored !== null) {
                const loadedList = JSON.parse(stored);
                if (Array.isArray(loadedList)) {
                    setCategories(loadedList);
                    hasStored = true;
                }
            }
        } catch (e) {}

        if (!hasStored) {
            setCategories(DEFAULT_CATEGORIES);
            try {
                localStorage.setItem("userCategories", JSON.stringify(DEFAULT_CATEGORIES));
            } catch (e) {}
        }

        // Also fetch from API
        fetch("/api/settings/categories", { headers: getHeaders() })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.categories && Array.isArray(data.categories)) {
                    setCategories(data.categories);
                    try {
                        localStorage.setItem("userCategories", JSON.stringify(data.categories));
                    } catch (e) {}
                }
            })
            .catch(() => {});
    }, []);

    const persistCategories = async (updatedList) => {
        setCategories(updatedList);
        try {
            localStorage.setItem("userCategories", JSON.stringify(updatedList));
            window.dispatchEvent(new CustomEvent("categoriesUpdated", { detail: updatedList }));
        } catch (e) {}

        try {
            await fetch("/api/settings/categories", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ categories: updatedList })
            });
        } catch (e) {}
    };

    const handleOpenCreateModal = () => {
        setEditingCategory(null);
        setCatName("");
        setSelectedColor(COLOR_PALETTE[0]);
        setShortcutKey("None");
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (cat) => {
        setEditingCategory(cat);
        setCatName(cat.name);
        const match = COLOR_PALETTE.find(c => c.color.toLowerCase() === (cat.color || "").toLowerCase()) || COLOR_PALETTE[0];
        setSelectedColor(match);
        setShortcutKey(cat.shortcutKey || "None");
        setIsModalOpen(true);
    };

    const handleSaveCategory = (e) => {
        e.preventDefault();
        const trimmed = catName.trim();
        if (!trimmed) {
            showToast("Category name cannot be empty", "error");
            return;
        }

        const isDuplicate = categories.some(c => 
            c.name.toLowerCase().trim() === trimmed.toLowerCase() && 
            (!editingCategory || c.id !== editingCategory.id)
        );
        if (isDuplicate) {
            showToast(`A category named "${trimmed}" already exists.`, "error");
            return;
        }

        let updated;
        if (editingCategory) {
            updated = categories.map(c => {
                if (c.id === editingCategory.id) {
                    return {
                        ...c,
                        name: trimmed,
                        color: selectedColor.color,
                        bg: selectedColor.bg,
                        border: selectedColor.border,
                        shortcutKey: shortcutKey !== "None" ? shortcutKey : undefined
                    };
                }
                return c;
            });
            showToast(`Category "${trimmed}" updated successfully`);
        } else {
            const newCat = {
                id: `cat-${Date.now()}`,
                name: trimmed,
                color: selectedColor.color,
                bg: selectedColor.bg,
                border: selectedColor.border,
                isFavorite: false,
                shortcutKey: shortcutKey !== "None" ? shortcutKey : undefined
            };
            updated = [...categories, newCat];
            showToast(`Category "${trimmed}" created successfully`);
        }

        persistCategories(updated);
        setIsModalOpen(false);
    };

    const handleDeleteCategory = (cat) => {
        if (!window.confirm(`Are you sure you want to delete "${cat.name}"?`)) return;
        const updated = categories.filter(c => c.id !== cat.id);
        persistCategories(updated);
        showToast(`Category "${cat.name}" deleted`);
    };

    const handleToggleFavorite = (catId) => {
        const updated = categories.map(c => {
            if (c.id === catId) {
                return { ...c, isFavorite: !c.isFavorite };
            }
            return c;
        });
        persistCategories(updated);
    };

    return (
        <div style={{ maxWidth: "780px", color: "#1e293b", fontFamily: "inherit" }}>
            {/* Header & Description */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                    <h3 className="text-xl font-semibold text-slate-900" style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", margin: "0 0 6px" }}>
                        Categories
                    </h3>
                    <p className="text-sm text-slate-600" style={{ fontSize: "0.875rem", color: "#475569", margin: 0, lineHeight: 1.5 }}>
                        Manage color categories to easily organize and tag your emails.
                    </p>
                </div>
                {/* Top Action Button: + New category */}
                <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 14px",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#0078d4",
                        background: "#ffffff",
                        border: "1px solid #0078d4",
                        borderRadius: "4px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#eff6fc";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ffffff";
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New category
                </button>
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

            {/* Categories List Container */}
            <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                overflow: "hidden"
            }}>
                <div style={{
                    padding: "10px 16px",
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
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <span style={{ width: "24px", textAlign: "center" }}>Color</span>
                        <span>Name</span>
                    </div>
                    <span>Actions</span>
                </div>

                {categories.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>
                        No categories found. Click <strong>+ New category</strong> to create one.
                    </div>
                ) : (
                    categories.map((cat, idx) => (
                        <div
                            key={cat.id || idx}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 16px",
                                borderBottom: idx < categories.length - 1 ? "1px solid #f1f5f9" : "none",
                                transition: "background 0.12s ease"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                        >
                            {/* Left: Color Tag + Category Name */}
                            <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                                <span
                                    title={cat.name}
                                    style={{
                                        width: "20px",
                                        height: "20px",
                                        borderRadius: "4px",
                                        backgroundColor: cat.color,
                                        display: "inline-block",
                                        flexShrink: 0,
                                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)"
                                    }}
                                />
                                <span style={{
                                    fontSize: "0.875rem",
                                    fontWeight: 500,
                                    color: "#1e293b",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                }}>
                                    {cat.name}
                                </span>
                                {cat.shortcutKey && (
                                    <span style={{
                                        fontSize: "0.6875rem",
                                        padding: "1px 6px",
                                        background: "#e2e8f0",
                                        color: "#475569",
                                        borderRadius: "3px",
                                        fontWeight: 600
                                    }}>
                                        {cat.shortcutKey}
                                    </span>
                                )}
                            </div>

                            {/* Right: Actions (Star toggle, Edit pencil, Delete trash) */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {/* Favorite / Star toggle */}
                                <button
                                    type="button"
                                    title={cat.isFavorite ? "Remove from favorites" : "Add to favorites"}
                                    onClick={() => handleToggleFavorite(cat.id)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "6px",
                                        borderRadius: "4px",
                                        color: cat.isFavorite ? "#eab308" : "#94a3b8",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "color 0.12s ease"
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill={cat.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                </button>

                                {/* Edit (pencil icon) */}
                                <button
                                    type="button"
                                    title="Edit category"
                                    onClick={() => handleOpenEditModal(cat)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "6px",
                                        borderRadius: "4px",
                                        color: "#475569",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "color 0.12s ease"
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#0078d4"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                    </svg>
                                </button>

                                {/* Delete (trash icon) */}
                                <button
                                    type="button"
                                    title="Delete category"
                                    onClick={() => handleDeleteCategory(cat)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "6px",
                                        borderRadius: "4px",
                                        color: "#ef4444",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "color 0.12s ease"
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create / Edit Category Modal */}
            {isModalOpen && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0, 0, 0, 0.45)",
                    backdropFilter: "blur(1px)"
                }} onClick={() => setIsModalOpen(false)}>
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "8px",
                            width: "90%",
                            maxWidth: "440px",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                            overflow: "hidden"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: "16px 20px",
                            borderBottom: "1px solid #e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                        }}>
                            <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
                                {editingCategory ? "Edit category" : "Create new category"}
                            </h4>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveCategory} style={{ padding: "20px" }}>
                            {/* Category Name */}
                            <div style={{ marginBottom: "18px" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#334155", marginBottom: "6px" }}>
                                    Category name
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    required
                                    value={catName}
                                    onChange={(e) => setCatName(e.target.value)}
                                    placeholder="e.g. Project Apollo, Finance, Personal"
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        fontSize: "0.875rem",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "4px",
                                        outline: "none",
                                        boxSizing: "border-box"
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0078d4"; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; }}
                                />
                            </div>

                            {/* 12-Color Palette Swatches */}
                            <div style={{ marginBottom: "18px" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#334155", marginBottom: "8px" }}>
                                    Color ({selectedColor.label})
                                </label>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(6, 1fr)",
                                    gap: "8px"
                                }}>
                                    {COLOR_PALETTE.map(cp => {
                                        const isSelected = selectedColor.color.toLowerCase() === cp.color.toLowerCase();
                                        return (
                                            <button
                                                key={cp.id}
                                                type="button"
                                                title={cp.label}
                                                onClick={() => setSelectedColor(cp)}
                                                style={{
                                                    height: "36px",
                                                    borderRadius: "4px",
                                                    backgroundColor: cp.color,
                                                    border: isSelected ? "2px solid #0f172a" : "1px solid rgba(0,0,0,0.15)",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    outline: "none",
                                                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                                                    transition: "transform 0.1s ease"
                                                }}
                                            >
                                                {isSelected && (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Shortcut Key Option */}
                            <div style={{ marginBottom: "22px" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#334155", marginBottom: "6px" }}>
                                    Shortcut key
                                </label>
                                <select
                                    value={shortcutKey}
                                    onChange={(e) => setShortcutKey(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        fontSize: "0.875rem",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "4px",
                                        outline: "none",
                                        background: "#ffffff"
                                    }}
                                >
                                    <option value="None">None</option>
                                    <option value="Ctrl + F2">Ctrl + F2</option>
                                    <option value="Ctrl + F3">Ctrl + F3</option>
                                    <option value="Ctrl + F4">Ctrl + F4</option>
                                    <option value="Ctrl + F5">Ctrl + F5</option>
                                    <option value="Ctrl + F6">Ctrl + F6</option>
                                    <option value="Ctrl + F7">Ctrl + F7</option>
                                    <option value="Ctrl + F8">Ctrl + F8</option>
                                    <option value="Ctrl + F9">Ctrl + F9</option>
                                </select>
                            </div>

                            {/* Modal Footer Buttons */}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{
                                        padding: "7px 16px",
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
                                    type="submit"
                                    style={{
                                        padding: "7px 20px",
                                        background: "#0078d4",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "0.875rem",
                                        fontWeight: 600,
                                        cursor: "pointer"
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
