import Role from './Role'
import Permission from './Permission'
import MemoryStorage from './Memory'

function isPlainObject (value) {
  if (value == null || Object.prototype.toString.call(value) !== '[object Object]') {
    return false
  }
  if (Object.getPrototypeOf(value) === null) {
    return true
  }

  let proto = value
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }
  return Object.getPrototypeOf(value) === proto
}

const DEFAULT_OPTIONS = {
  permissions: {},
  roles: [],
  grant: {},
  delimiter: '_',
}

export default class RBAC {
  static getPermissionNames (permissions, delimiter) {
    if (!delimiter) {
      throw new Error('Delimiter is not defined')
    }
    return permissions.map(permission => Permission.createName(permission[0], permission[1], delimiter))
  }

  constructor (options) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.storage = this.options.storage || new MemoryStorage()
    this.storage.useRBAC(this)
  }

  async init () {
    const { roles, permissions, grants } = this.options
    return this.create(roles, permissions, grants)
  }

  async create (roleNames, permissionNames, grantsData) {
    const [permissions, roles] = await Promise.all([
      this.createPermissions(permissionNames),
      this.createRoles(roleNames)
    ])
    if (grantsData) {
      await this.grants(grantsData)
    }
    return { permissions, roles }
  }

  async createPermissions (resources, add = true) {
    if (!isPlainObject(resources)) {
      throw new Error('Resources is not a plain object')
    }

    const permissions = {}
    await Promise.all(Object.keys(resources).map(async (resource) => {
      const actions = resources[resource]
      await Promise.all(actions.map(async (action) => {
        const permission = await this.createPermission(action, resource, add)
        permissions[permission.name] = permission
      }))
    }))
    return permissions
  }

  async createPermission (action, resource, add) {
    const permission = new Permission(this, action, resource)
    if (add) {
      await permission.add()
    }
    return permission
  }

  async createRoles (roleNames, add = true) {
    const roles = {}
    await Promise.all(roleNames.map(async (roleName) => {
      const role = await this.createRole(roleName, add)
      roles[role.name] = role
    }))
    return roles
  }

  async createRole (roleName, add) {
    const role = new Role(this, roleName)
    if (add) {
      await role.add()
    }
    return role
  }

  async grants (grantsData) {
    if (!isPlainObject(grantsData)) {
      throw new Error('Grants is not a plain object')
    }

    await Promise.all(Object.keys(grantsData).map(async (roleName) => {
      const grants = grantsData[roleName]
      await Promise.all(grants.map(async (grant) => {
        await this.grantByName(roleName, grant)
      }))
    }))
  }

  async grantByName (roleName, childName) {
    const [role, child] = await Promise.all([ this.get(roleName), this.get(childName) ])
    return this.grant(role, child)
  }

  async grant (role, child) {
    if (!role || !child) {
      throw new Error('One of item is undefined')
    }
    if (role.rbac !== this || child.rbac !== this) {
      throw new Error('Item is associated to another RBAC instance')
    }
    if (!(role instanceof Role)) {
      throw new Error('Role is not instance of Role')
    }
    return this.storage.grant(role, child)
  }

  async revoke (role, child) {
    if (!role || !child) {
      throw new Error('One of item is undefined')
    }
    if (role.rbac !== this || child.rbac !== this) {
      throw new Error('Item is associated to another RBAC instance')
    }
    return this.storage.revoke(role, child)
  }

  async revokeByName (roleName, childName) {
    const [role, child] = await Promise.all([ this.get(roleName), this.get(childName) ])
    return this.revoke(role, child)
  }

  async get (name) {
    return this.storage.get(name)
  }

  async add (item) {
    if (!item) {
      throw new Error('Item is undefined')
    }
    if (item.rbac !== this) {
      throw new Error('Item is associated to another RBAC instance')
    }
    return this.storage.add(item)
  }

  async remove (item) {
    if (!item) {
      throw new Error('Item is undefined')
    }
    if (item.rbac !== this) {
      throw new Error('Item is associated to another RBAC instance')
    }
    return this.storage.remove(item)
  }

  async removeByName (name) {
    const item = await this.get(name)
    return !item ? true : item.remove()
  }

  async exists (name) {
    return this.storage.exists(name)
  }

  async existsRole (name) {
    return this.storage.existsRole(name)
  }

  async existsPermission (action, resource) {
    return this.storage.existsPermission(action, resource)
  }

  async getRole (name) {
    return this.storage.getRole(name)
  }

  async getRoles () {
    return this.storage.getRoles()
  }

  async getPermission (action, resource) {
    return this.storage.getPermission(action, resource)
  }

  async getPermissionByName (name) {
    const data = Permission.decodeName(name, this.options.delimiter)
    return this.storage.getPermission(data.action, data.resource)
  }

  async getPermissions () {
    return this.storage.getPermissions()
  }

  async traverseGrants (roleName, cb, next = [roleName], used = {}) {
    const actualRole = next.shift()
    const grants = await this.storage.getGrants(actualRole)
    used[actualRole] = true

    for (let i = 0; i < grants.length; i += 1) {
      const item = grants[i]
      const { name } = item

      if (item instanceof Role && !used[name]) {
        used[name] = true
        next.push(name)
      }

      const result = await cb(item)
      if (result !== undefined) {
        return result
      }
    }
    return next.length ? this.traverseGrants(null, cb, next, used) : undefined
  }

  async can (roleName, action, resource) {
    const can = await this.traverseGrants(roleName, (item) => {
      return (item instanceof Permission && item.can(action, resource)) ? true : undefined
    })
    return can || false
  }

  async canAny (roleName, permissions) {
    const permissionNames = RBAC.getPermissionNames(permissions, this.options.delimiter)
    const can = await this.traverseGrants(roleName, (item) => {
      return (item instanceof Permission && permissionNames.includes(item.name)) ? true : undefined
    })
    return can || false
  }

  async canAll (roleName, permissions) {
    const permissionNames = RBAC.getPermissionNames(permissions, this.options.delimiter)
    const founded = {}
    let foundedCount = 0

    await this.traverseGrants(roleName, (item) => {
      if (item instanceof Permission && permissionNames.includes(item.name) && !founded[item.name]) {
        founded[item.name] = true
        foundedCount += 1
        return (foundedCount === permissionNames.length) ? true : undefined
      } else {
        return undefined
      }
    })
    return foundedCount === permissionNames.length
  }

  async hasRole (roleName, roleChildName) {
    if (roleName === roleChildName) {
      return true
    } else {
      const has = await this.traverseGrants(roleName, (item) => {
        return (item instanceof Role && item.name === roleChildName) ? true : undefined
      })
      return has || false
    }
  }

  async getScope (roleName) {
    const scope = []
    await this.traverseGrants(roleName, (item) => {
      if (item instanceof Permission && !scope.includes(item.name)) {
        scope.push(item.name)
      }
    })
    return scope
  }
}
