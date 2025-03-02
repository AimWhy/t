export function equal (a, b) {
  if (a === b) {
    return true
  }
  var aType = Object.prototype.toString.call(a)
  var bType = Object.prototype.toString.call(b)
  if (aType !== bType) {
    return false
  }
  if (!a || !b || typeof a !== 'object') {
    return window.isNaN(a) ? window.isNaN(b) : a === b
  }
  var length, i, keys
  switch (aType) {
    case '[object Array]':
      length = a.length
      if (length !== b.length) {
        return false
      }
      for (i = 0; i < length; i++) {
        if (!equal(a[i], b[i])) {
          return false
        }
      }
      return true
    case '[object Date]':
      return a.getTime() === b.getTime()
    case '[object RegExp]':
      return a.toString() === b.toString()
    case '[object Object]':
      keys = Object.keys(a)
      length = keys.length
      if (length !== Object.keys(b).length) {
        return false
      }
      for (i = 0; i < length; i++) {
        if (!Object.prototype.hasOwnProperty.call(b, keys[i])) {
          return false
        }
      }
      for (i = 0; i < length; i++) {
        if (!equal(a[keys[i]], b[keys[i]])) {
          return false
        }
      }
      return true
    default:
      return false
  }
}
