function isPromise(obj) {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function'
  );
}
function genRaceConditionChecker({ key }) {
  if (!key) {
    return () => null;
  }

  const globalMap = genRaceConditionChecker.map ||= new Map();
  const callSymbol = Symbol();
  globalMap.set(key, callSymbol);

  return function checker() {
    if (globalMap.has(key) && callSymbol === globalMap.get(key) && globalMap.delete(key)) {
      return null;
    }
    return { raceError: !0 }
  }
};

function genTimeoutChecker({ timeout, reject }) {
  // setTimeout(reject, timeout, { timeoutError: !0 })
  // return () => null;

  const startTime = Date.now();
  return function checker() {
    if (Date.now() - startTime >= timeout) {
      return { timeoutError: !0 }
    }
    return null;
  }
};

const composeChecker = (...args) => {
  return function inner(...partial) {
    if (partial.length) {
      args.push(...partial);
      return inner;
    }

    const result = args.reduce((acc, item) => {
      const errInfo = item();
      return errInfo ? { ...acc, ...errInfo } : acc;
    }, {});

    return Object.keys(result).length > 0 ? result : null;
  }
}

export function flatTry(fn, args = [], config) {
  if (typeof fn !== 'function') {
    throw new Error('Argument must be a function or Promise');
  }

  try {
    const errorFn = err => {
      const errInfo = checkerAdd();
      return errInfo ? [{ err, ...errInfo }, null] : [err, null];
    }
    const successFn = value => {
      const errInfo = checkerAdd();
      return errInfo ? [{ value, ...errInfo }, value] : [null, value];
    }

    const checkerAdd = composeChecker();
    const result = fn(...args);
    const isAsync = isPromise(result);

    if (isAsync) {
      const { resolve, reject, promise } = Promise.withResolvers();
      if (config && config.key) {
        const key = `${config.key}:${fn.name}:${Function.prototype.toString.call(fn)}` // 避免重复注册
        checkerAdd(genRaceConditionChecker({ ...config, key, resolve, reject }));
      }
      if (config && config.timeout) {
        checkerAdd(genTimeoutChecker({ ...config, resolve, reject }));
      }
      result.then(resolve, reject);
      return promise.then(successFn, errorFn);
    }

    return successFn(result);
  } catch (err) {
    return errorFn(err);
  }
}

const withRaceCondition = (fn) => {
  let stamp = 0;

  return async function (...args) {
    stamp = ++stamp % Number.MAX_SAFE_INTEGER;

    const currentStamp = stamp;
    const result = await fn.apply(this, args);

    if (stamp !== currentStamp) {
      throw new Error(`Race condition detected`, { cause: `RaceCondition` });
    }

    return result;
  };
};