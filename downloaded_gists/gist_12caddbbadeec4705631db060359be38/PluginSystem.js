const error = console.error.bind(console);
const isObject = val => val && typeof val === 'object';

const PluginSystem = class {
  lifecycle;
  lifecycleKeys;
  registerPlugins = {};
  constructor(lifecycle) {
    this.lifecycle = lifecycle;
    this.lifecycleKeys = Object.keys(lifecycle);
  }
  usePlugin(plugin) {
    const pluginName = plugin.name;
    if (!this.registerPlugins[pluginName]) {
      this.registerPlugins[pluginName] = plugin;
      for (const key in this.lifecycle) {
        const pluginLife = plugin[key];
        if (pluginLife) {
          this.lifecycle[key].on(pluginLife);
        }
      }
    }
  }
  removePlugin(pluginName) {
    const plugin = this.registerPlugins[pluginName];
    for (const key in plugin) {
      if (key !== 'name') {
        this.lifecycle[key].remove(plugin[key]);
      }
    }
  }
};

const SyncHook = class {
  type = '';
  listeners = new Set();
  constructor(type) {
    if (type) {
      this.type = type;
    }
  }
  on(fn) {
    if (typeof fn === 'function') {
      this.listeners.add(fn);
    }
  }
  once(fn) {
    const self = this;
    this.on(function wrapper(...args) {
      self.remove(wrapper);
      return fn.apply(null, args);
    });
  }
  emit(...data) {
    if (this.listeners.size > 0) {
      this.listeners.forEach((fn) => fn.apply(null, data));
    }
  }
  remove(fn) {
    return this.listeners.delete(fn);
  }
  removeAll() {
    this.listeners.clear();
  }
};

// src/asyncHook.ts
const AsyncHook = class extends SyncHook {
  emit(...data) {
    let result;
    const ls = Array.from(this.listeners);
    if (ls.length > 0) {
      let i = 0;
      const call = (prev) => {
        if (prev === false) {
          return false;
        } else if (i < ls.length) {
          return Promise.resolve(ls[i++].apply(null, data)).then(call);
        }
      };
      result = call();
    }
    return Promise.resolve(result);
  }
};

function checkReturnData(originData, returnData) {
  if (!isObject(returnData)) {
    return false;
  }
  if (originData !== returnData) {
    for (const key in originData) {
      if (!(key in returnData)) {
        return false;
      }
    }
  }
  return true;
}
const SyncWaterfallHook = class extends SyncHook {
  onerror = error;
  constructor(type) {
    super();
    this.type = type;
  }
  emit(data) {
    if (!isObject(data)) {
      error(`"${this.type}" hook response data must be an object.`);
    }
    for (const fn of this.listeners) {
      try {
        const tempData = fn(data);
        if (checkReturnData(data, tempData)) {
          data = tempData;
        } else {
          this.onerror(`The "${this.type}" type has a plugin return value error.`);
          break;
        }
      } catch (e) {
        this.onerror(e);
      }
    }
    return data;
  }
};

const AsyncWaterfallHook = class extends SyncHook {
  onerror = error;
  constructor(type) {
    super();
    this.type = type;
  }
  emit(data) {
    if (!isObject(data)) {
      error(`"${this.type}" hook response data must be an object.`);
    }
    const ls = Array.from(this.listeners);
    if (ls.length > 0) {
      let i = 0;
      const processError = (e) => {
        this.onerror(e);
        return data;
      };
      const call = (prevData) => {
        if (prevData === false) {
          return false;
        } else if (checkReturnData(data, prevData)) {
          data = prevData;
          if (i < ls.length) {
            try {
              return Promise.resolve(ls[i++](data)).then(call, processError);
            } catch (e) {
              return processError(e);
            }
          }
        } else {
          this.onerror(`The "${this.type}" type has a plugin return value error.`);
        }
        return data;
      };
      return Promise.resolve(call(data));
    }
    return Promise.resolve(data);
  }
};

export {
  AsyncHook,
  AsyncWaterfallHook,
  PluginSystem,
  SyncHook,
  SyncWaterfallHook,
};
