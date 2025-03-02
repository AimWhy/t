function createOverload() {
  const callMap = new Map();

  const overload = function overload(...args) {
    const key = args.map((arg) => typeof arg).join(",");
    const fn = callMap.get(key);
    if (fn) {
      return fn.apply(this, args);
    } else {
      throw new Error(`No implementation for ${key}`);
    }
  };

  overload.addImpl = function (...args) {
    const fn = args.pop();

    if (typeof fn !== "function") {
      throw new Error("Last argument must be a function");
    }

    const types = args;
    callMap.set(types.join(","), fn);
  };

  return overload;
}
