export function compose (middlewareArr) {
  if (!Array.isArray(middlewareArr)) {
    throw new TypeError('Middleware stack must be an array!')
  }
  for (const fn of middlewareArr) {
    if (typeof fn !== 'function') {
      throw new TypeError('Middleware must be composed of functions!')
    }
  }

  return function (context, next) {
    let index = -1
    let dispatch = function dispatch (i) {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      } else {
        index = i
        let fn = i === middlewareArr.length ? next : middlewareArr[i]

        try {
          return Promise.resolve(!fn ? null : fn(context, dispatch.bind(null, i + 1)))
        } catch (err) {
          return Promise.reject(err)
        }
      }
    }

    return dispatch(0)
  }
}
