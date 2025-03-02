function aop(fn, options = {}) {
  const before = options.before;
  const after = options.after;

  return function (...args) {
    const self = this;

    if (before) {
      before.call.apply(before, [self, args].concat(args));
    }

    const ret = fn.call.apply(fn, [self].concat(args));

    if (after) {
      after.call.apply(after, [self, ret].concat(args, [ret]));
    }

    return ret;
  }
}