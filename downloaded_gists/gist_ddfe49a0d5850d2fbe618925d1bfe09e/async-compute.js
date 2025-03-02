var lazyActivePrefix = 'async_computed$lazy_active$'
var lazyDataPrefix = 'async_computed$lazy_data$'

function initLazy (data, key) {
  data[lazyActivePrefix + key] = false
  data[lazyDataPrefix + key] = null
}

function makeLazyComputed (key) {
  return {
    get: function get () {
      this[lazyActivePrefix + key] = true
      return this[lazyDataPrefix + key]
    },
    set: function set (value) {
      this[lazyDataPrefix + key] = value
    }
  }
}

function isComputedLazy (item) {
  return item.hasOwnProperty('lazy') && item.lazy
}

function isLazyActive (vm, key) {
  return vm[lazyActivePrefix + key]
}

function silentSetLazy (vm, key, value) {
  vm[lazyDataPrefix + key] = value
}

function silentGetLazy (vm, key) {
  return vm[lazyDataPrefix + key]
}

var prefix = 'async_computed$'
var DidNotUpdate = (typeof Symbol === 'function') ? Symbol('did-not-update') : {}

function setAsyncState (stateObject, state) {
  stateObject.state = state
  stateObject.updating = state === 'updating'
  stateObject.error = state === 'error'
  stateObject.success = state === 'success'
}

function getterOnly (fn) {
  return (typeof fn === 'function') ? fn : fn.get
}

function getterFn (key, fn) {
  if (typeof fn === 'function') {
    return fn
  }

  var getter = fn.get
  if (fn.hasOwnProperty('watch')) {
    var previousGetter = getter
    getter = function getter () {
      fn.watch.call(this)
      return previousGetter.call(this)
    }
  }

  if (fn.hasOwnProperty('shouldUpdate')) {
    var _previousGetter = getter
    getter = function getter () {
      return fn.shouldUpdate.call(this) ? _previousGetter.call(this) : DidNotUpdate
    }
  }

  if (isComputedLazy(fn)) {
    var nonLazy = getter
    getter = function lazyGetter () {
      return isLazyActive(this, key) ? nonLazy.call(this) : silentGetLazy(this, key)
    }
  }

  return getter
}

function generateDefault (fn, pluginOptions) {
  var defaultValue = fn.default || pluginOptions.default || null
  return (typeof defaultValue === 'function') ? defaultValue.call(this) : defaultValue
}

export const AsyncComputed = {
  install: function install (Vue, pluginOptions = {}) {
    Vue.config.optionMergeStrategies.asyncComputed = Vue.config.optionMergeStrategies.computed
    Vue.mixin({
      beforeCreate: function beforeCreate () {
        if (Object.keys(this.$options.asyncComputed).length) {
          var optionData = this.$options.data

          this.$options.computed = this.$options.computed || {}
          this.$options.asyncComputed = this.$options.asyncComputed || {}
          this.$asyncComputed = {}

          for (var key in this.$options.asyncComputed) {
            this.$options.computed[prefix + key] = getterFn(key, this.$options.asyncComputed[key])
          }

          this.$options.data = function vueAsyncComputedInjectedDataFn () {
            var data = (typeof optionData === 'function' ? optionData.call(this) : optionData) || {}
            for (var _key in this.$options.asyncComputed) {
              var item = this.$options.asyncComputed[_key]
              if (isComputedLazy(item)) {
                initLazy(data, _key)
                this.$options.computed[_key] = makeLazyComputed(_key)
              } else {
                data[_key] = null
              }
            }
            return data
          }
        }
      },
      created: function created () {
        var _this = this

        for (var key in this.$options.asyncComputed) {
          var item = this.$options.asyncComputed[key]
          var value = generateDefault.call(this, item, pluginOptions)

          if (isComputedLazy(item)) {
            silentSetLazy(this, key, value)
          } else {
            this[key] = value
          }
        }

        var _loop = function _loop (_key2) {
          var promiseId = 0
          var watcher = function watcher (newPromise) {
            var thisPromise = ++promiseId

            if (newPromise !== DidNotUpdate) {
              if (!newPromise || !newPromise.then) {
                newPromise = Promise.resolve(newPromise)
              }

              setAsyncState(_this.$asyncComputed[_key2], 'updating')

              newPromise.then(function (value) {
                if (thisPromise === promiseId) {
                  setAsyncState(_this.$asyncComputed[_key2], 'success')
                  _this[_key2] = value
                }
              }).catch(function (err) {
                if (thisPromise === promiseId) {
                  setAsyncState(_this.$asyncComputed[_key2], 'error')
                  _this.$asyncComputed[_key2].exception = err

                  if (pluginOptions.errorHandler !== false) {
                    var handler = pluginOptions.errorHandler || console.error.bind(console, 'Async computed property:')
                    pluginOptions.useRawError ? handler(err) : handler(err.stack)
                  }
                }
              })
            }
          }

          _this.$asyncComputed[_key2] = {
            exception: null,
            update: function update () {
              watcher(getterOnly(_this.$options.asyncComputed[_key2])())
            }
          }

          setAsyncState(_this.$asyncComputed[_key2], 'updating')
          _this.$watch(prefix + _key2, watcher, { immediate: true })
        }

        Object.keys(this.$options.asyncComputed).forEach(_loop)
      }
    })
  }
}
