
function call(handler, err, data, _next, _context) {
  let called = false;
  const next = (nextErr, nextData) => {
    if (!called) {
      called = true;
      _next(nextErr, nextData);
    } else {
      console.warn('next called multiple times');
    }
  }

  try {
    const result = handler(err, data, next, _context);
    if (called || result === void 0) {
      return
    }

    if (result && typeof result.then === 'function') {
      result.then((value) => !called && next(null, value), (error) => !called && next(error, null));
    } else {
      next(null, result)
    }
  } catch (e) {
    next(e, null)
  }
}

type ChainHandler = (err, data, next) => any;
export class Chain {
  _stack;

  get count() {
    return this._stack.length;
  }
  get handlers() {
    return this._stack;
  }

  constructor() {
    this._stack = [];
  }

  add(handler: ChainHandler) {
    this._stack.push(handler);
    return () => this.remove(handler);
  }
  remove(handler: ChainHandler) {
    this._stack = this._stack.filter(h => h !== handler);
  }
  run(args, done) {
    let index = 0;
    const self = this;
    const context = {}
    const next = (err, data) => {
      let handler = self._stack[index++];
      if (!handler) {
        return done(err, data, context);
      }
      call(handler, err, data, next, context);
    }
    next(null, args);
  }
}
