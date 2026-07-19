const CONTENT_ADMIN_ROLES = new Set(['super_admin', 'question_admin']);


export const hasContentAdminAccess = (user) => CONTENT_ADMIN_ROLES.has(user?.role);
