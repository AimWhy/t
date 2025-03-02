export default class Base {
  constructor (rbac, name) {
    if (!rbac || !name) {
      throw new Error('One of parameters is undefined')
    }

    this.name = name
    this.rbac = rbac
  }

  async add () {
    return this.rbac.add(this)
  }

  async remove () {
    return this.rbac.remove(this)
  }
}
