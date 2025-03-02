function withLock(fn) {
  let locked = false;
  let waiters = [];

  const lock = () =>
    new Promise((resolve) => {
      if (locked) {
        waiters.push(resolve);
      } else {
        locked = true;
        resolve();
      }
    });

  const unlock = () => {
    if (waiters.length > 0) {
      const resolve = waiters.shift();
      resolve();
    } else {
      locked = false;
    }
  };

  return async (...args) => {
    await lock();
    try {
      return await fn(...args);
    } finally {
      unlock();
    }
  };
}

const updateCache = withLock(async (key, value) => {
  // 模拟一些异步操作
  await new Promise((resolve) => setTimeout(resolve, 1000));
  cache[key] = value;
});

/******************************************************/

const locks = new Map<any, Map<string, Promise<any>>>();

export async function withLock<ReturnType>(scope: any, key: string, callback: () => Promise<ReturnType>): Promise<ReturnType> {
    while (locks.get(scope)?.has(key)) {
        await locks.get(scope)?.get(key);
    }

    const promise = callback();

    if (!locks.has(scope))
        locks.set(scope, new Map());

    locks.get(scope)!.set(key, promise);

    try {
        return await promise;
    } finally {
        locks.get(scope)?.delete(key);

        if (locks.get(scope)?.size === 0)
            locks.delete(scope);
    }
}

