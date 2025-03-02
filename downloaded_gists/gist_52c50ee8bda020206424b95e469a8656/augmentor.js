// #region reraf
export default function reraf (limit) {
  var force, timer, callback, self, args
  reset()
  return function reschedule (_callback, _self, _args) {
    callback = _callback
    self = _self
    args = _args
    if (!timer) {
      timer = requestAnimationFrame(invoke)
    }
    if (--force < 0) {
      stop(true)
    }
    return stop
  }
  function invoke () {
    reset()
    callback.apply(self, args || [])
  }
  function reset () {
    force = limit || Infinity
    timer = 0
  }
  function stop (flush) {
    var didStop = !!timer
    if (didStop) {
      cancelAnimationFrame(timer)
      if (flush) {
        invoke()
      }
    }
    return didStop
  }
}
// #endregion

// #region augmentor
let state = null
export const augmentor = function (fn) {
  const stack = []
  return function hook (...args) {
    const prev = state
    const after = []
    state = { hook, args, stack, i: 0, length: stack.length, after }
    try {
      return fn.apply(null, args)
    } finally {
      state = prev
      for (let i = 0, length = after.length; i < length; i++) {
        after[i]()
      }
    }
  }
}
// #endregion

// #region contextual
export const contextual = function (fn) {
  let context = null
  const augmented = augmentor(function (...args) {
    return fn.apply(context, args)
  })
  return function (...args) {
    return augmented.apply((context = this), args)
  }
}
// #endregion

// #region useState
const updates = new WeakMap()
const setRaf = function (hook) {
  const update = reraf()
  updates.set(hook, update)
  return update
}

const hookdate = function (hook, ctx, args) {
  hook.apply(ctx, args)
}

export const useState = function (
  value,
  options = { async: false, always: false }
) {
  const i = state.i++
  const { hook, args, stack, length } = state
  const { async: asy, always } = options

  if (i === length) {
    state.length = stack.push({
      $: typeof value === 'function' ? value() : value,
      _: asy ? updates.get(hook) || setRaf(hook) : hookdate
    })
  }
  const ref = stack[i]
  return [
    ref.$,
    function (value) {
      const $value = typeof value === 'function' ? value(ref.$) : value
      if (always || ref.$ !== $value) {
        ref.$ = $value
        ref._(hook, null, args)
      }
    }
  ]
}
// #endregion

// #region useReducer
export const useReducer = function (reducer, value, init, options) {
  const fn = typeof init === 'function'
  // avoid `cons [state, update] = ...` Babel destructuring bloat
  const pair = useState(fn ? init(value) : value, fn ? options : init)
  return [
    pair[0],
    function (value) {
      pair[1](reducer(pair[0], value))
    }
  ]
}
// #endregion

// #region createContext, useContext
const hooks = new WeakMap()
const provide = function (value) {
  if (this.value !== value) {
    this.value = value
    hooks.get(this).forEach(function ({ hook, args }) {
      hook.apply(null, args)
    })
  }
}

export const createContext = function (value) {
  const context = { value, provide }
  hooks.set(context, [])
  return context
}

export const useContext = function (context) {
  const { hook, args } = state
  const stack = hooks.get(context)
  const info = { hook, args }
  if (
    !stack.some(function ({ hook }) {
      return hook === info.hook
    })
  ) {
    stack.push(info)
  }
  return context.value
}
// #endregion

// #region dropEffect, hasEffect, useEffect, useLayoutEffect
const effects = new WeakMap()
const stop = function () {}
const setFX = function (hook) {
  const stack = []
  effects.set(hook, stack)
  return stack
}

const createEffect = function (asy) {
  return function (effect, guards) {
    const i = state.i++
    const { hook, after, stack, length } = state
    if (i < length) {
      const info = stack[i]
      const { update, values, stop } = info
      if (!guards || guards.some(different, values)) {
        info.values = guards
        if (asy) {
          stop(asy)
        }
        const { clean } = info
        if (clean) {
          info.clean = null
          clean()
        }
        const invoke = function () {
          info.clean = effect()
        }
        if (asy) {
          update(invoke)
        } else {
          after.push(invoke)
        }
      }
    } else {
      const update = asy ? reraf() : stop
      const info = { clean: null, update, values: guards, stop }
      state.length = stack.push(info);
      (effects.get(hook) || setFX(hook)).push(info)
      const invoke = function () {
        info.clean = effect()
      }
      if (asy) {
        info.stop = update(invoke)
      } else {
        after.push(invoke)
      }
    }
  }
}

export const dropEffect = function (hook) {
  (effects.get(hook) || []).forEach(function (info) {
    const { clean, stop } = info
    stop()
    if (clean) {
      info.clean = null
      clean()
    }
  })
}

export const hasEffect = effects.has.bind(effects)

export const useEffect = createEffect(true)

export const useLayoutEffect = createEffect(false)
// #endregion

// #region useMemo, useCallback
export const useMemo = function (memo, guards) {
  const i = state.i++
  const { stack, length } = state
  if (i === length) {
    state.length = stack.push({ $: memo(), _: guards })
  } else if (!guards || guards.some(different, stack[i]._)) {
    stack[i] = { $: memo(), _: guards }
  }
  return stack[i].$
}

export const useCallback = function (fn, guards) {
  return useMemo(function () {
    return fn
  }, guards)
}
// #endregion

// #region useRef
export const useRef = function (value) {
  const i = state.i++
  const { stack, length } = state
  if (i === length) {
    state.length = stack.push({ current: value })
  }
  return stack[i]
}
// #endregion

function different (value, i) {
  return value !== this[i]
}
