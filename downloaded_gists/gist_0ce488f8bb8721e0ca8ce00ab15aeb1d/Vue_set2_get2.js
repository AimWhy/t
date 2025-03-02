  Vue.prototype.$get2 = function (obj, key, def, sp = '.') {
    var p = 0
    var keys = (typeof key === 'string') ? key.split(sp) : key
    var len = keys.length
    while (obj && p < len) {
      obj = obj[keys[p++]]
    }
    return (obj === undefined || p < len) ? def : obj
  }

  Vue.prototype.$set2 = function (obj, key, value, sp = '.', is$set = false) {
    if (!obj) { obj = this }
    var p = 0
    var keys = (typeof key === 'string') ? key.split(sp) : key
    var len = keys.length
    while (obj && p < len - 1) {
      obj = obj[keys[p++]]
    }
    if (obj && typeof obj === 'object' && p === len - 1) {
      if (is$set && !obj._isVue) {
        this.$set(obj, keys[p], value)
      } else {
        obj[keys[p]] = value
      }
    }
  }