export function throttle(func, wait = 50, options = {}) {
  let lastArgs;
  let lastResult;
  let lastExecuteTime = 0;
  let timeoutId = null;
  const waitMS = wait;
  const leading = 'leading' in options ? !!options.leading : true;
  const trailing = 'trailing' in options ? !!options.trailing : true;
  const callback = (userCall) => {
    const now = Date.now();
    const delta = now - lastExecuteTime;
    if (delta >= waitMS && (!userCall || leading)) {
      lastExecuteTime = now;
      if (timeoutId) {
        this.clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastResult = func.apply(this._parent, lastArgs);
    } else if (timeoutId === null && trailing) {
      const waitLength = leading ? waitMS - delta : waitMS;
      timeoutId = this.setTimeout(callback, waitLength);
    }
    return lastResult;
  };

  return (...args) => {
    lastArgs = args;
    return callback(true);
  };
}
