export const PERMISSIONS = Object.freeze({
  QUESTIONS_MANAGE: 'questions.manage',
  ACCOUNTS_MANAGE: 'accounts.manage',
  HOMEPAGE_MANAGE: 'homepage.manage',
  QUIZ_OPERATE: 'quiz.operate',
});

const BACKEND_PERMISSIONS = [
  PERMISSIONS.QUESTIONS_MANAGE,
  PERMISSIONS.HOMEPAGE_MANAGE,
  PERMISSIONS.ACCOUNTS_MANAGE,
];


export const hasPermission = (user, permission) => (
  Array.isArray(user?.permissions) && user.permissions.includes(permission)
);


export const hasAnyPermission = (user, permissions) => (
  permissions.some((permission) => hasPermission(user, permission))
);


export const hasContentAdminAccess = (user) => (
  hasPermission(user, PERMISSIONS.QUESTIONS_MANAGE)
);


export const canAccessBackend = (user) => hasAnyPermission(user, BACKEND_PERMISSIONS);


export const getDefaultAccessPath = (user) => {
  if (hasPermission(user, PERMISSIONS.QUESTIONS_MANAGE)) return '/admin/questions';
  if (hasPermission(user, PERMISSIONS.HOMEPAGE_MANAGE)) return '/admin/site-events';
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


export const storeUserAccess = (user) => {
  localStorage.setItem('userRole', user.role || '');
  localStorage.setItem('userRoleName', user.role_name || user.role || '');
  localStorage.setItem('userPermissions', JSON.stringify(user.permissions || []));
};
