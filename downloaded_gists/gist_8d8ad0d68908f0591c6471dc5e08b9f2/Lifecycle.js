function noop() { }

export function Lifecycle(Base) {
  return class Lifecycle extends Base {
    initLifecycle() {
      const hooks = [
        'init',
        'mounted',
        'beforeEach',
        'afterEach',
        'doneEach',
        'ready',
      ];

      this._hooks = {};
      this._lifecycle = {};

      hooks.forEach(hook => {
        const arr = this._hooks[hook] = [];
        this._lifecycle[hook] = fn => arr.push(fn);
      });
    }

    callHook(hookName, data, next = noop) {
      const queue = this._hooks[hookName];
      const catchPluginErrors = this.config.catchPluginErrors;

      (function step(index) {
        const hookFn = queue[index];

        if (index >= queue.length) {
          next(data);
        } else if (typeof hookFn === 'function') {
          try {
            if (hookFn.length === 2) {
              hookFn(data, result => {
                data = result;
                step(index + 1);
              });
            } else {
              const result = hookFn(data);
              data = result === undefined ? data : result;
              step(index + 1);
            }
          } catch (err) {
            if (catchPluginErrors) {
              console.error('plugin error', err);
            } else {
              throw err;
            }

            step(index + 1);
          }
        } else {
          step(index + 1);
        }
      })(0);
    }
  };
}
