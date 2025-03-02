function InterceptorManager () {
  this.handlers = []
}

InterceptorManager.prototype.use = function use (fulfilled, rejected) {
  return this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  }) - 1
}

InterceptorManager.prototype.eject = function eject (id) {
  if (this.handlers[id]) {
    this.handlers[id] = null
  }
}

InterceptorManager.prototype.forEach = function forEach (fn) {
  this.handlers.forEach(function forEachHandler (h) {
    if (h !== null) {
      fn(h)
    }
  })
}

var Middleware = function () {
  this.interceptors = {
    before: new InterceptorManager(),
    after: new InterceptorManager()
  }
}

Middleware.prototype.run = function (fun, config) {
  var chain = [fun, undefined]
  var promise = Promise.resolve(config)

  this.interceptors.before.forEach(function unshiftInterceptors (interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected)
  })

  this.interceptors.after.forEach(function pushInterceptors (interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected)
  })

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift())
  }

  return promise
}
