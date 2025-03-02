const noopFn = _ => _

const toString = x => Object.prototype.toString.call(x)

const isArray = x => toString(x) === '[object Array]'

const isPlainObject = x => toString(x) === '[object Object]'

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

const assert = (condition, msg) => {
  if (!condition) {
    throw new Error('[vue-function-api] ' + msg)
  }
}

const assign =
  Object.assign ||
  function assign (t) {
    for (var i = 1, n = arguments.length; i < n; i++) {
      const s = arguments[i]
      for (var p in s) {
        if (hasOwn(s, p)) {
          t[p] = s[p]
        }
      }
    }
    return t
  }

function __extends (d, b) {
  assign(d, b)
  function __ () {
    this.constructor = d
  }
  if (b == null) {
    d.prototype = Object.create(b)
  } else {
    __.prototype = b.prototype
    d.prototype = new __()
  }
}

var currentVue = null
function getCurrentVue () {
  assert(currentVue, 'must call Vue.use(plugin) before using any function.')
  return currentVue
}
function setCurrentVue (vue) {
  currentVue = vue
}
function vueWarn (msg, vm) {
  return getCurrentVue().util.warn(msg, vm)
}

var currentVM = null
function getCurrentVM () {
  return currentVM
}
function setCurrentVM (vue) {
  currentVM = vue
}

function ensuerCurrentVMInFn (hook) {
  var vm = getCurrentVM()
  assert(vm, '"' + hook + '" get called outside of "setup()"')
  return vm
}

function AbstractWrapper () {}

AbstractWrapper.prototype.setPropertyName = function (name) {
  this._name = name
}

function isWrapper (obj) {
  return obj instanceof AbstractWrapper
}

function observable (obj) {
  var Vue = getCurrentVue()
  if (Vue.observable) {
    return Vue.observable(obj)
  } else {
    var silent = Vue.config.silent
    Vue.config.silent = true
    var vm = new Vue({ data: { $$state: obj }})
    Vue.config.silent = silent
    return vm._data.$$state
  }
}

function upWrapping (obj) {
  var keys = Object.keys(obj)
  for (var index = 0; index < keys.length; index++) {
    var key = keys[index]
    var value_1 = obj[key]
    if (isWrapper(value_1)) {
      obj[key] = value_1.value
    } else if (isPlainObject(value_1) || isArray(value_1)) {
      obj[key] = upWrapping(value_1)
    }
  }
  return obj
}

// state
export function state (value) {
  return observable(upWrapping(value))
}

// value
var ValueWrapper = (function (_super) {
  __extends(ValueWrapper, _super)

  function ValueWrapper (_interal) {
    var _this = _super.call(this) || this
    _this._interal = _interal
    return _this
  }

  Object.defineProperty(ValueWrapper.prototype, 'value', {
    get: function () {
      return this._interal.$$state
    },
    set: function (v) {
      this._interal.$$state = v
    },
    enumerable: true,
    configurable: true
  })

  return ValueWrapper
})(AbstractWrapper)

export function value (value) {
  return new ValueWrapper(observable({ $$state: upWrapping(value) }))
}

// Computed
var ComputedWrapper = (function (_super) {
  __extends(ComputedWrapper, _super)

  function ComputedWrapper (_interal) {
    var _this = _super.call(this) || this
    _this._interal = _interal
    return _this
  }

  Object.defineProperty(ComputedWrapper.prototype, 'value', {
    get: function () {
      return this._interal.read()
    },
    set: function (val) {
      if (!this._interal.write) {
        assert(
          false,
          `Computed property ${
            this._name
          } was assigned to but it has no setter.`
        )
      } else {
        this._interal.write(val)
      }
    },
    enumerable: true,
    configurable: true
  })

  return ComputedWrapper
})(AbstractWrapper)

function compoundComputed (computed) {
  var Vue = getCurrentVue()
  var silent = Vue.config.silent
  Vue.config.silent = true
  var reactive = new Vue({
    computed: computed
  })
  Vue.config.silent = silent
  return reactive
}

export function computed (getter, setter) {
  var computedHost = compoundComputed({
    $$state: setter
      ? {
        get: getter,
        set: setter
      }
      : getter
  })

  return new ComputedWrapper({
    read: function () {
      return computedHost.$$state
    },
    write: function (v) {
      computedHost.$$state = v
    }
  })
}

// provide
export function provide (provideOption) {
  if (provideOption) {
    var vm = ensuerCurrentVMInFn('provide')
    vm._provided =
      typeof provideOption === 'function'
        ? provideOption.call(vm)
        : provideOption
  }
}

// inject
function resolveInject (provideKey, vm) {
  var source = vm
  while (source) {
    if (source._provided && hasOwn(source._provided, provideKey)) {
      return source._provided[provideKey]
    }
    source = source.$parent
  }
  vueWarn('Injection "' + String(provideKey) + '" not found', vm)
}

export function inject (injectKey) {
  if (injectKey) {
    var vm = ensuerCurrentVMInFn('inject')
    return resolveInject(injectKey, vm)
  }
}

// LifeCycle
var genName = function (name) {
  return 'on' + (name[0].toUpperCase() + name.slice(1))
}

function createLifeCycle (lifeCyclehook) {
  return function (callback) {
    var vm = ensuerCurrentVMInFn(genName(lifeCyclehook))
    vm.$on('hook:' + lifeCyclehook, callback)
  }
}

function createLifeCycles (lifeCyclehooks, name) {
  return function (callback) {
    var vm = ensuerCurrentVMInFn(genName(name))
    lifeCyclehooks.forEach(function (lifeCyclehook) {
      return vm.$on('hook:' + lifeCyclehook, callback)
    })
  }
}

export const onCreated = createLifeCycle('created')
export const onBeforeMount = createLifeCycle('beforeMount')
export const onMounted = createLifeCycle('mounted')
export const onBeforeUpdate = createLifeCycle('beforeUpdate')
export const onUpdated = createLifeCycle('updated')
export const onActivated = createLifeCycle('activated')
export const onDeactivated = createLifeCycle('deactivated')
export const onBeforeDestroy = createLifeCycle('beforeDestroy')
export const onDestroyed = createLifeCycle('destroyed')
export const onErrorCaptured = createLifeCycle('errorCaptured')

// only one event will be fired between destroyed and deactivated when an unmount occurs
export const onUnmounted = createLifeCycles(
  ['destroyed', 'deactivated'],
  'unmounted'
)

// watch
var WatcherPreFlushQueueKey = 'vfa.key.preFlushQueue'
var WatcherPostFlushQueueKey = 'vfa.key.postFlushQueue'

function hasWatchEnv (vm) {
  return vm[WatcherPreFlushQueueKey] !== undefined
}

function installWatchEnv (vm) {
  vm[WatcherPreFlushQueueKey] = []
  vm[WatcherPostFlushQueueKey] = []
  vm.$on('hook:beforeUpdate', createFlusher(WatcherPreFlushQueueKey))
  vm.$on('hook:updated', createFlusher(WatcherPostFlushQueueKey))
}

function createFlusher (key) {
  return function () {
    flushQueue(this, key)
  }
}

function flushQueue (vm, key) {
  var queue = vm[key]
  for (var index = 0; index < queue.length; index++) {
    queue[index]()
  }
  queue.length = 0
}

function flushWatcherCallback (vm, fn, mode) {
  // flush all when beforeUpdate and updated are not fired
  function fallbackFlush () {
    vm.$nextTick(function () {
      if (vm[WatcherPreFlushQueueKey].length) {
        flushQueue(vm, WatcherPreFlushQueueKey)
      }
      if (vm[WatcherPostFlushQueueKey].length) {
        flushQueue(vm, WatcherPostFlushQueueKey)
      }
    })
  }
  switch (mode) {
    case 'pre':
      fallbackFlush()
      return vm[WatcherPreFlushQueueKey].push(fn)
    case 'post':
      fallbackFlush()
      return vm[WatcherPostFlushQueueKey].push(fn)
    case 'auto':
    case 'sync':
      return fn()
    default:
      return assert(
        false,
        'flush must be one of ["post", "pre", "sync"], but got ' + mode
      )
  }
}

function createSingleSourceWatcher (vm, source, cb, options) {
  var getter = !isWrapper(source)
    ? source
    : function () {
      return source.value
    }

  var callbackRef = function (n, o) {
    callbackRef = flush
    if (!options.lazy) {
      cb(n, o)
    } else {
      flush(n, o)
    }
  }

  var flush = function (n, o) {
    flushWatcherCallback(
      vm,
      function () {
        cb(n, o)
      },
      options.flush
    )
  }

  return vm.$watch(
    getter,
    function (n, o) {
      callbackRef(n, o)
    },
    {
      immediate: !options.lazy,
      deep: options.deep,
      sync: options.flush === 'sync'
    }
  )
}

function createMuiltSourceWatcher (vm, sources, cb, options) {
  var execCallbackAfterNumRun = options.lazy ? false : sources.length
  var pendingCallback = false
  var watcherContext = []

  function execCallback () {
    cb.apply(
      vm,
      watcherContext.reduce(
        function (acc, ctx) {
          acc[0].push(ctx.value)
          acc[1].push(ctx.oldValue)
          return acc
        },
        [[], []]
      )
    )
  }

  var callbackRef = function () {
    if (execCallbackAfterNumRun !== false) {
      if (--execCallbackAfterNumRun === 0) {
        execCallbackAfterNumRun = false
        callbackRef = flush
        execCallback()
      }
    } else {
      callbackRef = flush
      flush()
    }
  }

  var flush = function () {
    if (!pendingCallback) {
      pendingCallback = true
      flushWatcherCallback(
        vm,
        function () {
          pendingCallback = false
          execCallback()
        },
        options.flush
      )
    }
  }

  sources.forEach(function (source) {
    var getter = !isWrapper(source)
      ? source
      : function () {
        return source.value
      }
    var watcherCtx = {}

    // must push watcherCtx before create watcherStopHandle
    watcherContext.push(watcherCtx)
    watcherCtx.watcherStopHandle = vm.$watch(
      getter,
      function (n, o) {
        watcherCtx.value = n
        watcherCtx.oldValue = o
        callbackRef()
      },
      {
        immediate: !options.lazy,
        deep: options.deep,
        sync: options.flush === 'sync'
      }
    )
  })

  return function stop () {
    watcherContext.forEach(function (ctx) {
      return ctx.watcherStopHandle()
    })
    watcherContext = []
  }
}

export function watch (source, cb, options = {}) {
  var opts = assign({ lazy: false, deep: false, flush: 'post' }, options)
  var vm = getCurrentVM()

  if (!vm) {
    var Vue_1 = getCurrentVue()
    var silent = Vue_1.config.silent
    Vue_1.config.silent = true
    vm = new Vue_1()
    Vue_1.config.silent = silent
    opts.flush = 'auto'
  }

  if (!hasWatchEnv(vm)) {
    installWatchEnv(vm)
  }

  return isArray(source)
    ? createMuiltSourceWatcher(vm, source, cb, opts)
    : createSingleSourceWatcher(vm, source, cb, opts)
}

// plugin
var sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noopFn,
  set: noopFn
}

function proxy (target, key, getter, setter) {
  sharedPropertyDefinition.get = getter
  sharedPropertyDefinition.set = setter || noopFn
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function _mixin (Vue) {
  Vue.mixin({ created: vuexInit })

  function vuexInit () {
    var vm = this
    var setup = vm.$options.setup

    if (setup) {
      if (typeof setup !== 'function') {
        return vueWarn('The "setup" option should be a function', vm)
      }

      var binding_1

      try {
        setCurrentVM(vm)
        binding_1 = setup.call(vm, vm.$props)
      } catch (err) {
        vueWarn('there is an error occuring in "setup"', vm)
        console.warn(err)
      } finally {
        setCurrentVM(null)
      }

      if (!binding_1) return

      assert(
        isPlainObject(binding_1),
        `"setup" must return a "Object", get "${toString(binding_1)}"`
      )

      Object.keys(binding_1).forEach(function (name) {
        var bindingValue = binding_1[name]
        if (isWrapper(bindingValue)) {
          bindingValue.setPropertyName(name)
          proxy(
            vm,
            name,
            function () {
              return bindingValue.value
            },
            function (val) {
              bindingValue.value = val
            }
          )
        } else {
          vm[name] = bindingValue
        }
      })
    }
  }
}

function mergeData (to, from) {
  if (from) {
    var keys = Object.keys(from)
    for (var i = 0; i < keys.length; i++) {
      const key = keys[i]

      if (key !== '__ob__') {
        const toVal = to[key]
        const fromVal = from[key]

        if (!hasOwn(to, key)) {
          to[key] = fromVal
        } else if (
          toVal !== fromVal &&
          (isPlainObject(toVal) && !isWrapper(toVal)) &&
          (isPlainObject(fromVal) && !isWrapper(fromVal))
        ) {
          mergeData(toVal, fromVal)
        }
      }
    }
  }
  return to
}

export const plugin = {
  install: function install (Vue) {
    if (currentVue && currentVue === Vue) {
      return assert(
        false,
        'already installed. Vue.use(plugin) should be called only once'
      )
    }

    setCurrentVue(Vue)

    Vue.config.optionMergeStrategies.setup = function (parent, child) {
      return function mergedSetupFn (props) {
        return mergeData(
          typeof child === 'function' ? child.call(this, props) || {} : {},
          typeof parent === 'function' ? parent.call(this, props) || {} : {}
        )
      }
    }

    _mixin(Vue)
  }
}
