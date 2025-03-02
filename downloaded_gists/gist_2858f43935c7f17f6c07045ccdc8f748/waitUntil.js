export function waitUntil({ checkCondition, intervalMs = 250, timeoutMs = 2000 }) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            clearInterval(interval);
            reject(new Error('Timeout'));
        }, timeoutMs);
        const interval = setInterval(() => {
            if (checkCondition()) {
                clearTimeout(timeoutId);
                clearInterval(interval);
                resolve();
            }
        }, intervalMs);
    });
}


let CachedPromises = {};
export function cachedPromise(promiseId, constructor) {
    if (CachedPromises[promiseId] != null) {
        return CachedPromises[promiseId];
    }
    else {
        const newPromise = constructor();
        CachedPromises[promiseId] = newPromise;
        return newPromise;
    }
}
export async function waitUntil(limitMS, check) {
    if (check()) {
        return true;
    }
    else if (limitMS <= 0) {
        return false;
    }
    else {
        return new Promise((resolve) => {
            setTimeout(resolve, 5);
        }).then(() => {
            return waitUntil(limitMS - 5, check);
        });
    }
}

function waitUntil(condition) {
  return new Promise((resolve, reject) => {
    function tick() {
      if (condition())
        resolve();
      else
        requestAnimationFrame(tick.bind(this));
    }
    tick();
  });
}