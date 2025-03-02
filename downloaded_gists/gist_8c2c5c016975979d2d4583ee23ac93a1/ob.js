"use strict";

const exports = {};
const UNDEF = "undefined";
const OBJ = "object";
const SMBL = "__Symbol";
const SUPT_SMBL = typeof Symbol !== UNDEF;

function createSymbol(description) {
  return SUPT_SMBL ? Symbol(description) : `${SMBL}(${description})`;
}
const ObserveSymbols = {
  Observable: createSymbol("Observable"),
  Proxy: createSymbol("Proxy"),
  Nothing: createSymbol("Nothing"),
  BindRequired: createSymbol("BindRequired"),
  BoundMethod: createSymbol("BoundMethod"),
};

function getOwnDescriptor(target, key) {
  return Object.getOwnPropertyDescriptor(target, key);
}

function getDescriptor(target, key) {
  if (!target) return;
  return (
    getOwnDescriptor(target, key) ||
    getDescriptor(Object.getPrototypeOf(target), key)
  );
}

function getValue(target, key, receiver) {
  if (target === receiver) {
    return target[key];
  }
  const descriptor = getDescriptor(target, key);
  if (descriptor && descriptor.get) {
    return descriptor.get.call(receiver);
  } else {
    return target[key];
  }
}

function setValue(target, key, value, receiver) {
  if (target === receiver) {
    target[key] = value;
    return;
  }
  const descriptor = getDescriptor(target, key);
  if (descriptor && descriptor.set) {
    descriptor.set.call(receiver, value);
  } else {
    target[key] = value;
  }
}

function isString(value) {
  return typeof value === "string";
}
function isNumber(value) {
  return typeof value === "number";
}
function isObject(value) {
  return !isNullOrUndefined(value) && typeof value === OBJ;
}
function isArray(value) {
  return Array.isArray ? Array.isArray(value) : value instanceof Array;
}
function isFunction(value) {
  return typeof value === "function";
}
function isNativeClass(value) {
  return isFunction(value) && !getOwnDescriptor(value, "prototype")?.writable;
}
function isArrowFunction(value) {
  return (
    isFunction(value) &&
    value.prototype === undefined &&
    value.toString().indexOf("[native code]") < 0
  );
}
function isUndefined(value) {
  return value === undefined;
}
function isNull(value) {
  return value === null;
}
function isNullOrUndefined(value) {
  return isNull(value) || isUndefined(value);
}
function startsWith(str, sub) {
  if (!str || !sub) return false;
  return str.startsWith
    ? str.startsWith(sub)
    : str.slice && str.slice(0, sub.length) === sub;
}
function isSymbol(value) {
  return SUPT_SMBL ? typeof value === "symbol" : startsWith(value, SMBL);
}
function isPrivateKey(value) {
  return startsWith(value, "__");
}
function isExtensible(value) {
  return !Object.isExtensible || Object.isExtensible(value);
}
function define(target, member, value) {
  if (!isExtensible(target)) return;
  Object.defineProperty(target, member, {
    configurable: true,
    enumerable: false,
    value,
  });
}
function isValidKey(key) {
  return (
    (isString(key) || isNumber(key)) && !isSymbol(key) && !isPrivateKey(key)
  );
}
const hasOwn = (target, member) => {
  return Object.prototype.hasOwnProperty.call(target, member);
};
const getOwnValue = (target, member) => {
  if (!hasOwn(target, member)) return;
  return target[member];
};
function isProxy(target) {
  return !!(target && hasOwn(target, ObserveSymbols.Proxy));
}
function is(x, y) {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
function shallowEqual(objA, objB) {
  if (is(objA, objB)) return true;
  if (
    typeof objA !== OBJ ||
    objA === null ||
    typeof objB !== OBJ ||
    objB === null
  ) {
    return false;
  }
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (!hasOwn(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
      return false;
    }
  }
  return true;
}
function shouldAutoProxy(value) {
  if (!value || !isObject(value) || !isExtensible(value)) return false;
  const ctor = value.constructor;
  return !ctor || ctor === Object || ctor === Array;
}
function isBindRequiredFunction(value) {
  return value && value[ObserveSymbols.BindRequired];
}
function isDecoratorContext(value) {
  return value && value.kind && value.name;
}
function FastMap() {
  const store = Object.create(null);
  const get = (key) => store[key];
  const set = (key, value) => (store[key] = value);
  const has = (key) => store[key] !== void 0;
  const del = (key) => (store[key] = void 0);
  return { get, set, has, del };
}

const ObserveFlags = {
  change: true,
  report: false,
  reportMark: "",
  unref: true,
  ref: true,
  action: false,
};

function ObserveKey(data) {
  return data.id + "." + data.member;
}

const CollectCurrent = {};
function report(data) {
  if (ObserveFlags.report && CollectCurrent.value) {
    data.mark = ObserveFlags.reportMark;
    CollectCurrent.value(data);
  }
}
function trackSwitch(fn, flag, ...args) {
  if (!fn) return;
  const prevChangeFlag = ObserveFlags.change;
  const prevReportFlag = ObserveFlags.report;
  ObserveFlags.change = flag;
  ObserveFlags.report = flag;
  const result = fn(...args);
  ObserveFlags.change = prevChangeFlag;
  ObserveFlags.report = prevReportFlag;
  return result;
}
function track(fn, ...args) {
  return trackSwitch(fn, true, ...args);
}
function untrack(fn, ...args) {
  return trackSwitch(fn, false, ...args);
}
function collect(fn, options) {
  const { mark, context, args, ignore = [] } = { ...options };
  const dependencies = new Set();
  const prevCollectFunction = CollectCurrent.value;
  CollectCurrent.value = (data) => {
    if (data.mark && data.mark !== mark) return;
    const key = ObserveKey(data);
    if (ignore && ignore.indexOf(key) > -1) return;
    dependencies.add(key);
  };
  const prevReportMark = ObserveFlags.reportMark;
  const prevReportFlag = ObserveFlags.report;
  ObserveFlags.reportMark = mark || "";
  ObserveFlags.report = true;
  const result = fn.call(context, ...(args || []));
  ObserveFlags.report = prevReportFlag;
  ObserveFlags.reportMark = prevReportMark;
  CollectCurrent.value = prevCollectFunction;
  return { result, dependencies };
}

const DEFAULT_LOG_PREFIX = "OBER";
const ObserveENVConfig = (() => {
  if (typeof process === UNDEF) return {};
  const OBER_CONFIG = process.env && process.env.OBER_CONFIG;
  if (!OBER_CONFIG) return {};
  if (isObject(OBER_CONFIG)) return OBER_CONFIG;
  try {
    return JSON.parse(OBER_CONFIG) || {};
  } catch {
    const prefix = DEFAULT_LOG_PREFIX;
    throw new Error(`"${prefix}_CONFIG" has error`);
  }
})();
const ObserveConfig = Object.assign(
  {
    mode: "property",
    strict: false,
    maxListeners: 1024,
    logPrefix: DEFAULT_LOG_PREFIX,
  },
  ObserveENVConfig
);

const { logPrefix } = ObserveConfig;
function throwError(message) {
  throw Error(`${logPrefix}: ${message}`);
}
function log(...args) {
  console.log(logPrefix, ...args);
}
function warn(...args) {
  console.warn(logPrefix, ...args);
}
function error(...args) {
  console.error(logPrefix, ...args);
}
function table(...args) {
  if (console.table) {
    console.table(...args);
  } else {
    console.log(...args);
  }
}

const tickOwner = { tasks: [], pending: false };
const builtInBatch = (fn) => fn();
function executeTickTask(task) {
  task();
  task.__pending = false;
}
function executeTickTasks() {
  tickOwner.pending = false;
  const tasks = tickOwner.tasks.slice(0);
  tickOwner.tasks.length = 0;
  const { batch = builtInBatch } = nextTick;
  batch(() => tasks.forEach((task) => executeTickTask(task)));
}
function createTickResolver() {
  if (typeof Promise !== UNDEF) {
    const promise = Promise.resolve();
    return () => promise.then(executeTickTasks).catch((err) => error(err));
  } else if (typeof MutationObserver !== UNDEF) {
    let counter = 1;
    const observer = new MutationObserver(executeTickTasks);
    const textNode = document.createTextNode(String(counter));
    observer.observe(textNode, { characterData: true });
    return () => {
      counter = (counter + 1) % 2;
      textNode.data = String(counter);
    };
  } else {
    return () => setTimeout(executeTickTasks, 0);
  }
}
const resolveAllTickTasks = createTickResolver();
function nextTick(callback) {
  const task = callback;
  if (!task || task.__pending) return;
  task.__pending = true;
  tickOwner.tasks.push(task);
  if (!tickOwner.pending) {
    tickOwner.pending = true;
    resolveAllTickTasks();
  }
}
nextTick.batch = builtInBatch;

function takeDependencies(subject) {
  const reactiver = ReactiveCurrent.value;
  nextTick(() => {
    if (!reactiver || !reactiver.dependencies) return;
    const list = Array.from(reactiver.dependencies || []);
    if (isFunction(subject)) subject(list);
    if (subject) log(`%c${subject}`, "color:red;");
    return table(list);
  });
}

const ObserveSpy = {};
const ObserveListenerStores = {
  change: FastMap(),
  ref: FastMap(),
  unref: FastMap(),
};
function subscribe(type, listener) {
  const store = ObserveListenerStores[type];
  if (!store || !listener) return;
  (listener.dependencies || []).forEach((key) => {
    if (store.has(key)) {
      store.get(key).add(listener);
    } else {
      store.set(key, new Set([listener]));
      notifyRef(key);
    }
  });
  if (ObserveSpy.subscribe) ObserveSpy.subscribe(type, listener);
}
function unsubscribe(type, listener) {
  const store = ObserveListenerStores[type];
  if (!store || !listener) return;
  (listener.dependencies || []).forEach((key) => {
    if (!store.has(key)) return;
    const listeners = store.get(key);
    if (!listeners || !listeners.has(listener)) return;
    if (listeners.size === 1) {
      store.del(key);
      notifyUnref(key);
    } else {
      listeners.delete(listener);
    }
  });
  if (ObserveSpy.unsubscribe) ObserveSpy.unsubscribe(type, listener);
}
function publish(type, data) {
  const store = ObserveListenerStores[type];
  if (!store || isSymbol(data.member) || isPrivateKey(data.member)) return;
  const key = ObserveKey(data);
  const listeners = Array.from(store.get(key) || []);
  if (listeners.length > ObserveConfig.maxListeners) {
    warn(`Found ${listeners.length} listeners of ${key}`);
  }
  listeners.forEach((handler) => handler(data));
  if (ObserveSpy.publish) ObserveSpy.publish(type, data, listeners);
}
function notifyUnref(key) {
  if (ObserveFlags.unref) {
    const [id, member] = key.split(".");
    publish("unref", { id, member });
  }
}
function notifyRef(key) {
  if (ObserveFlags.ref) {
    const [id, member] = key.split(".");
    publish("ref", { id, member });
  }
}
function notify(data) {
  if (ObserveFlags.change) publish("change", data);
}

function checkStrictMode() {
  if (ObserveConfig.strict && !ObserveFlags.action) {
    throwError("Update outside of Action");
  }
}

let uuid = 0;
function ObserveId() {
  return uuid++;
}

function observeInfo(_target) {
  if (!_target || !isObject(_target)) throwError("Invalid observe target");
  const target = _target;
  if (!hasOwn(target, ObserveSymbols.Observable)) {
    const ctor = target?.constructor || {};
    const alias = ctor.displayName || ctor.name || "Object";
    const id = `${alias}_${ObserveId()}`;
    const shadow = isArray(target) ? target.slice(0) : {};
    define(target, ObserveSymbols.Observable, { id, shadow, target });
  }
  return target[ObserveSymbols.Observable];
}

function createObservableMember(target, member, handler) {
  if (!target || !isValidKey(member)) return;
  const desc = getOwnDescriptor(target, member);
  if (!desc || !("value" in desc)) return;
  const { shadow } = observeInfo(target);
  if (!(member in shadow)) shadow[member] = desc.value;
  Object.defineProperty(target, member, {
    get() {
      const value = handler.get
        ? handler.get(shadow, member, target)
        : shadow[member];
      return isArray(value) && isExtensible(value)
        ? createObservableArray(value, handler)
        : value;
    },
    set(value) {
      const success = handler.set && handler.set(shadow, member, value, target);
      if (!success) shadow[member] = value;
    },
    configurable: true,
    enumerable: true,
  });
}
function createObservableObject(target, handler) {
  if (!isObject(target)) return target;
  const info = observeInfo(target);
  if (info.isWrappedObject) return target;
  info.isWrappedObject = true;
  Object.keys(target).forEach((member) => {
    createObservableMember(target, member, handler);
  });
  return target;
}
function createObservableArray(target, handler) {
  const info = observeInfo(target);
  const { id, shadow, isWrappedArray } = info;
  report({ id, member: "length", value: target });
  if (!isArray(target) || isWrappedArray) return target;
  info.isWrappedArray = true;
  const methods = ["push", "pop", "shift", "unshift", "splice", "reverse"];
  methods.forEach((method) => {
    define(target, method, (...args) => {
      checkStrictMode();
      const func = Array.prototype[method];
      const result = func.apply(shadow, args);
      target.length = 0;
      for (let i = 0; i < shadow.length; i++) {
        target[i] = shadow[i];
        createObservableMember(target, i, handler);
      }
      notify({ id, member: "length", value: target });
      return result;
    });
  });
  return target;
}
function createLowProxy(target, handler) {
  if (isObject(target)) {
    define(target, ObserveSymbols.Proxy, true);
    return createObservableObject(target, handler);
  } else {
    throwError("Invalid LowProxy target");
  }
}

const supportNativeProxy = typeof Proxy !== UNDEF;
function createNativeProxy(target, handler) {
  return new Proxy(target, handler);
}
const createProxyInstance = (() => {
  const { mode } = ObserveConfig;
  if (mode === "property") return createLowProxy;
  if (mode === "proxy") return createNativeProxy;
  return supportNativeProxy ? createNativeProxy : createLowProxy;
})();
function isNativeProxy() {
  return createNativeProxy === createProxyInstance;
}
function useBoundMethod(target, member, value, receiver) {
  if (value[ObserveSymbols.BoundMethod]) return value;
  const boundMethod = value.bind(receiver);
  define(boundMethod, ObserveSymbols.BoundMethod, true);
  define(target, member, boundMethod);
  return boundMethod;
}
function isSetArrayLength(target, member) {
  return isArray(target) && member === "length";
}
function createProxy(target) {
  if (isProxy(target) || !isObject(target)) return target;
  const info = observeInfo(target);
  if (info.proxy) return info.proxy;
  info.proxy = createProxyInstance(target, {
    getOwnPropertyDescriptor(target, member) {
      if (member === ObserveSymbols.Proxy) {
        return { configurable: true, enumerable: false, value: true };
      }
      return getOwnDescriptor(target, member);
    },
    get(target, member, receiver) {
      const value = getValue(target, member, receiver);
      if (!isValidKey(member)) return value;
      if (isNativeProxy() && isArrowFunction(value)) {
        throwError(`Cannot have arrow function: ${member}`);
      }
      if (isBindRequiredFunction(value)) {
        return useBoundMethod(target, member, value, receiver);
      }
      if (isFunction(value)) return value;
      const proxy = shouldAutoProxy(value) ? createProxy(value) : value;
      report({ id: info.id, member, value });
      return proxy;
    },
    set(target, member, value, receiver) {
      checkStrictMode();
      if (info.shadow[member] === value && !isSetArrayLength(target, member)) {
        return true;
      }
      setValue(target, member, value, receiver);
      info.shadow[member] = value;
      if (!isValidKey(member)) return true;
      notify({ id: info.id, member, value });
      return true;
    },
  });
  return info.proxy;
}

const { Nothing } = ObserveSymbols;
const ReactiveCurrent = {};
function reactivable(fn, options) {
  const { bind = true, batch, mark, ignore, update } = { ...options };
  let subscribed = bind !== false;
  let changeListener = null;
  const wrapper = function (...args) {
    ReactiveCurrent.value = wrapper;
    ObserveFlags.unref = false;
    unsubscribe("change", changeListener);
    ObserveFlags.unref = true;
    const collectOptions = { context: this, args, mark, ignore };
    const { result, dependencies } = collect(fn, collectOptions);
    changeListener.dependencies = dependencies;
    wrapper.dependencies = dependencies;
    if (subscribed) subscribe("change", changeListener);
    ReactiveCurrent.value = null;
    return result;
  };
  const requestUpdate = (it) => (update ? update(it) : wrapper());
  changeListener = (data) => {
    if (isSymbol(data.member) || isPrivateKey(data.member)) return;
    return batch ? nextTick(requestUpdate) : requestUpdate(data);
  };
  wrapper.subscribe = () => {
    if (subscribed) return;
    subscribe("change", changeListener);
    subscribed = true;
  };
  wrapper.unsubscribe = () => {
    if (!subscribed) return;
    unsubscribe("change", changeListener);
    subscribed = false;
  };
  return wrapper;
}
function autorun(handler) {
  const wrapper = reactivable(handler, { batch: true, bind: true });
  wrapper();
  return wrapper.unsubscribe;
}
function watch(selector, handler, immed = false) {
  let oldValue = Nothing;
  return autorun(() => {
    const value = selector();
    const newValue = isObject(value) ? { ...value } : value;
    if (!shallowEqual(newValue, oldValue) && (oldValue !== Nothing || immed)) {
      handler(newValue, oldValue);
    }
    oldValue = newValue;
  });
}
function computable(fn, options) {
  const { bind = true, batch = false, ...others } = { ...options };
  let subscribed = false;
  let ref = null;
  let reactive;
  const wrapper = function () {
    if (!ReactiveCurrent.value && !subscribed) return fn();
    if (!ref || !reactive) {
      const target = { value: null };
      const { id: mark } = observeInfo(target);
      const keys = [`${mark}.value`];
      ref = createProxy(target);
      const opts = { ...others, batch, mark, bind: false, ignore: keys };
      reactive = reactivable(() => (ref.value = fn.call(this)), opts);
      const destroy = () => {
        if (!subscribed) return;
        reactive.unsubscribe();
        unsubscribe("unref", destroy);
        subscribed = false;
      };
      destroy.dependencies = new Set(keys);
      wrapper.unsubscribe = destroy;
      wrapper.subscribe = () => {
        if (subscribed) return;
        reactive();
        reactive.subscribe?.();
        subscribe("unref", destroy);
        subscribed = true;
      };
    }
    if (bind) {
      wrapper.subscribe();
    } else {
      reactive();
    }
    return ref.value;
  };
  return wrapper;
}

const createNativeObservableClass = (() => {
  try {
    const body = `return class O extends t{
        constructor(...a){
            super(...a);
            return this.constructor!==O?null:c(this);
        }
    }`;
    return new Function("t", "c", body);
  } catch {
    return null;
  }
})();

function observable(target) {
  if (isProxy(target)) {
    return target;
  } else if (isFunction(target)) {
    const willCreateNativeClass =
      isNativeClass(target) && createNativeObservableClass;

    const ObservableClass = willCreateNativeClass
      ? createNativeObservableClass(target, createProxy)
      : class ObservableClass extends target {
          constructor(...args) {
            super(...args);
            if (this.constructor !== ObservableClass) return;
            return createProxy(this);
          }
        };
    define(ObservableClass, "name", target.name);
    define(ObservableClass, ObserveSymbols.Proxy, true);
    return ObservableClass;
  } else if (isObject(target)) {
    return createProxy(target);
  } else {
    return target;
  }
}
function action(target, context, descriptor) {
  if (isFunction(target) && !context) {
    const wrapper = function (...args) {
      ObserveFlags.action = true;
      const result = target.call(this, ...args);
      ObserveFlags.action = false;
      return result;
    };
    return isBindRequiredFunction(target) ? bind(wrapper) : wrapper;
  } else if (isFunction(target) && isDecoratorContext(context)) {
    return action(target);
  } else if (!isFunction(target) && isString(context) && descriptor) {
    if (!descriptor?.value) return;
    return { ...descriptor, value: action(descriptor.value) };
  }
}
function bind(target, context, descriptor) {
  if (isFunction(target) && !context) {
    define(target, ObserveSymbols.BindRequired, true);
    return target;
  } else if (isFunction(target) && isDecoratorContext(context)) {
    return bind(target);
  } else if (!isFunction(target) && isString(context) && descriptor) {
    if (!descriptor?.value) return;
    return { ...descriptor, value: bind(descriptor.value) };
  }
}
function computed(target, context, descriptor) {
  if (isFunction(target) && !context) {
    const wrapper = computable(target);
    return isBindRequiredFunction(target) ? bind(wrapper) : wrapper;
  } else if (isFunction(target) && isDecoratorContext(context)) {
    return computable(target);
  } else if (
    isObject(target) &&
    !isFunction(target) &&
    isString(context) &&
    descriptor
  ) {
    if (!descriptor?.get) return;
    return { ...descriptor, get: computable(descriptor.get) };
  }
}

exports.ObserveConfig = ObserveConfig;
exports.ObserveFlags = ObserveFlags;
exports.ObserveSpy = ObserveSpy;
exports.ReactiveCurrent = ReactiveCurrent;

exports.action = action;
exports.autorun = autorun;
exports.bind = bind;
exports.collect = collect;
exports.computable = computable;
exports.computed = computed;
exports.define = define;
exports.getOwnValue = getOwnValue;
exports.hasOwn = hasOwn;
exports.isProxy = isProxy;
exports.nextTick = nextTick;
exports.observable = observable;
exports.observeInfo = observeInfo;
exports.reactivable = reactivable;
exports.subscribe = subscribe;
exports.takeDependencies = takeDependencies;
exports.track = track;
exports.unsubscribe = unsubscribe;
exports.untrack = untrack;
exports.watch = watch;
