import Base from './Base'

export default class Permission extends Base {
  static createName (action, resource, delimiter) {
    if (!delimiter) {
      throw new Error('Delimiter is not defined')
    }
    if (!action) {
      throw new Error('Action is not defined')
    }
    if (!resource) {
      throw new Error('Resource is not defined')
    }

    return `${action}${delimiter}${resource}`
  }

  static decodeName (name, delimiter) {
    if (!delimiter) {
      throw new Error('delimiter is required')
    }
    if (!name) {
      throw new Error('Name is required')
    }

    const pos = name.indexOf(delimiter)

    if (pos === -1) {
      throw new Error('Wrong name')
    }

    return { action: name.substr(0, pos), resource: name.substr(pos + 1) }
  }

  static isValidName (name, delimiter) {
    if (!delimiter) {
      throw new Error('Delimeter is not defined')
    }

    return (new RegExp(`^[^${delimiter}\\s]+$`)).test(name)
  }

  constructor (rbac, action, resource) {
    if (!action || !resource) {
      throw new Error('One of parameters is undefined')
    }
    if (!Permission.isValidName(action, rbac.options.delimiter) || !Permission.isValidName(resource, rbac.options.delimiter)) {
      throw new Error('Action or resource has no valid name')
    }

    super(rbac, Permission.createName(action, resource, rbac.options.delimiter))

    this.action = action
    this.resource = resource
  }

  can (action, resource) {
    return this.action === action && this.resource === resource
  }
}
