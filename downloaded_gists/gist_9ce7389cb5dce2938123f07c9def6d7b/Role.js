import Base from './Base'
import Permission from './Permission'

export default class Role extends Base {
  constructor (rbac, name) {
    if (!Permission.isValidName(name, rbac.options.delimiter)) {
      throw new Error('Role has no valid name')
    }

    super(rbac, name)
  }

  async grant (item) {
    return this.rbac.grant(this, item)
  }

  async revoke (item) {
    return this.rbac.revoke(this, item)
  }

  async can (action, resource) {
    return this.rbac.can(this.name, action, resource)
  }

  async canAny (permissions) {
    return this.rbac.canAny(this.name, permissions)
  }

  async canAll (permissions) {
    return this.rbac.canAll(this.name, permissions)
  }

  async hasRole (roleChildName) {
    return this.rbac.hasRole(this.name, roleChildName)
  }

  async getScope () {
    return this.rbac.getScope(this.name)
  }
}
