/**
 * Utility for exporting employee records to CSV.
 * Fields are extracted directly from the "Add Employee" modal inspection:
 * - "First Name" (emp.firstName)
 * - "Last Name"  (emp.lastName)
 * - "Email"      (emp.email)
 */

export const ADD_EMPLOYEE_MODAL_FIELDS = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' }
];

export const exportEmployeesToCSV = (employeesList, modalFields = ADD_EMPLOYEE_MODAL_FIELDS) => {
    // 1. Filter to valid / filled employee records
    const validEmployees = (employeesList || []).filter(
        emp => emp && emp.status !== 'empty' && (emp.firstName || emp.lastName || emp.email || emp.name)
    );

    if (!validEmployees || validEmployees.length === 0) {
        alert("No employee records to export.");
        return;
    }

    // 2. Build CSV headers using exact field labels from modal inspection
    const headers = modalFields.map(f => `"${f.label}"`).join(",");

    // 3. Map employee state data using exact key names from modal state/schema
    const rows = validEmployees.map(emp => {
        return modalFields.map(f => {
            let val = emp[f.key] ?? '';
            // If firstName/lastName is missing but full name exists, parse as fallback
            if (!val && f.key === 'firstName' && emp.name) {
                val = emp.name.split(' ')[0] || '';
            } else if (!val && f.key === 'lastName' && emp.name) {
                val = emp.name.split(' ').slice(1).join(' ') || '';
            }
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",");
    });

    // 4. Generate Blob download
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `safemailz_employees_${today}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
