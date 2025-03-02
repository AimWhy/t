import Permission from './Permission'
import Role from './Role'

export default class Memory {
  items = {};

  useRBAC (rbac) {
    if (this.rbac) {
      throw new Error('Storage is already in use with another instance of RBAC')
    }

    this.rbac = rbac
  }

  async add (item) {
    if (this.items[item.name]) {
      throw new Error(`Item ${item.name} already exists`)
    }

    this.items[item.name] = { instance: item, grants: [] }
    return true
  }

  async remove (item) {
    const { items } = this
    const { name } = item

    if (!items[name]) {
      throw new Error(`Item ${name} is not presented in storage`)
    }

    Object.keys(items).forEach((itemName) => {
      const { grants } = items[itemName]
      items[itemName].grants = grants.filter(grant => grant !== name)
    })

    delete this.items[name]
    return true
  }

  async grant (role, child) {
    const { items } = this
    const { name } = role
    const { name: childName } = child

    if (!items[name]) {
      throw new Error(`Role ${name} is not exist`)
    }
    if (!items[childName]) {
      throw new Error(`Base ${childName} is not exist`)
    }
    if (!(role instanceof Role)) {
      throw new Error('Role is not instance of Role')
    }
    if (name === childName) {
      throw new Error(`You can grant yourself ${name}`)
    }

    const grants = items[name].grants

    if (!grants.includes(childName)) {
      grants.push(childName)
    }
    return true
  }

  async revoke (role, child) {
    const { items } = this
    const { name } = role
    const { name: childName } = child

    if (!items[name] || !items[childName]) {
      throw new Error('Role is not exist')
    }

    const grants = items[name].grants

    if (!grants.includes(childName)) {
      throw new Error('Item is not associated to this item')
    }

    items[name].grants = grants.filter(grant => grant !== childName)
    return true
  }

  async get (name) {
    return (name && this.items[name] && this.items[name].instance) || undefined
  }

  async getRoles () {
    const { items } = this

    return Object.keys(items).reduce((filtered, itemKey) => {
      if (items[itemKey].instance instanceof Role) {
        filtered.push(items[itemKey].instance)
      }
      return filtered
    }, [])
  }

  async getPermissions () {
    const { items } = this

    return Object.keys(items).reduce((filtered, itemKey) => {
      if (items[itemKey].instance instanceof Permission) {
        filtered.push(items[itemKey].instance)
      }
      return filtered
    }, [])
  }

  async getGrants (role) {
    const { items } = this

    return (role && items[role]) ? items[role].grants.reduce((filtered, grantName) => {
      const grant = items[grantName]
      if (grant) {
        filtered.push(grant.instance)
      }
      return filtered
    }, []) : []
  }

  async getRole (name) {
    const role = await this.get(name)
    return (role && role instanceof Role) ? role : undefined
  }

  async getPermission (action, resource) {
    const name = Permission.createName(action, resource, this.rbac.options.delimiter)
    const item = await this.get(name)
    return (item && item instanceof Permission) ? item : undefined
  }

  async exists (name) {
    const item = await this.get(name)
    return !!item
  }

  async existsRole (name) {
    const role = await this.getRole(name)
    return !!role
  }

  async existsPermission (action, resource) {
    const permission = await this.getPermission(action, resource)
    return !!permission
  }
}
