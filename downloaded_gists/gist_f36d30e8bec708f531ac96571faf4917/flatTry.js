function isPromise(obj) {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function'
  );
}

export function flatTry(fn, args = [], timestamp) {
  if (typeof fn !== 'function') {
    throw new Error('Argument must be a function or Promise');
  }

  function successFn(value) {
    return [null, value, timestamp];
  }

  function errorFn(err) {
    return [err, null, timestamp];
  }

  try {
    const result = fn(...args);
    return isPromise(result) ? result.then(successFn, errorFn) : [null, result, timestamp];
  } catch (err) {
    return [err, null, timestamp];
  }
}
