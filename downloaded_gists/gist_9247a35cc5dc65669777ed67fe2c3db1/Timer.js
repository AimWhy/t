export class Deferred {
  constructor() {
    this.completed = false;
    this.p = new Promise((resolve, reject) => {
      this.res = resolve;
      this.rej = reject;
    });
  }
  get isCompleted() {
    return this.completed;
  }
  get promise() {
    return this.p;
  }

  resolve(value) {
    if (this.res !== undefined) {
      this.completed = true;
      this.res(value);
    }
  }
  reject(error) {
    if (this.rej !== undefined) {
      this.completed = true;
      this.rej(error);
    }
  }
}

const maxSetTimeoutMs = 0x7fffffff;

export function setLongTimeout(timeoutFn, timeoutMs, setTimeoutIdFn) {
  let timeoutId;
  if (timeoutMs > maxSetTimeoutMs) {
    const newTimeoutMs = timeoutMs - maxSetTimeoutMs;
    timeoutId = setTimeout(
      () => setLongTimeout(timeoutFn, newTimeoutMs, setTimeoutIdFn),
      maxSetTimeoutMs
    );
  } else {
    timeoutId = setTimeout(() => timeoutFn(), Math.max(timeoutMs, 0));
  }
  setTimeoutIdFn?.(timeoutId);
  return timeoutId;
}

export class Timer {
  get hasTimer() {
    return !!this.runningState;
  }
  constructor(
    defaultTimeout,
    defaultHandler,
    getCurrentTick = () => Date.now()
  ) {
    this.defaultTimeout = defaultTimeout;
    this.defaultHandler = defaultHandler;
    this.getCurrentTick = getCurrentTick;
  }

  start(ms = this.defaultTimeout, handler = this.defaultHandler) {
    this.startCore(ms, handler, ms);
  }

  clear() {
    if (!this.runningState) {
      return;
    }
    clearTimeout(this.runningState.timeout);
    this.runningState = void 0;
  }

  restart(ms, handler) {
    if (!this.runningState) {
      return this.start(ms, handler);
    }

    const duration = ms ?? this.runningState.intendedDuration;
    const handlerToUse =
      handler ??
      this.runningState.restart?.handler ??
      this.runningState.handler;

    const remainingTime = this.calculateRemainingTime(this.runningState);
    if (duration < remainingTime) {
      this.start(duration, handlerToUse);
    } else if (duration === remainingTime) {
      this.runningState.handler = handlerToUse;
      this.runningState.restart = void 0;
      this.runningState.intendedDuration = duration;
    } else {
      this.runningState.restart = {
        startTick: this.getCurrentTick(),
        duration,
        handler: handlerToUse,
      };
    }
  }

  startCore(duration, handler, intendedDuration) {
    this.clear();
    this.runningState = {
      startTick: this.getCurrentTick(),
      duration,
      intendedDuration,
      handler,
      timeout: setLongTimeout(
        () => this.handler(),
        duration,
        (timer) => {
          if (this.runningState !== void 0) {
            this.runningState.timeout = timer;
          }
        }
      ),
    };
  }

  handler() {
    const restart = this.runningState.restart;
    if (restart !== void 0) {
      const remainingTime = this.calculateRemainingTime(restart);
      this.startCore(remainingTime, () => restart.handler(), restart.duration);
    } else {
      const handler = this.runningState.handler;
      this.clear();
      handler();
    }
  }

  calculateRemainingTime(runningTimeout) {
    const elapsedTime = this.getCurrentTick() - runningTimeout.startTick;
    return runningTimeout.duration - elapsedTime;
  }
}

export class PromiseTimer {
  get hasTimer() {
    return this.timer.hasTimer;
  }
  constructor(defaultTimeout, defaultHandler) {
    this.timer = new Timer(defaultTimeout, () =>
      this.wrapHandler(defaultHandler)
    );
  }

  async start(ms, handler) {
    this.clear();
    this.deferred = new Deferred();
    this.timer.start(ms, handler ? () => this.wrapHandler(handler) : void 0);
    return this.deferred.promise;
  }

  clear() {
    this.timer.clear();
    if (this.deferred) {
      this.deferred.resolve({ timerResult: "cancel" });
      this.deferred = void 0;
    }
  }

  wrapHandler(handler) {
    handler();
    this.deferred.resolve({ timerResult: "timeout" });
    this.deferred = void 0;
  }
}
