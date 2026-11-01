import React from 'react';

/**
 * Reusable Import and Export buttons component.
 * Provides high-contrast, accessible styling with smooth hover transitions
 * and SVG icon stroke matching across all dashboard views.
 *
 * @param {Object} props
 * @param {Function} props.onImport - Callback triggered when Import button is clicked
 * @param {Function} props.onExport - Callback triggered when Export button is clicked
 * @param {string} [props.importLabel='Import'] - Label text for Import button
 * @param {string} [props.exportLabel='Export'] - Label text for Export button
 * @param {string} [props.importAriaLabel] - ARIA label for Import button
 * @param {string} [props.exportAriaLabel] - ARIA label for Export button
 * @param {boolean} [props.importDisabled=false] - Whether Import button is disabled
 * @param {boolean} [props.exportDisabled=false] - Whether Export button is disabled
 * @param {string} [props.className='sidebar-actions'] - Container CSS class name
 * @param {'primary'|'secondary'|'outline'} [props.importVariant='primary'] - Variant style for Import button
 * @param {'primary'|'secondary'|'outline'} [props.exportVariant='primary'] - Variant style for Export button
 * @param {string} [props.idPrefix] - Optional ID prefix for test IDs
 */
export default function ImportExportButtons({
    onImport,
    onExport,
    importLabel = 'Import',
    exportLabel = 'Export',
    importAriaLabel,
    exportAriaLabel,
    importDisabled = false,
    exportDisabled = false,
    className = 'sidebar-actions',
    importVariant = 'primary',
    exportVariant = 'primary',
    idPrefix = ''
}) {
    const importBtnId = idPrefix ? `${idPrefix}ImportBtn` : undefined;
    const exportBtnId = idPrefix ? `${idPrefix}ExportBtn` : undefined;

    const getVariantClass = (variant) => {
        if (variant === 'secondary' || variant === 'outline') {
            return 'import-export-btn--secondary';
        }
        return 'import-export-btn--primary';
    };

    return (
        <div className={`import-export-actions ${className}`}>
            <button
                type="button"
                id={importBtnId}
                className={`btn-import import-export-btn ${getVariantClass(importVariant)}`}
                aria-label={importAriaLabel || `${importLabel} action`}
                onClick={onImport}
                disabled={importDisabled}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="import-export-icon"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>{importLabel}</span>
            </button>

            <button
                type="button"
                id={exportBtnId}
                className={`btn-export import-export-btn ${getVariantClass(exportVariant)}`}
                aria-label={exportAriaLabel || `${exportLabel} action`}
                onClick={onExport}
                disabled={exportDisabled}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="import-export-icon"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>{exportLabel}</span>
            </button>
        </div>
    );
}
