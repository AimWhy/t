function getStackTrace() {
    var stack;

    try {
        throw new Error();
    } catch (e) {
        stack = e.stack;
    }

    if (!stack) {
        stack = 'Error: Could not generate stack trace';
    }

    return stack;
}

setTimeout(function() {
    console.log(getStackTrace());
}, 0);


const Aop = {};

Aop.before = function (fn, beforeFn) {
  return function (...args) {
    beforeFn.apply(this, args);
    return fn.apply(this, args);
  };
};

Aop.after = function (fn, afterFn) {
  return function (...args) {
    const result = fn.apply(this, args);
    afterFn.call(this, result, ...args);
    return result;
  };
};

Aop.around = function (fn, aroundFn) {
  return function (...args) {
    const originalFn = this[fn] || fn;
    const context = this;
    return aroundFn(function (...innerArgs) {
      return originalFn.apply(context, innerArgs);
    }).apply(context, args);
  };
};

module.exports = Aop;