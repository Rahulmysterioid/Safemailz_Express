export const hasAdminPrivileges = (user) => {
    if (!user || !user.role) return false;
    const role = user.role.toLowerCase();
    return role === 'admin' || role === 'org_owner';
};
