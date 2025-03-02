export class SyncHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tap(name, listener) {
    this.listeners.push(listener);
  }
  call(...args) {
    for (const listener of this.listeners) {
      listener(...args);
    }
  }
}

export class SyncBailHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tap(name, listener) {
    this.listeners.push(listener);
  }
  call(...args) {
    let result;
    for (const listener of this.listeners) {
      result = listener(...args);
      if (result !== void 0) {
        break;
      }
    }
    return result;
  }
}

export class SyncWaterfallHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tap(name, listener) {
    this.listeners.push(listener);
  }
  call(...args) {
    let result = args[0];
    for (const listener of this.listeners) {
      result = listener(result, ...args.slice(1));
    }
    return result;
  }
}

export class SyncLoopHook {
  constructor(args) {
    if (!Array.isArray(args)) {
      args = [args];
    }
    this.args = args;
    this.taps = [];
  }

  tap(name, fn) {
    this.taps.push({
      name: name,
      fn: fn,
      type: 'sync',
      call: true,
      stage: 0,
    });
  }

  call(...args) {
    for (let i = 0; i < this.taps.length; i++) {
      const { fn, call, stage } = this.taps[i];
      if (stage !== 0) {
        continue;
      }
      let res;
      do {
        res = fn(...args);
      } while (res !== void 0 && call);
    }
  }
}

export class AsyncParallelHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tapAsync(name, listener) {
    this.listeners.push(listener);
  }
  callAsync(...args) {
    const callback = args.pop();
    let count = 0;
    const done = () => {
      count++;
      if (count === this.listeners.length) {
        callback();
      }
    };
    for (const listener of this.listeners) {
      listener(...args, done);
    }
  }
}

export class AsyncParallelBailHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tapAsync(name, listener) {
    this.listeners.push(listener);
  }
  callAsync(...args) {
    const callback = args.pop();
    let count = 0;
    let done = false;
    const finalCallback = (err, result) => {
      if (done) {
        return;
      }
      count++;
      if (err || result !== void 0 || count === this.listeners.length) {
        done = true;
        callback(err, result);
      }
    };
    for (const listener of this.listeners) {
      listener(...args, finalCallback);
      if (done) {
        return;
      }
    }
  }
}

export class AsyncParallelWaterfallHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tapAsync(name, listener) {
    this.listeners.push(listener);
  }
  callAsync(...args) {
    const callback = args.pop();
    let count = 0;
    let done = false;
    let prevResult = args[0];
    const finalCallback = (err, result) => {
      if (done) {
        return;
      }
      count++;
      if (count === this.listeners.length) {
        done = true;
        callback(err, result);
      } else {
        prevResult = result;
      }
    };
    for (const listener of this.listeners) {
      listener(prevResult, ...args.slice(1), finalCallback);
      if (done) {
        return;
      }
    }
  }
}

export class AsyncSeriesHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tapAsync(name, listener) {
    this.listeners.push(listener);
  }
  callAsync(...args) {
    const callback = args.pop();
    const next = (i) => {
      if (i === this.listeners.length) {
        return callback();
      }
      const listener = this.listeners[i];
      listener(...args, () => next(i + 1));
    };
    next(0);
  }
}

export class AsyncSeriesBailHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tapAsync(name, listener) {
    this.listeners.push(listener);
  }
  callAsync(...args) {
    const callback = args.pop();
    let index = 0;
    const next = (err, result) => {
      if (err || result !== void 0 || index === this.listeners.length) {
        return callback(err, result);
      }
      const listener = this.listeners[index++];
      listener(...args, next);
    };
    next();
  }
}

export class AsyncSeriesWaterfallHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tapAsync(name, listener) {
    this.listeners.push(listener);
  }
  callAsync(...args) {
    const callback = args.pop();
    let index = 0;
    const next = (prevResult) => {
      if (index === this.listeners.length) {
        return callback(null, prevResult);
      }
      const listener = this.listeners[index++];
      listener(...args, next, prevResult);
    };
    next(void 0);
  }
}

export class AsyncSeriesLoopHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tapAsync(name, listener) {
    this.listeners.push(listener);
  }
  callAsync(...args) {
    const callback = args.pop();
    let i = 0;
    let completed = 0;
    const iterate = () => {
      const listener = this.listeners[i];
      listener(...args, (err, result) => {
        if (err != null) {
          return callback(err);
        }
        const shouldContinue = this.args[0] ? this.args[0]() : true;
        if (!shouldContinue) {
          return callback(null);
        }
        completed++;
        if (completed === this.listeners.length) {
          return callback(null);
        }
        i = (i + 1) % this.listeners.length;
        iterate();
      });
    };
    iterate();
  }
}

export class AsyncSeriesPromiseHook {
  constructor(args) {
    this.args = args;
    this.listeners = [];
  }
  tapPromise(name, listener) {
    this.listeners.push(listener);
  }
  promise(...args) {
    let promise = Promise.resolve();
    for (const listener of this.listeners) {
      promise = promise.then(() => listener(...args));
    }
    return promise;
  }
}

// SyncHook：同步钩子，所有监听器都必须是同步的。
// SyncBailHook：具有“短路”效果的同步钩子，当某个监听器返回值不符合预期时就会停止后续监听器的执行并返回结果。
// SyncWaterfallHook：将前一个监听器的返回值传递给下一个监听器作为参数的同步钩子。
// SyncLoopHook：可以用循环控制流程的同步钩子，类似于 SyncHook，但是可以重复多次执行回调函数。
// AsyncParallelHook：异步并行钩子，所有监听器都是异步的，并且每个监听器执行完毕后都会调用回调函数。
// AsyncParallelBailHook：具有“短路”效果的异步并行钩子，当某个监听器的回调函数的第二个参数不为 void 0 时就会停止后续监听器的执行并返回结果。
// AsyncParallelWaterfallHook：将前一个监听器的返回值传递给下一个监听器作为参数的异步并行钩子。
// AsyncSeriesHook：异步串行钩子，所有监听器都是异步的，但是需要等待上一个监听器执行完毕才能执行下一个监听器。
// AsyncSeriesBailHook：具有“短路”效果的异步串行钩子，当某个监听器的回调函数的第二个参数不为 void 0 时就会停止后续监听器的执行并返回结果。
// AsyncSeriesWaterfallHook：将前一个监听器的返回值传递给下一个监听器作为参数的异步串行钩子。
// AsyncSeriesLoopHook：可以用循环控制流程的异步串行钩子，类似于 AsyncSeriesHook，但是提供了一种额外的方式来控制是否应该继续执行下一个监听器。
// AsyncSeriesPromiseHook：基于 Promise 的异步串行钩子，与 AsyncSeriesHook 类似，但是使用 Promise 来管理异步操作。
