export function sequence(promiseFactories) {
    let index = 0;
    const results = [];
    const len = promiseFactories.length;
    const next = (pre) => index < len ? promiseFactories[index++](pre) : null;

    const thenHandler = (result) => {
        if (result !== null) {
            results.push(result);
        }
        const n = next(results);
        return n ? n.then(thenHandler) : results;
    };

    return Promise.resolve(null).then(thenHandler);
}

export function first(promiseFactories, shouldStop = t => !!t, defaultValue = null) {
    let index = 0;
    const len = promiseFactories.length;

    const loop = () => {
        if (index >= len) {
            return Promise.resolve(defaultValue);
        }
        const factory = promiseFactories[index++];
        const promise = Promise.resolve(factory());
        return promise.then(result => shouldStop(result) ? result : loop());
    };

    return loop();
}

export function firstParallel(promiseList, shouldStop = t => !!t, defaultValue = null) {
    if (promiseList.length === 0) {
        return Promise.resolve(defaultValue);
    }
    let todo = promiseList.length;
    const finish = () => {
        todo = -1;
        for (const promise of promiseList) {
            promise.cancel?.();
        }
    };

    return new Promise((resolve, reject) => {
        for (const promise of promiseList) {
            promise.then(result => {
                if (--todo >= 0 && shouldStop(result)) {
                    finish();
                    resolve(result);
                } else if (todo === 0) {
                    resolve(defaultValue);
                }
            }).catch(err => {
                if (--todo >= 0) {
                    finish();
                    reject(err);
                }
            });
        }
    });
}