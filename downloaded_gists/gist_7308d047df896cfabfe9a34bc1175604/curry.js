function curry(fn, length) {
  length = length || fn.length;
  return function currified() {
    var args = [].slice.call(arguments);

    if (args.length === 0)
      return currified;

    if (args.length >= length)
      return fn.apply(this, args);

    var child = fn.bind.apply(fn, [this].concat(args));
    return curry(child, length - args.length);
  };
}