export const isPromise = value => value ? typeof value.then === 'function' : false;

const RaceConditionMap = new Map();
const checkRaceCondition = (key) => {
  return key ? false : true;
}
export function useAsyncTry(promise, key) {
  const symbol = key ? Symbol(key) : void 0;
  symbol && RaceConditionMap.set(key, symbol);

  return promise.then((v) => {
    if (!key) {
      return [null, v];
    }
  }).catch((e) => {
    return key ? [e, null] : [];
  }).finally(() => {
    RaceConditionMap.delete(key);
  });
}


function useTry(fn, args, key) {
  if (typeof fn !== 'function') {
    throw new Error('First Argument must be a function');
  }
  if (args && !Array.isArray(args)) {
    throw new Error('Second Argument must be an array');
  }

  try {
    const result = fn(...args);
    const isAsync = isPromise(result);

    return isAsync ? useAsyncTry(result, `[${key}]:${fn.toString()}`) : [result, null];
  } catch (err) {
    return [err, null];
  }
}