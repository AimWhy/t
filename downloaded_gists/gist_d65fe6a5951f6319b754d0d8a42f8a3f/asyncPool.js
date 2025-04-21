async function asyncPool(poolLimit, array, iteratorFn) {
    // 存储所有的异步任务
    const ret = [];

    // 存储正在执行的异步任务
    const executing = [];

    const needWait = array.length > poolLimit;

    for (const item of array) {
        // 调用iteratorFn函数创建异步任务
        const p = Promise.resolve().then(() => iteratorFn(item, array));

        // 存进所有异步任务中
        ret.push(p);

        // 当poolLimit值小于或等于总任务个数时，进行并发控制
        if (needWait) {
            // 当任务完成后，从正在执行的任务数组中移除已完成的任务
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));

            // 存到正在执行的异步任务中
            executing.push(e);

            if (executing.length >= poolLimit) {
                // 等待较快的任务执行完成
                await Promise.race(executing);
            }
        }
    }

    return Promise.all(ret);
}

async function runParallel(maxConcurrency, source, iteratorFn) {
    const ret = []
    const executing = []
    const needWait = source.length > maxConcurrency

    for (const item of source) {
        const p = Promise.resolve().then(() => iteratorFn(item))
        ret.push(p)

        if (needWait) {
            const e = p.finally(() => executing.splice(executing.indexOf(e), 1))
            const length = executing.push(e)

            if (length >= maxConcurrency) {
                await Promise.race(executing)
            }
        }
    }
    return Promise.allSettled(ret) // Promise.all
}