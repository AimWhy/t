export class AbortedDeferredError extends Error {}

export class DeferredData {
  constructor(data) {
    this.pendingKeys = new Set();
    this.subscriber = void 0;

    let reject;
    this.abortPromise = new Promise((_, r) => (reject = r));
    this.controller = new AbortController();
    const onAbort = () => reject(new AbortedDeferredError('Deferred data aborted'));
    this.controller.signal.addEventListener('abort', onAbort);
    this.unListenAbortSignal = () => this.controller.signal.removeEventListener('abort', onAbort);

    this.data = Object.entries(data).reduce(
      (acc, [key, value]) =>
        Object.assign(acc, {
          [key]: this.trackPromise(key, value),
        }),
      {}
    );
  }
  trackPromise(key, value) {
    if (!(value instanceof Promise)) {
      return value;
    }

    this.pendingKeys.add(key);
    const promise = Promise.race([value, this.abortPromise]).then(
      (data) => this.onSettle(promise, key, null, data),
      (error) => this.onSettle(promise, key, error)
    );
    promise.catch(() => {});
    Object.defineProperty(promise, '_tracked', { get: () => true });
    return promise;
  }
  onSettle(promise, key, error, data) {
    this.pendingKeys.delete(key);
    const isAbort = this.controller.signal.aborted && error instanceof AbortedDeferredError;

    if (this.done || isAbort) {
      this.unListenAbortSignal();
      this.subscriber(isAbort);
    }

    if (isAbort) {
      return error;
    }

    if (error) {
      Object.defineProperty(promise, '_error', { get: () => error });
      return Promise.reject(error);
    }

    Object.defineProperty(promise, '_data', { get: () => data });
    return data;
  }
  _subscribe(fn) {
    this.subscriber = fn;
  }
  cancel() {
    this.controller.abort();
  }
  async resolveData(signal) {
    let aborted = false;
    if (!this.done) {
      const onAbort = () => this.cancel();
      signal.addEventListener('abort', onAbort);

      aborted = await new Promise((resolve) => {
        this._subscribe((isAbort) => {
          signal.removeEventListener('abort', onAbort);

          if (isAbort || this.done) {
            resolve(isAbort);
          }
        });
      });
    }
    return aborted;
  }

  get done() {
    return this.pendingKeys.size === 0;
  }
  get unwrappedData() {
    return Object.entries(this.data).reduce(
      (acc, [key, value]) =>
        Object.assign(acc, {
          // eslint-disable-next-line no-use-before-define
          [key]: unwrapTrackedPromise(value),
        }),
      {}
    );
  }
}

function isTrackedPromise(value) {
  return value instanceof Promise && value._tracked === true;
}

function unwrapTrackedPromise(value) {
  if (!isTrackedPromise(value)) {
    return value;
  }
  if (value._error) {
    throw value._error;
  }
  return value._data;
}

export function defer(data) {
  return new DeferredData(data);
}

const delay = (ms, val) =>
  new Promise((res) => {
    console.log(val);
    setTimeout(res, ms, val);
  });

const test = async () => {
  return defer({
    a: delay(2000, 20),
    b: delay(30000, 30),
    c: await delay(50000, 50),
  });
};

test().then((v) => console.log(v));
