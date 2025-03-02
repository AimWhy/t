const Models = {
  AuthCachedCollectionReady: false,
  Users: {
    findOneById(userId, options) { }
  },
  Permissions: {
    findOneById(permissionId, options) { }
  },
  Roles: {
    findOneById(roleId, options) { },
    isUserInRoles(userId, roleIds, scope) { },
    findUsersInRole(roleId, scope, options) { }
  },
  blog: {
    isUserInRole(userId, roleId, scope) { }
  }
};

const getCurrentUserId = () => Date.now();

const restrictedRolePermissions = new Map();

const AuthorizationUtils = class {
  static addRolePermissionWhiteList(roleId, list) {
    if (!roleId) {
      throw new Error('invalid-param');
    }
    if (!list) {
      throw new Error('invalid-param');
    }
    if (!restrictedRolePermissions.has(roleId)) {
      restrictedRolePermissions.set(roleId, new Set());
    }
    const rules = restrictedRolePermissions.get(roleId);
    for (const permissionId of list) {
      rules.add(permissionId);
    }
  }
  static isPermissionRestrictedForRole(permissionId, roleId) {
    if (!roleId || !permissionId) {
      throw new Error('invalid-param');
    }
    if (!restrictedRolePermissions.has(roleId)) {
      return false;
    }
    const rules = restrictedRolePermissions.get(roleId);
    if (!rules || !rules.size) {
      return false;
    }
    return !rules.has(permissionId);
  }
  static isPermissionRestrictedForRoleList(permissionId, roleList) {
    if (!roleList || !permissionId) {
      throw new Error('invalid-param');
    }
    for (const roleId of roleList) {
      if (this.isPermissionRestrictedForRole(permissionId, roleId)) {
        return true;
      }
    }
    return false;
  }
};

const isValidScope = (roleScope) => typeof roleScope === 'string' && roleScope in Models;

const createPermissionValidator = (quantifier) => (permissionIds, scope, userId) => {
  const user = Models.Users.findOneById(userId, { fields: ['roles'] });
  const checkEachPermission = quantifier.bind(permissionIds);

  return checkEachPermission((permissionId) => {
    if (user.roles && AuthorizationUtils.isPermissionRestrictedForRoleList(permissionId, user.roles)) {
      return false;
    }

    const permission = Models.Permissions.findOneById(permissionId, { fields: ['roles'] });
    const roles = permission.roles || [];

    return roles.some((roleId) => {
      const role = Models.Roles.findOneById(roleId, { fields: ['scope'] });
      const roleScope = role.scope;
      if (!isValidScope(roleScope)) {
        return false;
      }
      return Models[roleScope].isUserInRole && Models[roleScope].isUserInRole(userId, roleId, scope);
    });
  });
};

const atLeastOne = createPermissionValidator(Array.prototype.some);
const all = createPermissionValidator(Array.prototype.every);
const validatePermissions = (permissions, scope, predicate, userId = getCurrentUserId()) => {
  if (!userId) {
    return false;
  }
  if (!Models.AuthCachedCollectionReady) {
    return false;
  }
  return predicate([].concat(permissions), scope, userId);
};

export const hasAllPermission = (permissions, scope) => validatePermissions(permissions, scope, all);

export const hasAtLeastOnePermission = (permissions, scope) => validatePermissions(permissions, scope, atLeastOne);

export const userHasAllPermission = (permissions, scope, userId) => validatePermissions(permissions, scope, all, userId);

export const hasRole = (userId, roleId, scope) => {
  if (Array.isArray(roleId)) {
    throw new Error('error-invalid-arguments');
  }
  return Models.Roles.isUserInRoles(userId, [roleId], scope);
};

export const hasAnyRole = (userId, roleIds, scope) => {
  if (!Array.isArray(roleIds)) {
    throw new Error('error-invalid-arguments');
  }
  return Models.Roles.isUserInRoles(userId, roleIds, scope);
};