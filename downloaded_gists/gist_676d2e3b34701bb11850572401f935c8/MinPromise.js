var microPointer = Promise.resolve()

function noop (v) { return v }

function Handler (onFulfilled, onRejected, promise) {
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : noop
  this.onRejected = typeof onRejected === 'function' ? onRejected : noop
  this.promise = promise
}

function isPromise (obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
}

function MinPromise (fn) {
  if (!(this instanceof MinPromise)) {
    throw new TypeError('Promises must be constructed via new')
  }
  if (typeof fn !== 'function') {
    throw new TypeError('not a function')
  }

  this._state = 0
  this._handled = false
  this._value = undefined
  this._deferreds = []

  doResolve(fn, this)
}

function doResolve (fn, self) {
  var done = false
  try {
    fn(function (value) {
      if (!done) {
        done = true
        _resolve(value, self)
      }
    }, function (reason) {
      if (!done) {
        done = true
        _reject(reason, self)
      }
    })
  } catch (ex) {
    if (!done) {
      done = true
      _reject(ex, self)
    }
  }
}

function _resolve (newValue, self) {
  try {
    if (newValue === self) {
      throw new TypeError('A promise cannot be resolved with itself.')
    }
    if (isPromise(newValue) && !(newValue instanceof MinPromise)) {
      doResolve(newValue.then.bind(newValue), self)
    } else {
      self._state = (newValue instanceof MinPromise) ? 3 : 1
      self._value = newValue
      finale(self)
    }
  } catch (e) {
    _reject(e, self)
  }
}

function _reject (reason, self) {
  self._state = 2
  self._value = reason
  finale(self)
}

function finale (self) {
  if (self._state === 2 && self._deferreds.length === 0) {
    microPointer.then(function () {
      if (!self._handled) {
        MinPromise.unhandledRejectionFn(self._value)
      }
    })
  }

  for (var i = 0, len = self._deferreds.length; i < len; i++) {
    handle(self, self._deferreds[i])
  }
  self._deferreds = null
}

function handle (self, deferred) {
  while (self._state === 3) {
    self = self._value
  } // 如果返回值是 promise, 则设置 self 指向此对象(_state 为 0); 再原来的 deferred 加入到这个对象中

  if (self._state === 0) {
    self._deferreds.push(deferred)
  } else {
    self._handled = true
    microPointer.then(function () {
      try {
        if (self._state === 1) {
          _resolve(deferred.onFulfilled(self._value), deferred.promise)
        } else {
          _reject(deferred.onRejected(self._value), deferred.promise)
        }
      } catch (e) {
        _reject(e, deferred.promise)
      }
    })
  }
}

MinPromise.prototype.then = function _then (onFulfilled, onRejected) {
  var newPromise = new this.constructor(noop)
  handle(this, new Handler(onFulfilled, onRejected, newPromise))
  return newPromise
}

MinPromise.prototype.catch = function _catch (onRejected) {
  return this.then(noop, onRejected)
}

MinPromise.prototype.finally = function _finally (callback) {
  var constructor = this.constructor
  return this.then(function (value) {
    return constructor.resolve(callback()).then(function () {
      return value
    })
  }, function (reason) {
    return constructor.resolve(callback()).then(function () {
      return constructor.reject(reason)
    })
  })
}

MinPromise.resolve = function resolve (value) {
  if (value && typeof value === 'object' && value.constructor === MinPromise) {
    return value
  }
  return new MinPromise(function (resolve1) { resolve1(value) })
}

MinPromise.reject = function reject (value) {
  return new MinPromise(function (resolve1, reject1) { reject1(value) })
}

MinPromise.race = function race (values) {
  return new MinPromise(function (resolve1, reject1) {
    for (var i = 0, len = values.length; i < len; i++) {
      values[i].then(resolve1, reject1)
    }
  })
}

MinPromise.all = function all (arr) {
  return new MinPromise(function (resolve1, reject1) {
    if (!arr || typeof arr.length === 'undefined') {
      throw new TypeError('MinPromise.all accepts an array')
    }
    if (arr.length === 0) {
      return resolve1([])
    }

    var args = Array.prototype.slice.call(arr)
    var remaining = args.length
    var res = function res (i, val) {
      try {
        if (isPromise(val)) {
          val.then(function (val) { res(i, val) }, reject1)
        } else {
          args[i] = val
          if (--remaining === 0) {
            resolve1(args)
          }
        }
      } catch (ex) {
        reject1(ex)
      }
    }

    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

MinPromise.unhandledRejectionFn = function unhandledRejectionFn (err) {
  console.warn('Possible Unhandled Promise Rejection:', err)
}
