export const PERMISSIONS = Object.freeze({
  QUESTIONS_MANAGE: 'questions.manage',
  MATERIALS_MANAGE: 'materials.manage',
  CONTENT_ROLES_MANAGE: 'content_roles.manage',
  QUIZ_ACTIVITIES_MANAGE: 'quiz_activities.manage',
  VISIT_STATS_VIEW: 'visit_stats.view',
  ACCOUNTS_MANAGE: 'accounts.manage',
  HOMEPAGE_MANAGE: 'homepage.manage',
  QUIZ_OPERATE: 'quiz.operate',
});

const BACKEND_PERMISSIONS = [
  PERMISSIONS.QUESTIONS_MANAGE,
  PERMISSIONS.MATERIALS_MANAGE,
  PERMISSIONS.CONTENT_ROLES_MANAGE,
  PERMISSIONS.QUIZ_ACTIVITIES_MANAGE,
  PERMISSIONS.VISIT_STATS_VIEW,
  PERMISSIONS.HOMEPAGE_MANAGE,
  PERMISSIONS.ACCOUNTS_MANAGE,
];


export const hasPermission = (user, permission) => (
  Array.isArray(user?.permissions) && user.permissions.includes(permission)
);


export const getRoleKeys = (user) => {
  if (Array.isArray(user?.role_keys) && user.role_keys.length > 0) {
    return user.role_keys;
  }
  if (Array.isArray(user?.roles) && user.roles.length > 0) {
    return user.roles
      .map((role) => (typeof role === 'string' ? role : role?.key))
      .filter(Boolean);
  }
  return user?.role ? [user.role] : [];
};


export const hasRole = (user, roleKey) => getRoleKeys(user).includes(roleKey);


export const hasAnyPermission = (user, permissions) => (
  permissions.some((permission) => hasPermission(user, permission))
);


export const hasContentAdminAccess = (user) => (
  hasPermission(user, PERMISSIONS.QUESTIONS_MANAGE)
);


export const canAccessBackend = (user) => hasAnyPermission(user, BACKEND_PERMISSIONS);


export const getDefaultAccessPath = (user) => {
  if (hasPermission(user, PERMISSIONS.QUESTIONS_MANAGE)) return '/admin/questions';
  if (hasPermission(user, PERMISSIONS.MATERIALS_MANAGE)) return '/admin/materials';
  if (hasPermission(user, PERMISSIONS.CONTENT_ROLES_MANAGE)) return '/admin/roles';
  if (hasPermission(user, PERMISSIONS.HOMEPAGE_MANAGE)) return '/admin/site-events';
  if (hasPermission(user, PERMISSIONS.QUIZ_ACTIVITIES_MANAGE)) return '/admin/activities';
  if (hasPermission(user, PERMISSIONS.VISIT_STATS_VIEW)) return '/admin/stats';
  if (hasPermission(user, PERMISSIONS.ACCOUNTS_MANAGE)) return '/admin/users';
  if (hasPermission(user, PERMISSIONS.QUIZ_OPERATE)) return '/quiz';
  return '/admin/login';
};


export const readStoredPermissions = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('userPermissions') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};


export const readStoredRoles = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('userRoles') || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // 继续读取旧版单角色缓存。
  }
  const legacyRole = localStorage.getItem('userRole');
  return legacyRole ? [legacyRole] : [];
};


export const storeUserAccess = (user) => {
  localStorage.setItem('userRole', user.role || '');
  localStorage.setItem('userRoleName', user.role_name || user.role || '');
  localStorage.setItem('userRoles', JSON.stringify(getRoleKeys(user)));
  localStorage.setItem('userPermissions', JSON.stringify(user.permissions || []));
};
