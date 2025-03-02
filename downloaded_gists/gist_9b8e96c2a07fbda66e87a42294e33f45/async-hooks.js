function setPropertyDef(obj, prop, value) {
  Object.defineProperty(obj, prop, {
    enumerable: true,
    configurable: true,
    writable: true,
    value
  });
}

function copyProperties(target, ...originals) {
  for (const original of originals) {
    const originalProps = Object.keys(original).concat(Object.getOwnPropertySymbols(original));

    for (const prop of originalProps) {
      const propDescriptor = Object.getOwnPropertyDescriptor(original, prop);
      if (propDescriptor && !Object.prototype.hasOwnProperty.call(target, prop)) {
        Object.defineProperty(target, prop, propDescriptor);
      }
    }
  }
  return target;
}

function copyFnProperties(target, original) {
  const internalProps = ['name', 'length'];
  for (const prop of internalProps) {
    Object.defineProperty(target, prop, { value: original[prop] });
  }
  return target;
}

const hasProtoDefinitions = typeof Object.prototype.__lookupGetter__ === 'function' &&
  typeof Object.prototype.__defineGetter__ === 'function' &&
  typeof Object.prototype.__defineSetter__ === 'function';

function copyToSelf(target) {
  for (const key in target) {
    if (!Object.hasOwnProperty.call(target, key)) {
      const getter = hasProtoDefinitions
        ? target.constructor.prototype.__lookupGetter__(key)
        : Object.getOwnPropertyDescriptor(target, key);

      if (hasProtoDefinitions && getter) {
        target.__defineGetter__(key, getter);
        const setter = target.constructor.prototype.__lookupSetter__(key);
        if (setter) {
          target.__defineSetter__(key, setter);
        }
      } else if (getter) {
        Object.defineProperty(target, key, getter);
      } else {
        target[key] = target[key];
      }
    }
  }
}

/***********************************************************/

function compose(middlewareArr) {
  return function (context, next) {
    let index = -1;

    (function inner(i) {
      if (index >= i) {
        return Promise.reject(new Error('next() called multiple times'))
      }

      index = i

      let fun = index === middlewareArr.length ? next : middlewareArr[i];

      if (!fun) {
        return Promise.resolve() // 调用到根后触发
      } else {
        return Promise.resolve().then(() => fun(context, inner.bind(null, i + 1)))
      }
    })(0);
  }
}

const runHook = (hook, context, type) => {
  const typeBefore = context.type;
  if (type) {
    context.type = type;
  }

  return Promise.resolve(hook.call(context.self, context)).then((res) => {
    if (type) {
      context.type = typeBefore;
    }

    if (res && res !== context) {
      Object.assign(context, res);
    }
  });
};

export const runHooks = (hooks) => (context) => {
  return hooks.reduce((promise, hook) => promise.then(() => runHook(hook, context)), Promise.resolve(context));
}

function fromBeforeHook(hook) {
  return (context, next) => {
    return runHook(hook, context, 'before').then(next);
  };
}

function fromAfterHook(hook) {
  return (context, next) => {
    return next().then(() => runHook(hook, context, 'after'));
  };
}

function fromErrorHook(hook) {
  return (context, next) => next().catch((error) => {
    if (context.error !== error || context.result !== void 0) {
      context.original = { ...context };
      context.error = error;
      delete context.result;
    }

    return runHook(hook, context, 'error').then(() => {
      if (context.result === void 0 && context.error !== void 0) {
        throw context.error;
      }
    });
  });
}

export function collect({ before = [], after = [], error = [] }) {
  const beforeHooks = before.map(fromBeforeHook);
  const afterHooks = [...after].reverse().map(fromAfterHook);
  const errorHooks = error.length ? [fromErrorHook(runHooks(error))] : [];
  return compose([...errorHooks, ...beforeHooks, ...afterHooks]);
}

/***********************************************************/

class BaseHookContext {
  constructor(data = {}) {
    setPropertyDef(this, 'self', void 0);
    Object.assign(this, data);
  }
}

export class HookManager {
  constructor() {
    setPropertyDef(this, '_parent', null);
    setPropertyDef(this, '_params', null);
    setPropertyDef(this, '_middleware', null);
    setPropertyDef(this, '_props', null);
    setPropertyDef(this, '_defaults', void 0);
  }
  parent(parent) {
    this._parent = parent;
    return this;
  }
  middleware(mw) {
    this._middleware = mw?.length ? mw : null;
    return this;
  }
  getMiddleware() {
    const previous = this._parent?.getMiddleware();
    if (previous && this._middleware) {
      return previous.concat(this._middleware);
    }
    return previous || this._middleware;
  }
  collectMiddleware(self) {
    const otherMiddleware = _getMiddleware(self);
    const thisMiddleware = this.getMiddleware();
    if (otherMiddleware && thisMiddleware) {
      return otherMiddleware.concat(thisMiddleware);
    }
    return otherMiddleware || thisMiddleware || [];
  }
  props(props) {
    if (!this._props) {
      this._props = {};
    }
    copyProperties(this._props, props);
    return this;
  }
  getProps() {
    const previous = this._parent?.getProps();
    if (previous && this._props) {
      return copyProperties({}, previous, this._props);
    }
    return previous || this._props || null;
  }
  params(...params) {
    this._params = params;
    return this;
  }
  getParams() {
    const previous = this._parent?.getParams();
    if (previous && this._params) {
      return previous.concat(this._params);
    }
    return previous || this._params;
  }
  defaults(defaults) {
    this._defaults = defaults;
    return this;
  }
  getDefaults(self, args, context) {
    const defaults = typeof this._defaults === 'function' ? this._defaults(self, args, context) : null;
    const previous = this._parent?.getDefaults(self, args, context);
    if (previous && defaults) {
      return Object.assign({}, previous, defaults);
    }
    return previous || defaults;
  }
  getContextClass(Base = BaseHookContext) {
    const ContextClass = class ContextClass extends Base {
      constructor(data) {
        super(data);
        copyToSelf(this);
      }
    };
    const params = this.getParams() || [];
    const props = this.getProps();

    params.forEach((name, index) => {
      if (props?.[name] !== void 0) {
        throw new Error(`Hooks 的「属性 / 参数」同名:'${name}'. 请用 'defaults'`);
      }

      Object.defineProperty(ContextClass.prototype, name, {
        enumerable: true,
        get() { return this?.arguments[index]; },
        set(value) { this.arguments[index] = value; },
      });
    });

    if (props) {
      copyProperties(ContextClass.prototype, props);
    }
    return ContextClass;
  }
  initializeContext(self, args, context) {
    const ctx = this._parent ? this._parent.initializeContext(self, args, context) : context;
    const defaults = this.getDefaults(self, args, ctx) || {};
    if (self) {
      ctx.self = self;
    }
    ctx.arguments = args;

    for (const name of Object.keys(defaults)) {
      if (ctx[name] === void 0) {
        ctx[name] = defaults[name];
      }
    }
    return ctx;
  }
}

function getOriginal(fn) {
  return typeof fn.original === 'function' ? getOriginal(fn.original) : fn;
}

const HOOKS = Symbol('@aimwhy/hooks');
function _getManager(target) {
  return (target && target[HOOKS]) || null;
}

function _setManager(target, manager) {
  const parent = _getManager(target);
  target[HOOKS] = manager.parent(parent);
  return target;
}

function _getMiddleware(target) {
  const manager = _getManager(target);
  return manager ? manager.getMiddleware() : null;
}

function _setMiddleware(target, mw) {
  const manager = new HookManager().middleware(mw);
  return _setManager(target, manager);
}

export function createHookManager(mw, options) {
  const manager = new HookManager().middleware(mw);
  if (options) {
    if (options.params) {
      manager.params(...options.params);
    }
    if (options.defaults) {
      manager.defaults(options.defaults);
    }
    if (options.props) {
      manager.props(options.props);
    }
  }
  return manager;
}

/***********************************************************/

function convertOptions(middlewareOrManager = null) {
  if (!middlewareOrManager) {
    return new HookManager();
  }
  return Array.isArray(middlewareOrManager) ? createHookManager(middlewareOrManager) : middlewareOrManager;
}

function functionHooks(fn, managerOrMiddleware) {
  if (typeof fn !== 'function') {
    throw new Error('Can not apply hooks to non-function');
  }

  const manager = convertOptions(managerOrMiddleware);

  const wrapper = function (...args) {
    const { Context, original } = wrapper;

    // 如果传递了一个已有的 HookContext 实例，则返回它
    const returnContext = args[args.length - 1] instanceof Context;
    const base = returnContext ? args.pop() : new Context();
    const context = manager.initializeContext(this, args, base);
    const hookChain = [
      // 返回 `ctx.result` 或 已传递的 HookContext
      (ctx, next) => next().then(() => returnContext ? ctx : ctx.result),

      ...(manager.collectMiddleware(this, args) || []),

      (ctx, next) => {
        if (Object.prototype.hasOwnProperty.call(context, 'result')) {
          return next();
        }

        // 如果尚未设置“ctx.result”，则运行实际的原始方法
        return Promise.resolve(original.apply(this, ctx.arguments)).then((result) => {
          ctx.result = result;
          return next();
        });
      }
    ];

    return compose(hookChain).call(this, context);
  };

  copyFnProperties(wrapper, fn);
  copyProperties(wrapper, fn);
  _setManager(wrapper, manager);

  return Object.assign(wrapper, {
    original: getOriginal(fn),
    Context: manager.getContextClass(),
    createContext: (data = {}) => new wrapper.Context(data),
  });
}

function objectHooks(obj, hooks) {
  if (Array.isArray(hooks)) {
    return _setMiddleware(obj, hooks);
  }

  for (const method of Object.keys(hooks)) {
    const target = typeof obj[method] === 'function' ? obj : obj.prototype;
    const fn = target && target[method];
    if (typeof fn !== 'function') {
      throw new Error(`Can not apply hooks. '${method}' is not a function`);
    }
    const manager = convertOptions(hooks[method]);
    target[method] = functionHooks(fn, manager.props({ method }));
  }
  return obj;
}

const hookDecorator = (managerOrMiddleware) => {
  return (_target, method, descriptor) => {
    const manager = convertOptions(managerOrMiddleware);
    if (!descriptor) {
      _setManager(_target.prototype, manager);
      return _target;
    }

    const fn = descriptor.value;
    if (typeof fn !== 'function') {
      throw new Error(`Can not apply hooks. '${method}' is not a function`);
    }

    descriptor.value = functionHooks(fn, manager.props({ method }));
    return descriptor;
  };
};

export function hooks(...args) {
  const [target, _hooks] = args;

  if (typeof target === 'function' &&
    (_hooks instanceof HookManager || Array.isArray(_hooks) || args.length === 1)) {
    return functionHooks(target, _hooks);
  }

  if (args.length === 2) {
    return objectHooks(target, _hooks);
  }

  return hookDecorator(target);
}