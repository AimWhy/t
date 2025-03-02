function isPlainObject(value) {
  if (Object.prototype.toString(value) != '[object Object]') {
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

const flattenObjectKeys = (obj, keys = []) => {
    return Object.keys(obj).reduce((acc, key) => {
        const o = ((isPlainObject(obj[key]) && Object.keys(obj[key]).length > 0) || (Array.isArray(obj[key]) && obj[key].length > 0))
            ? flattenObjectKeys(obj[key], keys.concat(key))
            : [keys.concat(key)];
        return acc.concat(o);
    }, []);
};