export const hasAdminPrivileges = (user) => {
    if (!user) return false;
    const role = String(user.role || user.userRole || user.user_role || '').toLowerCase().trim();
    const normalized = role.replace(/[-_\s]/g, '');
    if (['owner', 'orgowner', 'organizationowner', 'admin', 'superadmin', 'administrator', 'manager'].includes(normalized) || normalized.includes('owner') || normalized.includes('admin') || normalized.includes('manager')) return true;
    if (Boolean(user.isOwner || user.is_owner || user.isAdmin || user.is_admin || user.is_organization_owner)) return true;
    if (user.perm_make_admin || user.perm_add_employees || user.perm_manage_projects || user.perm_create_projects || user.perm_delete_project) return true;
    if (user.permissions?.makeAdmin || user.permissions?.manageProjects || user.permissions?.addEmployees || user.permissions?.createProjects || user.permissions?.deleteProject) return true;
    return false;
};
