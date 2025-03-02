var emptyObject = Object.freeze({})

function isUndef (v) {
  return v === undefined || v === null
}

function isDef (v) {
  return v !== undefined && v !== null
}

function isTrue (v) {
  return v === true
}

function isFalse (v) {
  return v === false
}

function isPrimitive (value) {
  return (typeof value === 'string' || typeof value === 'number' ||
    typeof value === 'symbol' || typeof value === 'boolean')
}

function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

var _toString = Object.prototype.toString

function isPlainObject (obj) {
  return _toString.call(obj) === '[object Object]'
}

function isRegExp (v) {
  return _toString.call(v) === '[object RegExp]'
}

function isValidArrayIndex (val) {
  var n = parseFloat(String(val))
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

function toString (val) {
  return val == null ? '' : (typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val))
}

function toNumber (val) {
  var n = parseFloat(val)
  return isNaN(n) ? val : n
}

function makeMap (str, expectsLowerCase) {
  var map = Object.create(null)
  var list = str.split(',')
  for (var i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase ? function (val) { return map[val.toLowerCase()] }
    : function (val) { return map[val] }
}

var isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

function remove (arr, item) {
  if (arr.length) {
    var index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

function hasOwn (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function cached (fn) {
  var cache = Object.create(null)
  return function cachedFn (str) {
    var hit = cache[str]
    return hit || (cache[str] = fn(str))
  }
}

var camelizeRE = /-(\w)/g
var camelize = cached(function (str) {
  return str.replace(camelizeRE, function (_, c) {
    return c ? c.toUpperCase() : ''
  })
})

var capitalize = cached(function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

var hyphenateRE = /\B([A-Z])/g
var hyphenate = cached(function (str) {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

function bind (fn, ctx) {
  return fn.bind(ctx)
}

function toArray (list, start) {
  start = start || 0
  var i = list.length - start
  var ret = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

function extend (to, _from) {
  for (var key in _from) {
    to[key] = _from[key]
  }
  return to
}

function arrToObject (arr) {
  var res = {}
  for (var i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i])
    }
  }
  return res
}

function noop (a, b, c) {}

var no = function (a, b, c) {
  return false
}

var identity = function (_) {
  return _
}

function looseEqual (a, b) {
  if (a === b) {
    return true
  }
  var isObjectA = isObject(a)
  var isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    try {
      var isArrayA = Array.isArray(a)
      var isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        return a.length === b.length && a.every(function (e, i) {
          return looseEqual(e, b[i])
        })
      } else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
      } else if (!isArrayA && !isArrayB) {
        var keysA = Object.keys(a)
        var keysB = Object.keys(b)
        return keysA.length === keysB.length && keysA.every(function (key) {
          return looseEqual(a[key], b[key])
        })
      } else {
        return false
      }
    } catch (e) {
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b)
  } else {
    return false
  }
}

function looseIndexOf (arr, val) {
  for (var i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) {
      return i
    }
  }
  return -1
}

function once (fn) {
  var called = false
  return function () {
    if (!called) {
      called = true
      fn.apply(this, arguments)
    }
  }
}

var ASSET_TYPES = [ 'component', 'directive', 'filter' ]
var LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'errorCaptured'
]

var config = ({
  optionMergeStrategies: Object.create(null),
  silent: false,
  performance: false,
  errorHandler: null,
  warnHandler: null,
  ignoredElements: [],
  keyCodes: Object.create(null),
  isReservedTag: no,
  isReservedAttr: no,
  isUnknownElement: no,
  getTagNamespace: noop,
  parsePlatformTagName: identity,
  mustUseProp: no,
  async: true,
  _lifecycleHooks: LIFECYCLE_HOOKS
})

function isReserved (str) {
  var c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

function def (obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

var bailRE = /[^\w.$]/

function parsePath (path) {
  if (bailRE.test(path)) {
    return
  }
  var segments = path.split('.')
  var len = segments.length
  return function (obj) {
    var p = 0
    while (obj && p < len) {
      obj = obj[segments[p++]]
    }
    return obj
  }
}

function isNative (Ctor) {
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}

var uid = 0
var Dep = function Dep () {
  this.id = uid++
  this.subs = []
}

Dep.prototype.addSub = function addSub (sub) {
  this.subs.push(sub)
}

Dep.prototype.removeSub = function removeSub (sub) {
  remove(this.subs, sub)
}

Dep.prototype.depend = function depend () {
  if (Dep.target) {
    Dep.target.addDep(this)
  }
}

Dep.prototype.notify = function notify () {
  var subs = this.subs.slice()
  for (var i = 0, l = subs.length; i < l; i++) {
    subs[i].update()
  }
}

Dep.target = null
var targetStack = []
function pushTarget (target) {
  targetStack.push(target)
  Dep.target = target
}

function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}

var VNode = function VNode (tag, data, children, text, elm, context, componentOptions, asyncFactory) {
  this.tag = tag
  this.data = data
  this.children = children
  this.text = text
  this.elm = elm
  this.ns = undefined
  this.context = context
  this.fnContext = undefined
  this.fnOptions = undefined
  this.fnScopeId = undefined
  this.key = data && data.key
  this.componentOptions = componentOptions
  this.componentInstance = undefined
  this.parent = undefined
  this.raw = false
  this.isStatic = false
  this.isRootInsert = true
  this.isComment = false
  this.isCloned = false
  this.isOnce = false
  this.asyncFactory = asyncFactory
  this.asyncMeta = undefined
  this.isAsyncPlaceholder = false
}

Object.defineProperties(VNode.prototype, {
  child: {
    configurable: true,
    get: function () { return this.componentInstance }
  }
})

var createEmptyVNode = function (text = '') {
  var node = new VNode()
  node.text = text
  node.isComment = true
  return node
}

function createTextVNode (val) {
  return new VNode(undefined, undefined, undefined, String(val))
}

function cloneVNode (vnode) {
  var cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true
  return cloned
}

var arrayProto = Array.prototype
var arrayMethods = Object.create(arrayProto)
var arrayKeys = Object.getOwnPropertyNames(arrayMethods)
;['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(function (method) {
  var original = arrayProto[method]
  def(arrayMethods, method, function mutator () {
    var args = []
    var len = arguments.length
    while (len--) {
      args[len] = arguments[len]
    }

    var result = original.apply(this, args)
    var inserted = (method === 'push' || method === 'unshift') ? args : (method === 'splice' ? args.slice(2) : false)
    if (inserted) {
      this.__ob__.observeArray(inserted)
    }
    this.__ob__.dep.notify()
    return result
  })
})

var shouldObserve = true
function toggleObserving (value) {
  shouldObserve = value
}

var Observer = function Observer (value) {
  this.value = value
  this.dep = new Dep()
  this.vmCount = 0

  def(value, '__ob__', this)
  if (Array.isArray(value)) {
    for (var i = 0, l = arrayKeys.length; i < l; i++) {
      var key = arrayKeys[i]
      def(value, key, arrayMethods[key])
    }
    this.observeArray(value)
  } else {
    this.walk(value)
  }
}

Observer.prototype.walk = function walk (obj) {
  var keys = Object.keys(obj)
  for (var i = 0; i < keys.length; i++) {
    defineReactive$$1(obj, keys[i])
  }
}

Observer.prototype.observeArray = function observeArray (items) {
  for (var i = 0, l = items.length; i < l; i++) {
    observe(items[i])
  }
}

function observe (value, asRootData) {
  if (!isObject(value) || value instanceof VNode) {
    return
  }

  var ob
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (shouldObserve && (Array.isArray(value) || isPlainObject(value)) && Object.isExtensible(value) && !value._isVue) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

function defineReactive$$1 (obj, key, val, customSetter, shallow) {
  var dep = new Dep()
  var property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }
  var getter = property && property.get
  var setter = property && property.set
  var onlyGetter = getter && !setter

  val = arguments.length === 2 ? obj[key] : val
  var childOb = !shallow && observe(val)

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      var value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          Array.isArray(value) && dependArray(value)
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      if (!onlyGetter) {
        var value = getter ? getter.call(obj) : val
        if (newVal === value) {
          return
        }
        if (setter) {
          setter.call(obj, newVal)
        } else {
          val = newVal
        }
        childOb = !shallow && observe(newVal)
        dep.notify()
      }
    }
  })
}

function set (target, key, val) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  var ob = target.__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive$$1(ob.value, key, val)
  ob.dep.notify()
  return val
}

function del (target, key) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  var ob = target.__ob__
  if (target._isVue || (ob && ob.vmCount) || !hasOwn(target, key)) {
    return
  }
  delete target[key]
  ob && ob.dep.notify()
}

function dependArray (value) {
  for (var e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    Array.isArray(e) && dependArray(e)
  }
}

var strats = config.optionMergeStrategies

function defaultStrat (parentVal, childVal) {
  return childVal === undefined ? parentVal : childVal
}

function mergeData (to, from) {
  if (from) {
    var key, toVal, fromVal
    var keys = Object.keys(from)
    for (var i = 0; i < keys.length; i++) {
      key = keys[i]
      toVal = to[key]
      fromVal = from[key]
      if (!hasOwn(to, key)) {
        set(to, key, fromVal)
      } else if (toVal !== fromVal && isPlainObject(toVal) && isPlainObject(fromVal)) {
        mergeData(toVal, fromVal)
      }
    }
  }
  return to
}

function mergeHook (parentVal, childVal) {
  if (childVal) {
    var result = Array.isArray(childVal) ? childVal : [childVal]
    return parentVal ? parentVal.concat(childVal.filter(function (c) {
      return parentVal.indexOf(c) === -1
    })) : result
  } else {
    return parentVal
  }
}

LIFECYCLE_HOOKS.forEach(function (hook) {
  strats[hook] = mergeHook
})

function mergeAssets (parentVal, childVal) {
  var res = Object.create(parentVal || null)
  return childVal ? extend(res, childVal) : res
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

strats.watch = function (parentVal, childVal) {
  if (!childVal) {
    return Object.create(parentVal || null)
  }
  if (!parentVal) {
    return childVal
  }
  var ret = {}
  extend(ret, parentVal)
  for (var key$1 in childVal) {
    var parent = ret[key$1]
    var child = childVal[key$1]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key$1] = parent ? parent.concat(child) : (Array.isArray(child) ? child : [child])
  }
  return ret
}

strats.data = strats.provide = function (parentVal, childVal, vm) {
  return function mergedDataFn () {
    var context = !vm ? this : vm
    var instanceData = typeof childVal === 'function' ? childVal.call(context, context) : childVal
    var defaultData = typeof parentVal === 'function' ? parentVal.call(context, context) : parentVal
    if (!instanceData) {
      return defaultData
    }
    if (!defaultData) {
      return instanceData
    }
    return mergeData(instanceData, defaultData)
  }
}

strats.props = strats.methods = strats.inject = strats.computed = function (parentVal, childVal) {
  if (!parentVal) {
    return childVal
  }
  var ret = Object.create(null)
  extend(ret, parentVal)
  if (childVal) {
    extend(ret, childVal)
  }
  return ret
}

function normalizeProps (options) {
  var props = options.props
  if (!props) {
    return
  }
  var res = {}
  var i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      }
    }
  } else if (isPlainObject(props)) {
    for (var key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val) ? val : { type: val }
    }
  }
  options.props = res
}

function normalizeInject (options) {
  var inject = options.inject
  if (!inject) {
    return
  }
  var normalized = options.inject = {}
  var val
  if (Array.isArray(inject)) {
    for (var i = 0; i < inject.length; i++) {
      val = inject[i]
      normalized[val] = { from: val }
    }
  } else if (isPlainObject(inject)) {
    for (var key in inject) {
      val = inject[key]
      normalized[key] = isPlainObject(val) ? extend({ from: key }, val) : { from: val }
    }
  }
}

function normalizeDirectives (options) {
  var dirs = options.directives
  if (dirs) {
    for (var key in dirs) {
      var def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

function mergeOptions (parent, child, vm) {
  if (typeof child === 'function') {
    child = child.options
  }

  normalizeProps(child)
  normalizeInject(child)
  normalizeDirectives(child)

  if (!child._base) {
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    if (child.mixins) {
      for (var i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }

  var options = {}
  var key
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }

  function mergeField (key) {
    var strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

function resolveAsset (options, type, id) {
  if (typeof id !== 'string') {
    return
  }
  var assets = options[type]
  if (hasOwn(assets, id)) {
    return assets[id]
  }
  var camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) {
    return assets[camelizedId]
  }
  var PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) {
    return assets[PascalCaseId]
  }
  var res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  return res
}

function validateProp (key, propOptions, propsData, vm) {
  var prop = propOptions[key]
  var absent = !hasOwn(propsData, key)
  var value = propsData[key]
  var booleanIndex = getTypeIndex(Boolean, prop.type)
  if (booleanIndex > -1) {
    if (absent && !hasOwn(prop, 'default')) {
      value = false
    } else if (value === '' || value === hyphenate(key)) {
      // only cast empty string / same name to boolean if boolean has higher priority
      var stringIndex = getTypeIndex(String, prop.type)
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true
      }
    }
  }
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key)
    var prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value)
    toggleObserving(prevShouldObserve)
  }
  return value
}

function getPropDefaultValue (vm, prop, key) {
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  var def = prop.default
  if (vm && vm.$options.propsData && vm.$options.propsData[key] === undefined && vm._props[key] !== undefined) {
    // the raw prop value was also undefined from previous render,
    // return previous default value to avoid unnecessary watcher trigger
    return vm._props[key]
  } else {
    return (typeof def === 'function' && getType(prop.type) !== 'Function') ? def.call(vm) : def
  }
}

function getType (fn) {
  var match = fn && fn.toString().match(/^\s*function (\w+)/)
  return match ? match[1] : ''
}

function isSameType (a, b) {
  return getType(a) === getType(b)
}

function getTypeIndex (type, expectedTypes) {
  if (!Array.isArray(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }
  for (var i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }
  return -1
}

function handleError (err, vm, info) {
  if (vm) {
    var cur = vm
    while ((cur = cur.$parent)) {
      var hooks = cur.$options.errorCaptured
      if (hooks) {
        for (var i = 0; i < hooks.length; i++) {
          var capture = hooks[i].call(cur, err, vm, info) === false
          if (capture) {
            return
          }
        }
      }
    }
  }
  globalHandleError(err, vm, info)
}

function globalHandleError (err, vm, info) {
  try {
    return (config.errorHandler || console.error).call(console, err, vm, info)
  } catch (e) {
    console.error(e, null, 'config.errorHandler')
  }
}

var callbacks = []
var pending = false

function flushCallbacks () {
  pending = false
  var copies = callbacks.slice(0)
  callbacks.length = 0
  for (var i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

var macroTimerFunc
var useMacroTask = false
if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  macroTimerFunc = function () {
    setImmediate(flushCallbacks)
  }
} else if (typeof MessageChannel !== 'undefined' && isNative(MessageChannel)) {
  var channel = new MessageChannel()
  var port = channel.port2
  channel.port1.onmessage = flushCallbacks
  macroTimerFunc = function () {
    port.postMessage(1)
  }
} else {
  macroTimerFunc = function () {
    setTimeout(flushCallbacks, 0)
  }
}

var p = Promise.resolve()
var microTimerFunc = function () {
  p.then(flushCallbacks)
}

function withMacroTask (fn) {
  return fn._withTask || (fn._withTask = function () {
    useMacroTask = true
    try {
      return fn.apply(null, arguments)
    } finally {
      useMacroTask = false
    }
  })
}

function nextTick (cb, ctx) {
  var _resolve
  callbacks.push(function () {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) {
    pending = true
    return useMacroTask ? macroTimerFunc() : microTimerFunc()
  }
  if (!cb) {
    return new Promise(function (resolve) {
      _resolve = resolve
    })
  }
}

var seenObjects = new Set()
function traverse (val) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function _traverse (val, seen) {
  var i, keys
  var isA = Array.isArray(val)
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  if (val.__ob__) {
    var depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    while (i--) {
      _traverse(val[i], seen)
    }
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) {
      _traverse(val[keys[i]], seen)
    }
  }
}

var normalizeEvent = cached(function (name) {
  var passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  var once$$1 = name.charAt(0) === '~'
  name = once$$1 ? name.slice(1) : name
  var capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return { name: name, once: once$$1, capture: capture, passive: passive }
})

function createFnInvoker (fns) {
  function invoker () {
    var arguments$1 = arguments
    var fns = invoker.fns

    if (Array.isArray(fns)) {
      var cloned = fns.slice()
      for (var i = 0; i < cloned.length; i++) {
        cloned[i].apply(null, arguments$1)
      }
    } else {
      return fns.apply(null, arguments)
    }
  }
  invoker.fns = fns
  return invoker
}

function updateListeners (on, oldOn, add, remove$$1, createOnceHandler) {
  var name, cur, old, event
  for (name in on) {
    cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name)

    if (!isUndef(cur)) {
      if (isUndef(old)) {
        if (isUndef(cur.fns)) {
          cur = on[name] = createFnInvoker(cur)
        }
        if (isTrue(event.once)) {
          cur = on[name] = createOnceHandler(event.name, cur, event.capture)
        }
        add(event.name, cur, event.capture, event.passive, event.params)
      } else if (cur !== old) {
        old.fns = cur
        on[name] = old
      }
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove$$1(event.name, oldOn[name], event.capture)
    }
  }
}

function mergeVNodeHook (def, hookKey, hook) {
  if (def instanceof VNode) {
    def = def.data.hook || (def.data.hook = {})
  }
  var invoker
  var oldHook = def[hookKey]

  function wrappedHook () {
    hook.apply(this, arguments)
    // important: remove merged hook to ensure it's called only once and prevent memory leak
    remove(invoker.fns, wrappedHook)
  }

  if (isUndef(oldHook)) {
    // no existing hook
    invoker = createFnInvoker([wrappedHook])
  } else {
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
      // already a merged invoker
      invoker = oldHook
      invoker.fns.push(wrappedHook)
    } else {
      // existing plain hook
      invoker = createFnInvoker([oldHook, wrappedHook])
    }
  }

  invoker.merged = true
  def[hookKey] = invoker
}

function extractPropsFromVNodeData (data, Ctor) {
  // we are only extracting raw values here.
  // validation and default values are handled in the child component itself.
  var propOptions = Ctor.options.props
  if (isUndef(propOptions)) {
    return
  }
  var res = {}
  var attrs = data.attrs
  var props = data.props
  if (isDef(attrs) || isDef(props)) {
    for (var key in propOptions) {
      var altKey = hyphenate(key)
      checkProp(res, props, key, altKey, true) || checkProp(res, attrs, key, altKey, false)
    }
  }
  return res
}

function checkProp (res, hash, key, altKey, preserve) {
  if (isDef(hash)) {
    return false
  }
  if (hasOwn(hash, key)) {
    res[key] = hash[key]
    if (!preserve) {
      delete hash[key]
    }
    return true
  } else if (hasOwn(hash, altKey)) {
    res[key] = hash[altKey]
    if (!preserve) {
      delete hash[altKey]
    }
    return true
  }
}

function simpleNormalizeChildren (children) {
  for (var i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children)
    }
  }
  return children
}

// 2. When the children contains constructs that always generated nested Arrays,
// e.g. <template>, <slot>, v-for, or when the children is provided by user
// with hand-written render functions / JSX. In such cases a full normalization
// is needed to cater to all possible types of children values.
function normalizeChildren (children) {
  return isPrimitive(children) ? [createTextVNode(children)]
    : Array.isArray(children) ? normalizeArrayChildren(children) : undefined
}

function isTextNode (node) {
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}

function normalizeArrayChildren (children, nestedIndex) {
  var res = []
  var i, c, lastIndex, last
  for (i = 0; i < children.length; i++) {
    c = children[i]
    if (isUndef(c) || typeof c === 'boolean') {
      continue
    }
    lastIndex = res.length - 1
    last = res[lastIndex]

    if (Array.isArray(c)) {
      if (c.length > 0) {
        c = normalizeArrayChildren(c, ((nestedIndex || '') + '_' + i))
        // merge adjacent text nodes
        if (isTextNode(c[0]) && isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + (c[0]).text)
          c.shift()
        }
        res.push.apply(res, c)
      }
    } else if (isPrimitive(c)) {
      if (isTextNode(last)) {
        res[lastIndex] = createTextVNode(last.text + c)
      } else if (c !== '') {
        res.push(createTextVNode(c))
      }
    } else {
      if (isTextNode(c) && isTextNode(last)) {
        res[lastIndex] = createTextVNode(last.text + c.text)
      } else {
        // default key for nested array children (likely generated by v-for)
        if (isTrue(children._isVList) && isDef(c.tag) && isUndef(c.key) && isDef(nestedIndex)) {
          c.key = '__vlist' + nestedIndex + '_' + i + '__'
        }
        res.push(c)
      }
    }
  }
  return res
}

function ensureCtor (comp, base) {
  comp = comp.__esModule ? comp.default : comp
  return isObject(comp) ? base.extend(comp) : comp
}

function createAsyncPlaceholder (factory, data, context, children, tag) {
  var node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = {
    data: data,
    context: context,
    children: children,
    tag: tag
  }
  return node
}

function resolveAsyncComponent (factory, baseCtor, context) {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (isDef(factory.contexts)) {
    factory.contexts.push(context)
    return
  }

  var contexts = factory.contexts = [context]

  var forceRender = function (renderCompleted) {
    for (var i = 0, l = contexts.length; i < l; i++) {
      contexts[i].$forceUpdate()
    }
    if (renderCompleted) {
      contexts.length = 0
    }
  }

  var resolve = once(function (res) {
    factory.resolved = ensureCtor(res, baseCtor)
    forceRender(true)
  })

  var reject = once(function () {
    if (isDef(factory.errorComp)) {
      factory.error = true
      forceRender(true)
    }
  })

  var res = factory(resolve, reject)

  if (isObject(res)) {
    if (typeof res.then === 'function') {
      if (isUndef(factory.resolved)) {
        res.then(resolve, reject)
      }
    } else if (isDef(res.component) && typeof res.component.then === 'function') {
      res.component.then(resolve, reject)
      if (isDef(res.error)) {
        factory.errorComp = ensureCtor(res.error, baseCtor)
      }

      if (isDef(res.loading)) {
        factory.loadingComp = ensureCtor(res.loading, baseCtor)
        if (res.delay === 0) {
          factory.loading = true
        } else {
          setTimeout(function () {
            if (isUndef(factory.resolved) && isUndef(factory.error)) {
              factory.loading = true
              forceRender(false)
            }
          }, res.delay || 200)
        }
      }

      if (isDef(res.timeout)) {
        setTimeout(function () {
          if (isUndef(factory.resolved)) {
            reject(null)
          }
        }, res.timeout)
      }
    }
  }

  return factory.loading ? factory.loadingComp : factory.resolved
}

function isAsyncPlaceholder (node) {
  return node.isComment && node.asyncFactory
}

function getFirstComponentChild (children) {
  if (Array.isArray(children)) {
    for (var i = 0; i < children.length; i++) {
      var c = children[i]
      if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
        return c
      }
    }
  }
}

function initEvents (vm) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  var listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

var target
function add (event, fn) {
  target.$on(event, fn)
}

function remove$1 (event, fn) {
  target.$off(event, fn)
}

function createOnceHandler (event, fn) {
  var _target = target
  return function onceHandler () {
    var res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

function updateComponentListeners (vm, listeners, oldListeners) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove$1, createOnceHandler, vm)
  target = undefined
}

function eventsMixin (Vue) {
  var hookRE = /^hook:/
  Vue.prototype.$on = function (event, fn) {
    var vm = this
    if (Array.isArray(event)) {
      for (var i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  Vue.prototype.$once = function (event, fn) {
    var vm = this

    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }

  Vue.prototype.$off = function (event, fn) {
    var vm = this
    // all
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      for (var i$1 = 0, l = event.length; i$1 < l; i$1++) {
        vm.$off(event[i$1], fn)
      }
      return vm
    }
    // specific event
    var cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    var cb
    var i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  Vue.prototype.$emit = function (event) {
    var vm = this
    var cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      var args = toArray(arguments, 1)
      for (var i = 0, l = cbs.length; i < l; i++) {
        try {
          cbs[i].apply(vm, args)
        } catch (e) {
          handleError(e, vm, 'event handler for "' + event + '"')
        }
      }
    }
    return vm
  }
}

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
function resolveSlots (children, context) {
  var slots = {}
  if (!children) {
    return slots
  }
  for (var i = 0, l = children.length; i < l; i++) {
    var child = children[i]
    var data = child.data
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) && data && data.slot != null) {
      var name = data.slot
      var slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }
    } else {
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace
  for (var name$1 in slots) {
    if (slots[name$1].every(isWhitespace)) {
      delete slots[name$1]
    }
  }
  return slots
}

function isWhitespace (node) {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}

function resolveScopedSlots (fns, res) {
  res = res || {}
  for (var i = 0; i < fns.length; i++) {
    if (Array.isArray(fns[i])) {
      resolveScopedSlots(fns[i], res)
    } else {
      res[fns[i].key] = fns[i].fn
    }
  }
  return res
}

var activeInstance = null

function setActiveInstance (vm) {
  var prevActiveInstance = activeInstance
  activeInstance = vm
  return function () {
    activeInstance = prevActiveInstance
  }
}

function initLifecycle (vm) {
  var options = vm.$options

  // locate first non-abstract parent
  var parent = options.parent
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }

  vm.$parent = parent
  vm.$root = parent ? parent.$root : vm
  vm.$children = []
  vm.$refs = {}
  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}

function lifecycleMixin (Vue) {
  Vue.prototype._update = function (vnode) {
    var vm = this
    var prevEl = vm.$el
    var prevVnode = vm._vnode
    var restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points based on the rendering backend used.
    if (!prevVnode) {
      vm.$el = vm.__patch__(vm.$el, vnode, false)
    } else {
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are updated in a parent's updated hook.
  }

  Vue.prototype.$forceUpdate = function () {
    this._watcher && this._watcher.update()
  }

  Vue.prototype.$destroy = function () {
    var vm = this
    if (vm._isBeingDestroyed) {
      return
    }
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true

    var parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    var i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null)
    callHook(vm, 'destroyed')
    vm.$off()
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

function mountComponent (vm, el) {
  vm.$el = el
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
  }
  callHook(vm, 'beforeMount')

  // we set this to vm._watcher inside the watcher's constructor since the watcher's initial patch may call $forceUpdate
  // (e.g. inside childcomponent's mounted hook), which relies on vm._watcher being already defined
  vm.renderWatcher = new Watcher(vm, function () {
    vm._update(vm._render())
  }, noop, {
    before: function before () {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true)

  // call mounted on self mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}

function updateChildComponent (vm, propsData, listeners, parentVnode, renderChildren) {
  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren
  var hasChildren = !!(
    renderChildren || // has new static slots
    vm.$options._renderChildren || // has old static slots
    parentVnode.data.scopedSlots || // has new scoped slots
    vm.$scopedSlots !== emptyObject // has old scoped slots
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) {
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  if (propsData && vm.$options.props) {
    toggleObserving(false)
    var props = vm._props
    var propKeys = vm.$options._propKeys || []
    for (var i = 0; i < propKeys.length; i++) {
      var key = propKeys[i]
      var propOptions = vm.$options.props
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  var oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (hasChildren) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) {
      return true
    }
  }
  return false
}

function activateChildComponent (vm, direct) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (var i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}

function deactivateChildComponent (vm, direct) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (var i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

function callHook (vm, hook) {
  pushTarget()
  var handlers = vm.$options[hook]
  if (handlers) {
    for (var i = 0, j = handlers.length; i < j; i++) {
      handlers[i].call(vm)
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}

var queue = []
var activatedChildren = []
var has = {}
var waiting = false
var flushing = false
var index = 0

function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  waiting = flushing = false
}

function flushSchedulerQueue () {
  flushing = true
  var watcher, id

  // 1. Components are updated from parent to child. (parent is always created before the child)
  // 2. user watchers are run before its render watcher (user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run, its watchers can be skipped.
  queue.sort(function (a, b) { return a.id - b.id })

  // do not cache length because more watchers might be pushed as we run existing watchers
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    if (watcher.before) {
      watcher.before()
    }
    id = watcher.id
    has[id] = null
    watcher.run()
  }

  // keep copies of post queues before resetting state
  var activatedQueue = activatedChildren.slice()
  var updatedQueue = queue.slice()

  resetSchedulerState()
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)
}

function callUpdatedHooks (queue) {
  var i = queue.length
  while (i--) {
    var watcher = queue[i]
    var vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
function queueActivatedComponent (vm) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (var i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true)
  }
}

function queueWatcher (watcher) {
  var id = watcher.id
  if (has[id] == null) {
    has[id] = true
    if (!flushing) {
      queue.push(watcher)
    } else {
      var i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }
    if (!waiting) {
      waiting = true
      nextTick(flushSchedulerQueue)
    }
  }
}

var uid$1 = 0
var Watcher = function Watcher (vm, expOrFn, cb, options, isRenderWatcher) {
  this.vm = vm
  if (isRenderWatcher) {
    vm._watcher = this
  }
  vm._watchers.push(this)

  this.id = ++uid$1
  this.deep = options ? !!options.deep : false
  this.lazy = options ? !!options.lazy : false
  this.sync = options ? !!options.sync : false
  this.before = options ? options.before : false
  this.cb = cb
  this.active = true // 当前watcher是否已下载
  this.dirty = this.lazy // 检查计算属性依赖是否变动
  this.deps = []
  this.newDeps = []
  this.depIds = new Set()
  this.newDepIds = new Set()
  this.getter = (typeof expOrFn === 'function') ? expOrFn : (parsePath(expOrFn) || noop)
  this.value = this.lazy ? undefined : this.get()
}

Watcher.prototype.get = function get () {
  pushTarget(this)
  var value
  try {
    value = this.getter.call(this.vm, this.vm)
  } finally {
    if (this.deep) {
      traverse(value)
    }
    popTarget()
    this.cleanupDeps()
  }
  return value
}

Watcher.prototype.addDep = function addDep (dep) {
  var id = dep.id
  if (!this.newDepIds.has(id)) {
    this.newDepIds.add(id)
    this.newDeps.push(dep)
    if (!this.depIds.has(id)) {
      dep.addSub(this)
    }
  }
}

Watcher.prototype.cleanupDeps = function cleanupDeps () {
  var i = this.deps.length
  while (i--) {
    var dep = this.deps[i]
    if (!this.newDepIds.has(dep.id)) {
      dep.removeSub(this)
    }
  }
  var tmp = this.depIds
  this.depIds = this.newDepIds
  this.newDepIds = tmp
  this.newDepIds.clear()
  tmp = this.deps
  this.deps = this.newDeps
  this.newDeps = tmp
  this.newDeps.length = 0
}

Watcher.prototype.update = function update () {
  if (this.lazy) {
    this.dirty = true
  } else if (this.sync) {
    this.run()
  } else {
    queueWatcher(this)
  }
}

Watcher.prototype.run = function run () { // 非计算属性的执行
  if (this.active) {
    var value = this.get()
    if (value !== this.value || isObject(value) || this.deep) {
      var oldValue = this.value
      this.value = value
      try {
        this.cb.call(this.vm, value, oldValue)
      } catch (e) {
        handleError(e, this.vm, 'callback for watcher')
      }
    }
  }
}

Watcher.prototype.evaluate = function evaluate () { // 计算属性使用
  this.value = this.get()
  this.dirty = false
}

Watcher.prototype.depend = function depend () {
  var i = this.deps.length
  while (i--) {
    this.deps[i].depend()
  }
}

Watcher.prototype.teardown = function teardown () {
  if (this.active) {
    // this is a somewhat expensive operation so we skip it if the vm is being destroyed.
    if (!this.vm._isBeingDestroyed) {
      remove(this.vm._watchers, this)
    }
    var i = this.deps.length
    while (i--) {
      this.deps[i].removeSub(this)
    }
    this.active = false
  }
}

var sharedPropertyDefinition = { enumerable: true, configurable: true, get: noop, set: noop }

function proxy (target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function initState (vm) {
  vm._watchers = []
  var opts = vm.$options
  if (opts.props) {
    initProps(vm, opts.props)
  }
  if (opts.methods) {
    initMethods(vm, opts.methods)
  }
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true)
  }
  if (opts.computed) {
    initComputed(vm, opts.computed)
  }
  if (opts.watch) {
    initWatch(vm, opts.watch)
  }
}

function initProps (vm, propsOptions) {
  var propsData = vm.$options.propsData || {}
  var props = vm._props = {}
  var keys = vm.$options._propKeys = []

  // root instance props should be converted
  if (vm.$parent) {
    toggleObserving(false)
  }
  var loop = function (key) {
    keys.push(key)
    var value = validateProp(key, propsOptions, propsData, vm)
    defineReactive$$1(props, key, value)

    // static props are already proxied on the component's prototype during Vue.extend().
    // We only need to proxy props defined at instantiation here.
    if (!(key in vm)) {
      proxy(vm, '_props', key)
    }
  }

  for (var key in propsOptions) {
    loop(key)
  }
  toggleObserving(true)
}

function initData (vm) {
  var data = vm.$options.data
  data = vm._data = typeof data === 'function' ? getData(data, vm) : (data || {})
  if (!isPlainObject(data)) {
    data = {}
  }

  var keys = Object.keys(data)
  var props = vm.$options.props
  var i = keys.length
  while (i--) {
    var key = keys[i]
    if (!props || !hasOwn(props, key)) {
      if (!isReserved(key)) {
        proxy(vm, '_data', key)
      }
    }
  }
  observe(data, true)
}

function getData (data, vm) {
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    return {}
  } finally {
    popTarget()
  }
}

function initComputed (vm, computed) {
  var watchers = vm._computedWatchers = Object.create(null)

  for (var key in computed) {
    var userDef = computed[key]
    var getter = typeof userDef === 'function' ? userDef : userDef.get
    watchers[key] = new Watcher(vm, getter || noop, noop, { lazy: true })
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    }
  }
}

function defineComputed (target, key, userDef) {
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = createComputedGetter(key)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? userDef.cache !== false ? createComputedGetter(key) : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    var watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker (fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm, methods) {
  for (var key in methods) {
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

function initWatch (vm, watch) {
  for (var key in watch) {
    var handler = watch[key]
    if (Array.isArray(handler)) {
      for (var i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher (vm, expOrFn, handler, options) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

function stateMixin (Vue) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  var dataDef = {}
  dataDef.get = function () {
    return this._data
  }
  var propsDef = {}
  propsDef.get = function () {
    return this._props
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del
  Vue.prototype.$watch = function (expOrFn, cb, options) {
    var vm = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    var watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, 'callback for immediate watcher')
      }
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}

function initProvide (vm) {
  var provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function' ? provide.call(vm) : provide
  }
}

function initInjections (vm) {
  var result = resolveInject(vm.$options.inject, vm)
  if (result) {
    toggleObserving(false)
    Object.keys(result).forEach(function (key) {
      defineReactive$$1(vm, key, result[key])
    })
    toggleObserving(true)
  }
}

function resolveInject (inject, vm) {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    var result = Object.create(null)
    var keys = Object.keys(inject)

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      var provideKey = inject[key].from
      var source = vm
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
      if (!source) {
        if ('default' in inject[key]) {
          var provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function' ? provideDefault.call(vm) : provideDefault
        }
      }
    }
    return result
  }
}

function renderList (val, render) {
  var ret, i, l, keys, key
  if (Array.isArray(val) || typeof val === 'string') {
    ret = new Array(val.length)
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i)
    }
  } else if (typeof val === 'number') {
    ret = new Array(val)
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i)
    }
  } else if (isObject(val)) {
    keys = Object.keys(val)
    ret = new Array(keys.length)
    for (i = 0, l = keys.length; i < l; i++) {
      key = keys[i]
      ret[i] = render(val[key], key, i)
    }
  }
  if (!isDef(ret)) {
    ret = []
  }
  ret._isVList = true
  return ret
}

/**
 * Runtime helper for rendering <slot>
 */
function renderSlot (name, fallback, props, bindObject) {
  var scopedSlotFn = this.$scopedSlots[name]
  var nodes
  if (scopedSlotFn) { // scoped slot
    props = props || {}
    if (bindObject) {
      props = extend(extend({}, bindObject), props)
    }
    nodes = scopedSlotFn(props) || fallback
  } else {
    nodes = this.$slots[name] || fallback
  }

  var target = props && props.slot
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    return nodes
  }
}

function resolveFilter (id) {
  return resolveAsset(this.$options, 'filters', id) || identity
}

function isKeyNotMatch (expect, actual) {
  if (Array.isArray(expect)) {
    return expect.indexOf(actual) === -1
  } else {
    return expect !== actual
  }
}

/**
 * Runtime helper for checking keyCodes from config.
 * exposed as Vue.prototype._k
 * passing in eventKeyName as last argument separately for backwards compat
 */
function checkKeyCodes (eventKeyCode, key, builtInKeyCode, eventKeyName, builtInKeyName) {
  var mappedKeyCode = config.keyCodes[key] || builtInKeyCode
  if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
    return isKeyNotMatch(builtInKeyName, eventKeyName)
  } else if (mappedKeyCode) {
    return isKeyNotMatch(mappedKeyCode, eventKeyCode)
  } else if (eventKeyName) {
    return hyphenate(eventKeyName) !== key
  }
}

/**
 * Runtime helper for merging v-bind="object" into a VNode's data.
 */
function bindObjectProps (data, tag, value, asProp, isSync) {
  if (value && isObject(value)) {
    if (Array.isArray(value)) {
      value = arrToObject(value)
    }
    var hash
    var loop = function (key) {
      if (key === 'class' || key === 'style' || isReservedAttribute(key)) {
        hash = data
      } else {
        var type = data.attrs && data.attrs.type
        hash = asProp || config.mustUseProp(tag, type, key) ? data.domProps || (data.domProps = {}) : data.attrs || (data.attrs = {})
      }
      var camelizedKey = camelize(key)
      if (!(key in hash) && !(camelizedKey in hash)) {
        hash[key] = value[key]

        if (isSync) {
          var on = data.on || (data.on = {})
          on[('update:' + camelizedKey)] = function ($event) {
            value[key] = $event
          }
        }
      }
    }
    for (var key in value) loop(key)
  }
  return data
}

function renderStatic (index, isInFor) {
  var cached = this._staticTrees || (this._staticTrees = [])
  var tree = cached[index]
  // if has already-rendered static tree and not inside v-for, we can reuse the same tree.
  if (tree && !isInFor) {
    return tree
  }
  // otherwise, render a fresh tree.
  tree = cached[index] = this.$options.staticRenderFns[index].call(this._renderProxy, null, this)
  markStatic(tree, ('__static__' + index), false)
  return tree
}

function markOnce (tree, index, key) {
  markStatic(tree, ('__once__' + index + (key ? ('_' + key) : '')), true)
  return tree
}

function markStatic (tree, key, isOnce) {
  if (Array.isArray(tree)) {
    for (var i = 0; i < tree.length; i++) {
      if (tree[i] && typeof tree[i] !== 'string') {
        markStaticNode(tree[i], (key + '_' + i), isOnce)
      }
    }
  } else {
    markStaticNode(tree, key, isOnce)
  }
}

function markStaticNode (node, key, isOnce) {
  node.isStatic = true
  node.key = key
  node.isOnce = isOnce
}

function bindObjectListeners (data, value) {
  if (value && isPlainObject(value)) {
    var on = data.on = data.on ? extend({}, data.on) : {}
    for (var key in value) {
      var existing = on[key]
      var ours = value[key]
      on[key] = existing ? [].concat(existing, ours) : ours
    }
  }
  return data
}

function installRenderHelpers (target) {
  target._o = markOnce
  target._n = toNumber
  target._s = toString
  target._l = renderList
  target._t = renderSlot
  target._q = looseEqual
  target._i = looseIndexOf
  target._m = renderStatic
  target._f = resolveFilter
  target._k = checkKeyCodes
  target._b = bindObjectProps
  target._v = createTextVNode
  target._e = createEmptyVNode
  target._u = resolveScopedSlots
  target._g = bindObjectListeners
}

function FunctionalRenderContext (data, props, children, parent, Ctor) {
  var options = Ctor.options
  // ensure the createElement function in functional components
  // gets a unique context - this is necessary for correct named slot check
  var contextVm
  if (hasOwn(parent, '_uid')) {
    contextVm = Object.create(parent)
    contextVm._original = parent
  } else {
    // the context vm passed in is a functional context as well.
    // in this case we want to make sure we are able to get a hold to the
    // real context instance.
    contextVm = parent
    parent = parent._original
  }
  var isCompiled = isTrue(options._compiled)
  var needNormalization = !isCompiled

  this.data = data
  this.props = props
  this.children = children
  this.parent = parent
  this.listeners = data.on || emptyObject
  this.injections = resolveInject(options.inject, parent)
  this.slots = function () {
    return resolveSlots(children, parent)
  }

  // support for compiled functional template
  if (isCompiled) {
    // exposing $options for renderStatic()
    this.$options = options
    // pre-resolve slots for renderSlot()
    this.$slots = this.slots()
    this.$scopedSlots = data.scopedSlots || emptyObject
  }

  if (options._scopeId) {
    this._c = function (a, b, c, d) {
      var vnode = createElement(contextVm, a, b, c, d, needNormalization)
      if (vnode && !Array.isArray(vnode)) {
        vnode.fnScopeId = options._scopeId
        vnode.fnContext = parent
      }
      return vnode
    }
  } else {
    this._c = function (a, b, c, d) {
      return createElement(contextVm, a, b, c, d, needNormalization)
    }
  }
}

installRenderHelpers(FunctionalRenderContext.prototype)

function createFunctionalComponent (Ctor, propsData, data, contextVm, children) {
  var options = Ctor.options
  var props = {}
  var propOptions = options.props
  if (isDef(propOptions)) {
    for (var key in propOptions) {
      props[key] = validateProp(key, propOptions, propsData || emptyObject)
    }
  } else {
    if (isDef(data.attrs)) {
      mergeProps(props, data.attrs)
    }
    if (isDef(data.props)) {
      mergeProps(props, data.props)
    }
  }

  var renderContext = new FunctionalRenderContext(data, props, children, contextVm, Ctor)
  var vnode = options.render.call(null, renderContext._c, renderContext)

  if (vnode instanceof VNode) {
    return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext)
  } else if (Array.isArray(vnode)) {
    var vnodes = normalizeChildren(vnode) || []
    var res = new Array(vnodes.length)
    for (var i = 0; i < vnodes.length; i++) {
      res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext)
    }
    return res
  }
}

function cloneAndMarkFunctionalResult (vnode, data, contextVm, options, renderContext) {
  // #7817 clone node before setting fnContext, otherwise if the node is reused
  // (e.g. it was from a cached normal slot) the fnContext causes named slots
  // that should not be matched to match.
  var clone = cloneVNode(vnode)
  clone.fnContext = contextVm
  clone.fnOptions = options
  if (data.slot) {
    (clone.data || (clone.data = {})).slot = data.slot
  }
  return clone
}

function mergeProps (to, from) {
  for (var key in from) {
    to[camelize(key)] = from[key]
  }
}

// inline hooks to be invoked on component VNodes during patch
var componentVNodeHooks = {
  init: function init (vnode) {
    if (vnode.componentInstance && !vnode.componentInstance._isDestroyed && vnode.data.keepAlive) {
      // kept-alive components, treat as a patch
      var mountedNode = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      var child = vnode.componentInstance = createComponentInstanceForVnode(vnode, activeInstance)
      child.$mount(undefined)
    }
  },

  prepatch: function prepatch (oldVnode, vnode) {
    var options = vnode.componentOptions
    var child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },

  insert: function insert (vnode) {
    var context = vnode.context
    var componentInstance = vnode.componentInstance
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true)
      }
    }
  },

  destroy: function destroy (vnode) {
    var componentInstance = vnode.componentInstance
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true)
      }
    }
  }
}

var hooksToMerge = Object.keys(componentVNodeHooks)

function createComponent (Ctor, data, context, children, tag) {
  if (isUndef(Ctor)) {
    return
  }

  var baseCtor = context.$options._base
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor)
  }

  if (typeof Ctor !== 'function') {
    return
  }

  var asyncFactory
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor, context)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(asyncFactory, data, context, children, tag)
    }
  }

  data = data || {}

  // resolve constructor options in case global mixins are applied after component constructor creation
  resolveConstructorOptions(Ctor)

  if (isDef(data.model)) {
    transformModel(Ctor.options, data)
  }

  var propsData = extractPropsFromVNodeData(data, Ctor, tag)

  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  var listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  data.on = data.nativeOn

  if (isTrue(Ctor.options.abstract)) { // 抽象组件只保留props、listeners和slot
    var slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // install component management hooks onto the placeholder node
  installComponentHooks(data)

  // return a placeholder vnode
  var name = Ctor.options.name || tag
  var vnode = new VNode('vue-component-' + Ctor.cid + (name ? '-' + name : ''),
    data, undefined, undefined, undefined, context, {
      Ctor: Ctor,
      propsData: propsData,
      listeners: listeners,
      tag: tag,
      children: children
    },
    asyncFactory)

  return vnode
}

function createComponentInstanceForVnode (vnode, parent) {
  var options = { _isComponent: true, _parentVnode: vnode, parent: parent }
  // check inline-template render functions
  var inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  return new vnode.componentOptions.Ctor(options)
}

function installComponentHooks (data) {
  var hooks = data.hook || (data.hook = {})
  for (var i = 0; i < hooksToMerge.length; i++) {
    var key = hooksToMerge[i]
    var existing = hooks[key]
    var toMerge = componentVNodeHooks[key]
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook$1(toMerge, existing) : toMerge
    }
  }
}

function mergeHook$1 (f1, f2) {
  var merged = function (a, b) {
    f1(a, b)
    f2(a, b)
  }
  merged._merged = true
  return merged
}

function transformModel (options, data) {
  var prop = (options.model && options.model.prop) || 'value'
  var event = (options.model && options.model.event) || 'input';
  (data.props || (data.props = {}))[prop] = data.model.value
  var on = data.on || (data.on = {})
  var existing = on[event]
  var callback = data.model.callback
  if (isDef(existing)) {
    if (Array.isArray(existing) ? existing.indexOf(callback) === -1 : existing !== callback) {
      on[event] = [callback].concat(existing)
    }
  } else {
    on[event] = callback
  }
}

var SIMPLE_NORMALIZE = 1
var ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface without getting yelled at by flow
function createElement (context, tag, data, children, normalizationType, alwaysNormalize) {
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}

function _createElement (context, tag, data, children, normalizationType) {
  if (isDef(data) && isDef((data).__ob__)) {
    return createEmptyVNode()
  }
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // support single function children as default scoped slot
  if (Array.isArray(children) && typeof children[0] === 'function') {
    data = data || {}
    data.scopedSlots = {
      default: children[0]
    }
    children.length = 0
  }
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children)
  }
  var vnode, ns
  if (typeof tag === 'string') {
    var Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      vnode = new VNode(config.parsePlatformTagName(tag), data, children, undefined, undefined, context)
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(tag, data, children, undefined, undefined, context)
    }
  } else {
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) {
      applyNS(vnode, ns)
    }
    if (isDef(data)) {
      registerDeepBindings(data)
    }
    return vnode
  } else {
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') { // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (var i = 0, l = vnode.children.length; i < l; i++) {
      var child = vnode.children[i]
      if (isDef(child.tag) && (isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}

function initRender (vm) {
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null // v-once cached trees
  var options = vm.$options
  var parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  var renderContext = parentVnode && parentVnode.context
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  vm._c = function (a, b, c, d) {
    return createElement(vm, a, b, c, d, false)
  }
  // normalization is always applied for the public version, used in user-written render functions.
  vm.$createElement = function (a, b, c, d) {
    return createElement(vm, a, b, c, d, true)
  }

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  var parentData = parentVnode && parentVnode.data

  defineReactive$$1(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
  defineReactive$$1(vm, '$listeners', options._parentListeners || emptyObject, null, true)
}

function renderMixin (Vue) {
  installRenderHelpers(Vue.prototype)

  Vue.prototype.$nextTick = function (fn) {
    return nextTick(fn, this)
  }

  Vue.prototype._render = function () {
    var vm = this
    var ref = vm.$options
    var render = ref.render
    var _parentVnode = ref._parentVnode

    if (_parentVnode) {
      vm.$scopedSlots = _parentVnode.data.scopedSlots || emptyObject
    }

    // set parent vnode. this allows render functions to have access to the data on the placeholder node.
    vm.$vnode = _parentVnode
    var vnode
    try {
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      handleError(e, vm, 'render')
      // return error render result, or previous vnode to prevent render error causing blank component
      vnode = vm._vnode
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      vnode = createEmptyVNode()
    }
    vnode.parent = _parentVnode
    return vnode
  }
}

var uid$3 = 0
function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    var vm = this
    vm._uid = uid$3++
    vm._isVue = true

    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options || {}, vm)
    }
    vm._renderProxy = vm
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

function initInternalComponent (vm, options) {
  var opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  var parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  var vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

function resolveConstructorOptions (Ctor) {
  var options = Ctor.options
  if (Ctor.super) {
    var superOptions = resolveConstructorOptions(Ctor.super)
    var cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed, need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      var modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor) {
  var modified = {}
  var latest = Ctor.options
  var extended = Ctor.extendOptions
  var sealed = Ctor.sealedOptions
  for (var key in latest) {
    if (latest[key] !== sealed[key]) {
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

function dedupe (latest, extended, sealed) {
  if (!Array.isArray(latest)) {
    return latest
  }
  var res = []
  sealed = Array.isArray(sealed) ? sealed : [sealed]
  extended = Array.isArray(extended) ? extended : [extended]
  for (var i = 0; i < latest.length; i++) {
    if (extended.includes(latest[i]) || !sealed.includes(latest[i])) {
      res.push(latest[i])
    }
  }
  return res
}

function Vue (options) {
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

function initUse (Vue) {
  Vue.use = function (plugin) {
    var installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    var args = toArray(arguments, 1)
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}

function initMixin$1 (Vue) {
  Vue.mixin = function (mixin) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}

function initExtend (Vue) {
  Vue.cid = 0
  var cid = 1

  Vue.extend = function (extendOptions) {
    extendOptions = extendOptions || {}
    var Super = this
    var SuperId = Super.cid
    var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    var name = extendOptions.name || Super.options.name
    var Sub = function VueComponent (options) {
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    Sub.options = mergeOptions(Super.options, extendOptions)
    Sub.super = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps$1(Sub)
    }
    if (Sub.options.computed) {
      initComputed$1(Sub)
    }
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    if (name) {
      Sub.options.components[name] = Sub
    }

    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps$1 (Comp) {
  var props = Comp.options.props
  for (var key in props) {
    proxy(Comp.prototype, '_props', key)
  }
}

function initComputed$1 (Comp) {
  var computed = Comp.options.computed
  for (var key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}

function initAssetRegisters (Vue) {
  ASSET_TYPES.forEach(function (type) {
    Vue[type] = function (id, definition) {
      if (!definition) {
        return this.options[type + 's'][id]
      }
      if (type === 'component' && isPlainObject(definition)) {
        definition.name = definition.name || id
        definition = this.options._base.extend(definition)
      }
      if (type === 'directive' && typeof definition === 'function') {
        definition = { bind: definition, update: definition }
      }
      this.options[type + 's'][id] = definition
      return definition
    }
  })
}

function getComponentName (opts) {
  return opts && (opts.Ctor.options.name || opts.tag)
}

function matches (pattern, name) {
  if (Array.isArray(pattern)) {
    return pattern.includes(name)
  }
  if (typeof pattern === 'string') {
    return pattern.split(',').includes(name)
  }
  return isRegExp(pattern) ? pattern.test(name) : false
}

function pruneCache (keepAliveInstance, filter) {
  var cache = keepAliveInstance.cache
  var keys = keepAliveInstance.keys
  var _vnode = keepAliveInstance._vnode

  for (var key in cache) {
    var cachedNode = cache[key]
    if (cachedNode) {
      var name = getComponentName(cachedNode.componentOptions)
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}

function pruneCacheEntry (cache, key, keys, current) {
  var cached$$1 = cache[key]
  if (cached$$1 && (!current || cached$$1.tag !== current.tag)) {
    cached$$1.componentInstance.$destroy()
  }
  cache[key] = null
  remove(keys, key)
}

var patternTypes = [String, RegExp, Array]
var KeepAlive = {
  name: 'keep-alive',
  abstract: true,

  props: {
    include: patternTypes,
    exclude: patternTypes,
    max: [String, Number]
  },

  created: function created () {
    this.cache = Object.create(null)
    this.keys = []
  },

  destroyed: function destroyed () {
    for (var key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted: function mounted () {
    var this$1 = this
    this.$watch('include', function (val) {
      pruneCache(this$1, function (name) {
        return matches(val, name)
      })
    })
    this.$watch('exclude', function (val) {
      pruneCache(this$1, function (name) {
        return !matches(val, name)
      })
    })
  },

  render: function render () {
    var slot = this.$slots.default
    var vnode = getFirstComponentChild(slot)
    var componentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      var name = getComponentName(componentOptions)
      var ref = this
      var include = ref.include
      var exclude = ref.exclude
      if ((include && (!name || !matches(include, name))) || (exclude && name && matches(exclude, name))) {
        return vnode
      }

      var ref$1 = this
      var cache = ref$1.cache
      var keys = ref$1.keys
      var key = vnode.key == null ? componentOptions.Ctor.cid + '::' + (componentOptions.tag || '') : vnode.key

      if (cache[key]) {
        vnode.componentInstance = cache[key].componentInstance
        remove(keys, key)
        keys.push(key)
      } else {
        cache[key] = vnode
        keys.push(key)
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }
      vnode.data.keepAlive = true
    }
    return vnode || (slot && slot[0])
  }
}

var builtInComponents = {
  KeepAlive: KeepAlive
}

function initGlobalAPI (Vue) {
  Object.defineProperty(Vue, 'config', { get: function () { return config } })

  Vue.util = {
    warn: noop,
    extend: extend,
    mergeOptions: mergeOptions,
    defineReactive: defineReactive$$1
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick
  Vue.options = Object.create(null)
  Vue.options._base = Vue

  ASSET_TYPES.forEach(function (type) {
    Vue.options[type + 's'] = Object.create(null)
  })

  extend(Vue.options.components, builtInComponents)

  initUse(Vue)
  initMixin$1(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}

initGlobalAPI(Vue)

var isReservedAttr = makeMap('style,class')
var acceptValue = makeMap('input,textarea,option,select,progress')
var mustUseProp = function (tag, type, attr) {
  return ((attr === 'value' && acceptValue(tag)) && type !== 'button' ||
    (attr === 'selected' && tag === 'option') ||
    (attr === 'checked' && tag === 'input') ||
    (attr === 'muted' && tag === 'video'))
}

var isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck')
var isBooleanAttr = makeMap(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
  'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
  'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
  'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
  'required,reversed,scoped,seamless,selected,sortable,translate,' +
  'truespeed,typemustmatch,visible')

var xlinkNS = 'http://www.w3.org/1999/xlink'

var isXlink = function (name) {
  return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
}

var getXlinkProp = function (name) {
  return isXlink(name) ? name.slice(6, name.length) : ''
}

var isFalsyAttrValue = function (val) {
  return val == null || val === false
}

function genClassForVnode (vnode) {
  var data = vnode.data
  var parentNode = vnode
  var childNode = vnode
  while (isDef(childNode.componentInstance)) {
    childNode = childNode.componentInstance._vnode
    if (childNode && childNode.data) {
      data = mergeClassData(childNode.data, data)
    }
  }
  while (isDef(parentNode = parentNode.parent)) {
    if (parentNode && parentNode.data) {
      data = mergeClassData(data, parentNode.data)
    }
  }
  return renderClass(data.staticClass, data.class)
}

function mergeClassData (child, parent) {
  return {
    staticClass: concat(child.staticClass, parent.staticClass),
    class: isDef(child.class) ? [child.class, parent.class] : parent.class
  }
}

function renderClass (staticClass, dynamicClass) {
  if (isDef(staticClass) || isDef(dynamicClass)) {
    return concat(staticClass, stringifyClass(dynamicClass))
  }
  return ''
}

function concat (a, b) {
  if (a) {
    return b ? (a + ' ' + b) : a
  } else {
    return b || ''
  }
}

function stringifyObject (value) {
  var res = ''
  for (var key in value) {
    if (value[key]) {
      if (res) {
        res += ' '
      }
      res += key
    }
  }
  return res
}

function stringifyArray (value) {
  var res = ''
  var stringified
  for (var i = 0, l = value.length; i < l; i++) {
    stringified = stringifyClass(value[i])
    if (stringified !== '' && isDef(stringified)) {
      if (res) {
        res += ' '
      }
      res += stringified
    }
  }
  return res
}

function stringifyClass (value) {
  if (Array.isArray(value)) {
    return stringifyArray(value)
  }
  if (isObject(value)) {
    return stringifyObject(value)
  }
  return (typeof value === 'string') ? value : ''
}

var namespaceMap = {
  svg: 'http://www.w3.org/2000/svg',
  math: 'http://www.w3.org/1998/Math/MathML'
}

var isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,' +
  'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
  'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
  'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
  's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
  'embed,object,param,source,canvas,script,noscript,del,ins,' +
  'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
  'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
  'output,progress,select,textarea,' +
  'details,dialog,menu,menuitem,summary,' +
  'content,element,shadow,template,blockquote,iframe,tfoot')

var isSVG = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
  'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
  'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true)

var isReservedTag = function (tag) {
  return isHTMLTag(tag) || isSVG(tag)
}

function getTagNamespace (tag) {
  if (isSVG(tag)) {
    return 'svg'
  }
  if (tag === 'math') {
    return 'math'
  }
}

var unknownElementCache = Object.create(null)
function isUnknownElement (tag) {
  if (isReservedTag(tag)) {
    return false
  }
  tag = tag.toLowerCase()
  if (unknownElementCache[tag] != null) {
    return unknownElementCache[tag]
  }
  var el = document.createElement(tag)
  if (tag.indexOf('-') > -1) {
    return (unknownElementCache[tag] = (el.constructor === window.HTMLUnknownElement || el.constructor === window.HTMLElement))
  } else {
    return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()))
  }
}

var isTextInputType = makeMap('text,number,password,search,email,tel,url')

function query (el) {
  if (typeof el === 'string') {
    var selected = document.querySelector(el)
    return !selected ? document.createElement('div') : selected
  } else {
    return el
  }
}

function createElement$1 (tagName, vnode) {
  var elm = document.createElement(tagName)
  if (tagName !== 'select') {
    return elm
  }
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    elm.setAttribute('multiple', 'multiple')
  }
  return elm
}

function createElementNS (namespace, tagName) {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

function createTextNode (text) {
  return document.createTextNode(text)
}

function createComment (text) {
  return document.createComment(text)
}

function insertBefore (parentNode, newNode, referenceNode) {
  parentNode.insertBefore(newNode, referenceNode)
}

function removeChild (node, child) {
  node.removeChild(child)
}

function appendChild (node, child) {
  node.appendChild(child)
}

function parentNode (node) {
  return node.parentNode
}

function nextSibling (node) {
  return node.nextSibling
}

function tagName (node) {
  return node.tagName
}

function setTextContent (node, text) {
  node.textContent = text
}

function setStyleScope (node, scopeId) {
  node.setAttribute(scopeId, '')
}

var nodeOps = Object.freeze({
  createElement: createElement$1,
  createElementNS: createElementNS,
  createTextNode: createTextNode,
  createComment: createComment,
  insertBefore: insertBefore,
  removeChild: removeChild,
  appendChild: appendChild,
  parentNode: parentNode,
  nextSibling: nextSibling,
  tagName: tagName,
  setTextContent: setTextContent,
  setStyleScope: setStyleScope
})

var ref = {
  create: function create (_, vnode) {
    registerRef(vnode)
  },
  update: function update (oldVnode, vnode) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true)
      registerRef(vnode)
    }
  },
  destroy: function destroy (vnode) {
    registerRef(vnode, true)
  }
}

function registerRef (vnode, isRemoval) {
  var key = vnode.data.ref
  if (!isDef(key)) {
    return
  }

  var vm = vnode.context
  var ref = vnode.componentInstance || vnode.elm
  var refs = vm.$refs

  if (isRemoval) {
    if (Array.isArray(refs[key])) {
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      refs[key] = undefined
    }
  } else {
    if (vnode.data.refInFor) {
      if (!Array.isArray(refs[key])) {
        refs[key] = [ref]
      } else if (refs[key].indexOf(ref) < 0) {
        refs[key].push(ref)
      }
    } else {
      refs[key] = ref
    }
  }
}

var emptyNode = new VNode('', {}, [])
var hooks = ['create', 'activate', 'update', 'remove', 'destroy']

function sameVnode (a, b) {
  return a.key === b.key && (
    (a.tag === b.tag && a.isComment === b.isComment && isDef(a.data) === isDef(b.data) && sameInputType(a, b)) ||
    (isTrue(a.isAsyncPlaceholder) && a.asyncFactory === b.asyncFactory && isUndef(b.asyncFactory.error))
  )
}

function sameInputType (a, b) {
  if (a.tag !== 'input') {
    return true
  }
  var i
  var typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
  var typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}

function createKeyToOldIdx (children, beginIdx, endIdx) {
  var i, key
  var map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) {
      map[key] = i
    }
  }
  return map
}

function createPatchFunction (backend) {
  var i, j
  var cbs = {}
  var modules = backend.modules
  var nodeOps = backend.nodeOps

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = []
    for (j = 0; j < modules.length; ++j) {
      if (isDef(modules[j][hooks[i]])) {
        cbs[hooks[i]].push(modules[j][hooks[i]])
      }
    }
  }

  function emptyNodeAt (elm) {
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

  function createRmCb (childElm, listeners) {
    function remove$$1 () {
      if (--remove$$1.listeners === 0) {
        removeNode(childElm)
      }
    }
    remove$$1.listeners = listeners
    return remove$$1
  }

  function removeNode (el) {
    var parent = nodeOps.parentNode(el)
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el)
    }
  }

  function createElm (vnode, insertedVnodeQueue, parentElm, refElm, nested, ownerArray, index) {
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // This vnode was used in a previous render!
      // now it's used as a new node, overwriting its elm would cause
      // potential patch errors down the road when it's used as an insertion
      // reference node. Instead, we clone the node on-demand before creating
      // associated DOM element for it.
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    vnode.isRootInsert = !nested // for transition enter check
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }

    var data = vnode.data
    var children = vnode.children
    var tag = vnode.tag
    if (isDef(tag)) {
      vnode.elm = vnode.ns ? nodeOps.createElementNS(vnode.ns, tag) : nodeOps.createElement(tag, vnode)
      setScope(vnode)
      createChildren(vnode, children, insertedVnodeQueue)
      if (isDef(data)) {
        invokeCreateHooks(vnode, insertedVnodeQueue)
      }
      insert(parentElm, vnode.elm, refElm)
    } else if (isTrue(vnode.isComment)) {
      vnode.elm = nodeOps.createComment(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }

  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    var i = vnode.data
    if (isDef(i)) {
      var isReactivated = isDef(vnode.componentInstance) && i.keepAlive
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        i(vnode, false)
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue)
        insert(parentElm, vnode.elm, refElm)
        if (isTrue(isReactivated)) {
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)
        }
        return true
      }
    }
  }

  function initComponent (vnode, insertedVnodeQueue) {
    if (isDef(vnode.data.pendingInsert)) {
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert)
      vnode.data.pendingInsert = null
    }
    vnode.elm = vnode.componentInstance.$el
    if (isPatchable(vnode)) {
      invokeCreateHooks(vnode, insertedVnodeQueue)
      setScope(vnode)
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      registerRef(vnode)
      // make sure to invoke the insert hook
      insertedVnodeQueue.push(vnode)
    }
  }

  function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    var i
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    var innerNode = vnode
    while (innerNode.componentInstance) {
      innerNode = innerNode.componentInstance._vnode
      if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
        for (i = 0; i < cbs.activate.length; ++i) {
          cbs.activate[i](emptyNode, innerNode)
        }
        insertedVnodeQueue.push(innerNode)
        break
      }
    }
    // unlike a newly created component, a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm)
  }

  function insert (parent, elm, ref$$1) {
    if (isDef(parent)) {
      if (isDef(ref$$1)) {
        if (nodeOps.parentNode(ref$$1) === parent) {
          nodeOps.insertBefore(parent, elm, ref$$1)
        }
      } else {
        nodeOps.appendChild(parent, elm)
      }
    }
  }

  function createChildren (vnode, children, insertedVnodeQueue) {
    if (Array.isArray(children)) {
      for (var i = 0; i < children.length; ++i) {
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i)
      }
    } else if (isPrimitive(vnode.text)) {
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))
    }
  }

  function isPatchable (vnode) {
    while (vnode.componentInstance) {
      vnode = vnode.componentInstance._vnode
    }
    return isDef(vnode.tag)
  }

  function invokeCreateHooks (vnode, insertedVnodeQueue) {
    for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
      cbs.create[i$1](emptyNode, vnode)
    }
    i = vnode.data.hook // Reuse variable
    if (isDef(i)) {
      if (isDef(i.create)) {
        i.create(emptyNode, vnode)
      }
      if (isDef(i.insert)) {
        insertedVnodeQueue.push(vnode)
      }
    }
  }

  // set scope id attribute for scoped CSS.
  // this is implemented as a special case to avoid the overhead
  // of going through the normal attribute patching process.
  function setScope (vnode) {
    var i
    if (isDef(i = vnode.fnScopeId)) {
      nodeOps.setStyleScope(vnode.elm, i)
    } else {
      var ancestor = vnode
      while (ancestor) {
        if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
          nodeOps.setStyleScope(vnode.elm, i)
        }
        ancestor = ancestor.parent
      }
    }
    // for slot content they should also get the scopeId from the host instance.
    if (isDef(i = activeInstance) && i !== vnode.context && i !== vnode.fnContext && isDef(i = i.$options._scopeId)) {
      nodeOps.setStyleScope(vnode.elm, i)
    }
  }

  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx)
    }
  }

  function invokeDestroyHook (vnode) {
    var i, j
    var data = vnode.data
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) {
        i(vnode)
      }
      for (i = 0; i < cbs.destroy.length; ++i) {
        cbs.destroy[i](vnode)
      }
    }
    if (isDef(i = vnode.children)) {
      for (j = 0; j < vnode.children.length; ++j) {
        invokeDestroyHook(vnode.children[j])
      }
    }
  }

  function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var ch = vnodes[startIdx]
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch)
          invokeDestroyHook(ch)
        } else { // Text node
          removeNode(ch.elm)
        }
      }
    }
  }

  function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      var i
      var listeners = cbs.remove.length + 1
      if (isDef(rm)) {
        // we have a recursively passed down rm callback increase the listeners count
        rm.listeners += listeners
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners)
      }
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm)
      }
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm)
      }
      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        i(vnode, rm)
      } else {
        rm()
      }
    } else {
      removeNode(vnode.elm)
    }
  }

  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    var oldStartIdx = 0
    var newStartIdx = 0
    var oldEndIdx = oldCh.length - 1
    var oldStartVnode = oldCh[0]
    var oldEndVnode = oldCh[oldEndIdx]
    var newEndIdx = newCh.length - 1
    var newStartVnode = newCh[0]
    var newEndVnode = newCh[newEndIdx]
    var oldKeyToIdx, idxInOld, vnodeToMove, refElm

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    var canMove = !removeOnly

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        if (isUndef(oldKeyToIdx)) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        }
        idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
        if (isUndef(idxInOld)) { // New element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
        } else {
          vnodeToMove = oldCh[idxInOld]
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldCh[idxInOld] = undefined
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
          } else {
            // same key but different element. treat as new element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
    }
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
  }

  function findIdxInOld (node, oldCh, start, end) {
    for (var i = start; i < end; i++) {
      var c = oldCh[i]
      if (isDef(c) && sameVnode(node, c)) {
        return i
      }
    }
  }

  function patchVnode (oldVnode, vnode, insertedVnodeQueue, ownerArray, index, removeOnly) {
    if (oldVnode === vnode) {
      return
    }

    if (isDef(vnode.elm) && isDef(ownerArray)) {
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    var elm = vnode.elm = oldVnode.elm

    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
      } else {
        vnode.isAsyncPlaceholder = true
      }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    if (isTrue(vnode.isStatic) && isTrue(oldVnode.isStatic) && vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))) {
      vnode.componentInstance = oldVnode.componentInstance
      return
    }

    var i
    var data = vnode.data
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      i(oldVnode, vnode)
    }

    var oldCh = oldVnode.children
    var ch = vnode.children
    if (isDef(data) && isPatchable(vnode)) {
      for (i = 0; i < cbs.update.length; ++i) {
        cbs.update[i](oldVnode, vnode)
      }
      if (isDef(i = data.hook) && isDef(i = i.update)) {
        i(oldVnode, vnode)
      }
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) {
          updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
        }
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) {
          nodeOps.setTextContent(elm, '')
        }
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      nodeOps.setTextContent(elm, vnode.text)
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) {
        i(oldVnode, vnode)
      }
    }
  }

  function invokeInsertHook (vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the element is really inserted
    if (isTrue(initial) && isDef(vnode.parent)) {
      vnode.parent.data.pendingInsert = queue
    } else {
      for (var i = 0; i < queue.length; ++i) {
        queue[i].data.hook.insert(queue[i])
      }
    }
  }

  var isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key')

  function hydrate (elm, vnode, insertedVnodeQueue, inVPre) {
    var i
    var tag = vnode.tag
    var data = vnode.data
    var children = vnode.children
    inVPre = inVPre || (data && data.pre)
    vnode.elm = elm

    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.isAsyncPlaceholder = true
      return true
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) {
        i(vnode, true)
      }
      if (isDef(i = vnode.componentInstance)) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue)
        return true
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue)
        } else {
          // v-html and domProps: innerHTML
          if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
            if (i !== elm.innerHTML) {
              return false
            }
          } else {
            // iterate and compare children lists
            var childrenMatch = true
            var childNode = elm.firstChild
            for (var i$1 = 0; i$1 < children.length; i$1++) {
              if (!childNode || !hydrate(childNode, children[i$1], insertedVnodeQueue, inVPre)) {
                childrenMatch = false
                break
              }
              childNode = childNode.nextSibling
            }
            // if childNode is not null, it means the actual childNodes list is
            // longer than the virtual children list.
            if (!childrenMatch || childNode) {
              return false
            }
          }
        }
      }
      if (isDef(data)) {
        var fullInvoke = false
        for (var key in data) {
          if (!isRenderedModule(key)) {
            fullInvoke = true
            invokeCreateHooks(vnode, insertedVnodeQueue)
            break
          }
        }
        if (!fullInvoke && data['class']) {
          // ensure collecting deps for deep class bindings for future updates
          traverse(data['class'])
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text
    }
    return true
  }

  return function patch (oldVnode, vnode, removeOnly) {
    if (isUndef(vnode)) {
      if (isDef(oldVnode)) {
        invokeDestroyHook(oldVnode)
      }
      return
    }

    var isInitialPatch = false
    var insertedVnodeQueue = []

    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      isInitialPatch = true
      createElm(vnode, insertedVnodeQueue)
    } else {
      var isRealElement = isDef(oldVnode.nodeType)
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        if (isRealElement) {
          // either not server-rendered, or hydration failed.
          // create an empty node and replace it
          oldVnode = emptyNodeAt(oldVnode)
        }

        var oldElm = oldVnode.elm
        var parentElm = nodeOps.parentNode(oldElm)

        createElm(vnode, insertedVnodeQueue, oldElm._leaveCb ? null : parentElm, nodeOps.nextSibling(oldElm))

        // update parent placeholder node element, recursively
        if (isDef(vnode.parent)) {
          var ancestor = vnode.parent
          var patchable = isPatchable(vnode)
          while (ancestor) {
            for (var i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor)
            }
            ancestor.elm = vnode.elm
            if (patchable) {
              for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
                cbs.create[i$1](emptyNode, ancestor)
              }
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              var insert = ancestor.data.hook.insert
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (var i$2 = 1; i$2 < insert.fns.length; i$2++) {
                  insert.fns[i$2]()
                }
              }
            } else {
              registerRef(ancestor)
            }
            ancestor = ancestor.parent
          }
        }

        if (isDef(parentElm)) {
          removeVnodes(parentElm, [oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode)
        }
      }
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
  }
}

var directives = {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode) {
    updateDirectives(vnode, emptyNode)
  }
}

function updateDirectives (oldVnode, vnode) {
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode)
  }
}

function _update (oldVnode, vnode) {
  var isCreate = oldVnode === emptyNode
  var isDestroy = vnode === emptyNode
  var oldDirs = normalizeDirectives$1(oldVnode.data.directives, oldVnode.context)
  var newDirs = normalizeDirectives$1(vnode.data.directives, vnode.context)
  var dirsWithInsert = []
  var dirsWithPostpatch = []
  var key, oldDir, dir

  for (key in newDirs) {
    oldDir = oldDirs[key]
    dir = newDirs[key]
    if (!oldDir) {
      callHook$1(dir, 'bind', vnode, oldVnode)
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir)
      }
    } else {
      dir.oldValue = oldDir.value
      callHook$1(dir, 'update', vnode, oldVnode)
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir)
      }
    }
  }

  if (dirsWithInsert.length) {
    var callInsert = function () {
      for (var i = 0; i < dirsWithInsert.length; i++) {
        callHook$1(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) {
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      callInsert()
    }
  }

  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', function () {
      for (var i = 0; i < dirsWithPostpatch.length; i++) {
        callHook$1(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }

  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        callHook$1(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

var emptyModifiers = Object.create(null)
function normalizeDirectives$1 (dirs, vm) {
  var res = Object.create(null)
  if (!dirs) {
    return res
  }
  var i, dir
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i]
    if (!dir.modifiers) {
      dir.modifiers = emptyModifiers
    }
    res[getRawDirName(dir)] = dir
    dir.def = resolveAsset(vm.$options, 'directives', dir.name)
  }
  return res
}

function getRawDirName (dir) {
  return dir.rawName || (dir.name + '.' + (Object.keys(dir.modifiers || {}).join('.')))
}

function callHook$1 (dir, hook, vnode, oldVnode, isDestroy) {
  var fn = dir.def && dir.def[hook]
  if (fn) {
    try {
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy)
    } catch (e) {
      handleError(e, vnode.context, ('directive ' + dir.name + ' ' + hook + ' hook'))
    }
  }
}

var baseModules = [ ref, directives ]

function updateAttrs (oldVnode, vnode) {
  var opts = vnode.componentOptions
  if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
    return
  }
  if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
    return
  }
  var key, cur, old
  var elm = vnode.elm
  var oldAttrs = oldVnode.data.attrs || {}
  var attrs = vnode.data.attrs || {}
  // clone observed objects, as the user probably wants to mutate it
  if (isDef(attrs.__ob__)) {
    attrs = vnode.data.attrs = extend({}, attrs)
  }

  for (key in attrs) {
    cur = attrs[key]
    old = oldAttrs[key]
    if (old !== cur) {
      setAttr(elm, key, cur)
    }
  }

  for (key in oldAttrs) {
    if (isUndef(attrs[key])) {
      if (isXlink(key)) {
        elm.removeAttributeNS(xlinkNS, getXlinkProp(key))
      } else if (!isEnumeratedAttr(key)) {
        elm.removeAttribute(key)
      }
    }
  }
}

function setAttr (el, key, value) {
  if (el.tagName.indexOf('-') > -1) {
    baseSetAttr(el, key, value)
  } else if (isBooleanAttr(key)) {
    // set attribute for blank value
    // e.g. <option disabled>Select one</option>
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key)
    } else {
      // technically allowfullscreen is a boolean attribute for <iframe>,
      // but Flash expects a value of "true" when used on <embed> tag
      value = key === 'allowfullscreen' && el.tagName === 'EMBED' ? 'true' : key
      el.setAttribute(key, value)
    }
  } else if (isEnumeratedAttr(key)) {
    el.setAttribute(key, isFalsyAttrValue(value) || value === 'false' ? 'false' : 'true')
  } else if (isXlink(key)) {
    if (isFalsyAttrValue(value)) {
      el.removeAttributeNS(xlinkNS, getXlinkProp(key))
    } else {
      el.setAttributeNS(xlinkNS, key, value)
    }
  } else {
    baseSetAttr(el, key, value)
  }
}

function baseSetAttr (el, key, value) {
  if (isFalsyAttrValue(value)) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, value)
  }
}

var attrs = { create: updateAttrs, update: updateAttrs }

function updateClass (oldVnode, vnode) {
  var el = vnode.elm
  var data = vnode.data
  var oldData = oldVnode.data
  if (isUndef(data.staticClass) && isUndef(data.class) &&
      (isUndef(oldData) || (isUndef(oldData.staticClass) && isUndef(oldData.class)))) {
    return
  }

  var cls = genClassForVnode(vnode)
  var transitionClass = el._transitionClasses
  if (isDef(transitionClass)) {
    cls = concat(cls, stringifyClass(transitionClass))
  }
  if (cls !== el._prevClass) {
    el.setAttribute('class', cls)
    el._prevClass = cls
  }
}

var klass = { create: updateClass, update: updateClass }

// in some cases, the event used has to be determined at runtime
// so we used some reserved tokens during compile.
var RANGE_TOKEN = '__r'
var CHECKBOX_RADIO_TOKEN = '__c'

// normalize v-model event tokens that can only be determined at runtime.
// it's important to place the event as the first in the array because
// the whole point is ensuring the v-model callback gets called before
// user-attached handlers.
function normalizeEvents (on) {
  if (isDef(on[RANGE_TOKEN])) {
    var event = 'input'
    on[event] = [].concat(on[RANGE_TOKEN], on[event] || [])
    delete on[RANGE_TOKEN]
  }
  // Keeping it for backwards compat with generated code from < 2.4
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || [])
    delete on[CHECKBOX_RADIO_TOKEN]
  }
}

var target$1
function createOnceHandler$1 (event, handler, capture) {
  var _target = target$1 // save current target element in closure
  return function onceHandler () {
    var res = handler.apply(null, arguments)
    if (res !== null) {
      remove$2(event, onceHandler, capture, _target)
    }
  }
}

function add$1 (event, handler, capture, passive) {
  handler = withMacroTask(handler)
  target$1.addEventListener(event, handler, { capture: capture, passive: passive })
}

function remove$2 (event, handler, capture, _target) {
  (_target || target$1).removeEventListener(event, handler._withTask || handler, capture)
}

function updateDOMListeners (oldVnode, vnode) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  var on = vnode.data.on || {}
  var oldOn = oldVnode.data.on || {}
  target$1 = vnode.elm
  normalizeEvents(on)
  updateListeners(on, oldOn, add$1, remove$2, createOnceHandler$1, vnode.context)
  target$1 = undefined
}

var events = { create: updateDOMListeners, update: updateDOMListeners }

function updateDOMProps (oldVnode, vnode) {
  if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
    return
  }
  var key, cur
  var elm = vnode.elm
  var oldProps = oldVnode.data.domProps || {}
  var props = vnode.data.domProps || {}
  // clone observed objects, as the user probably wants to mutate it
  if (isDef(props.__ob__)) {
    props = vnode.data.domProps = extend({}, props)
  }

  for (key in oldProps) {
    if (isUndef(props[key])) {
      elm[key] = ''
    }
  }
  for (key in props) {
    cur = props[key]
    // ignore children if the node has textContent or innerHTML,
    // as these will throw away existing DOM nodes and cause removal errors
    // on subsequent patches
    if (key === 'textContent' || key === 'innerHTML') {
      if (vnode.children) {
        vnode.children.length = 0
      }
      if (cur === oldProps[key]) {
        continue
      }
      // work around Chrome version <= 55 bug where single textNode
      // replaced by innerHTML/textContent retains its parentNode property
      if (elm.childNodes.length === 1) {
        elm.removeChild(elm.childNodes[0])
      }
    }

    if (key === 'value') {
      // store value as _value as well since non-string values will be stringified
      elm._value = cur
      // avoid resetting cursor position when value is the same
      var strCur = isUndef(cur) ? '' : String(cur)
      if (shouldUpdateValue(elm, strCur)) {
        elm.value = strCur
      }
    } else {
      elm[key] = cur
    }
  }
}

function shouldUpdateValue (elm, checkVal) {
  return (!elm.composing && (
    elm.tagName === 'OPTION' ||
    isNotInFocusAndDirty(elm, checkVal) ||
    isDirtyWithModifiers(elm, checkVal)
  ))
}

function isNotInFocusAndDirty (elm, checkVal) {
  // return true when textbox (.number and .trim) loses focus and its value is not equal to the updated value
  var notInFocus = true
  // work around IE bug when accessing document.activeElement in an iframe
  try {
    notInFocus = document.activeElement !== elm
  } catch (e) {}
  return notInFocus && elm.value !== checkVal
}

function isDirtyWithModifiers (elm, newVal) {
  var value = elm.value
  var modifiers = elm._vModifiers
  if (isDef(modifiers)) {
    if (modifiers.lazy) {
      // inputs with lazy should only be updated when not in focus
      return false
    }
    if (modifiers.number) {
      return toNumber(value) !== toNumber(newVal)
    }
    if (modifiers.trim) {
      return value.trim() !== newVal.trim()
    }
  }
  return value !== newVal
}

var domProps = { create: updateDOMProps, update: updateDOMProps }

var parseStyleText = cached(function (cssText) {
  var res = {}
  var listDelimiter = /;(?![^(]*\))/g
  var propertyDelimiter = /:(.+)/
  cssText.split(listDelimiter).forEach(function (item) {
    if (item) {
      var tmp = item.split(propertyDelimiter)
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim())
    }
  })
  return res
})

// merge static and dynamic style data on the same vnode
function normalizeStyleData (data) {
  var style = normalizeStyleBinding(data.style)
  // static style is pre-processed into an object during compilation
  // and is always a fresh object, so it's safe to merge into it
  return data.staticStyle ? extend(data.staticStyle, style) : style
}

// normalize possible array / string values into Object
function normalizeStyleBinding (bindingStyle) {
  if (Array.isArray(bindingStyle)) {
    return arrToObject(bindingStyle)
  }
  if (typeof bindingStyle === 'string') {
    return parseStyleText(bindingStyle)
  }
  return bindingStyle
}

// parent component style should be after child's so that parent component's style could override it
function getStyle (vnode, checkChild) {
  var res = {}
  var styleData

  if (checkChild) {
    var childNode = vnode
    while (childNode.componentInstance) {
      childNode = childNode.componentInstance._vnode
      if (childNode && childNode.data && (styleData = normalizeStyleData(childNode.data))) {
        extend(res, styleData)
      }
    }
  }

  if ((styleData = normalizeStyleData(vnode.data))) {
    extend(res, styleData)
  }

  var parentNode = vnode
  while ((parentNode = parentNode.parent)) {
    if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
      extend(res, styleData)
    }
  }
  return res
}

var cssVarRE = /^--/
var importantRE = /\s*!important$/
var setProp = function (el, name, val) {
  if (cssVarRE.test(name)) {
    el.style.setProperty(name, val)
  } else if (importantRE.test(val)) {
    el.style.setProperty(name, val.replace(importantRE, ''), 'important')
  } else {
    var normalizedName = normalize(name)
    if (Array.isArray(val)) {
      for (var i = 0, len = val.length; i < len; i++) {
        el.style[normalizedName] = val[i]
      }
    } else {
      el.style[normalizedName] = val
    }
  }
}

var vendorNames = ['Webkit', 'Moz', 'ms']
var emptyStyle
var normalize = cached(function (prop) {
  emptyStyle = emptyStyle || document.createElement('div').style
  prop = camelize(prop)
  if (prop !== 'filter' && (prop in emptyStyle)) {
    return prop
  }
  var capName = prop.charAt(0).toUpperCase() + prop.slice(1)
  for (var i = 0; i < vendorNames.length; i++) {
    var name = vendorNames[i] + capName
    if (name in emptyStyle) {
      return name
    }
  }
})

function updateStyle (oldVnode, vnode) {
  var data = vnode.data
  var oldData = oldVnode.data
  if (isUndef(data.staticStyle) && isUndef(data.style) && isUndef(oldData.staticStyle) && isUndef(oldData.style)) {
    return
  }

  var cur, name
  var el = vnode.elm
  var oldStaticStyle = oldData.staticStyle
  var oldStyleBinding = oldData.normalizedStyle || oldData.style || {}
  var oldStyle = oldStaticStyle || oldStyleBinding
  var style = normalizeStyleBinding(vnode.data.style) || {}

  // store normalized style under a different key for next diff
  // make sure to clone it if it's reactive, since the user likely wants to mutate it.
  vnode.data.normalizedStyle = isDef(style.__ob__) ? extend({}, style) : style

  var newStyle = getStyle(vnode, true)

  for (name in oldStyle) {
    if (isUndef(newStyle[name])) {
      setProp(el, name, '')
    }
  }
  for (name in newStyle) {
    cur = newStyle[name]
    if (cur !== oldStyle[name]) {
      setProp(el, name, cur == null ? '' : cur)
    }
  }
}

var style = { create: updateStyle, update: updateStyle }
var platformModules = [ attrs, klass, events, domProps, style ]
var modules = platformModules.concat(baseModules)
var patch = createPatchFunction({ nodeOps: nodeOps, modules: modules })

Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

Vue.prototype.__patch__ = patch
Vue.prototype.$mount = function (el) { return mountComponent(this, query(el)) }
