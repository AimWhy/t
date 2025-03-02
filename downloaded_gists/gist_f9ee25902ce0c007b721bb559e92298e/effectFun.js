export function effectFun (f) {
  let cleanup
  return function effectWrap (...args) {
    if (typeof cleanup === 'function') {
      cleanup()
    }
    let result = f.apply(this, args)
    if (result.cleanup) {
      cleanup = result.cleanup
      return result.val
    } else {
      return result
    }
  }
}