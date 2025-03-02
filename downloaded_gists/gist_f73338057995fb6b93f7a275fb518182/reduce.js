export function reduce (obj, reducer, initialValue) {
  if (Array.isArray(obj)) {
    return obj.reduce(reducer, initialValue)
  } else {
    return Object.keys(obj).reduce(function (acc, key) {
      return reducer(acc, obj[key], key, obj)
    }, initialValue)
  }
}