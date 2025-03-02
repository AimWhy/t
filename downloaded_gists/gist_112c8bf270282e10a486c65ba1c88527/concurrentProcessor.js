const DEFAULT_MAX_WORKERS = navigator.hardwareConcurrency - 1;
export async function concurrentProcessor(options) {
    const pool = [];
    const maxWorkers = options.concurrency ?? DEFAULT_MAX_WORKERS;
    try {
        await new Promise((resolve, reject) => {
            for (let i = 0; i < maxWorkers; i += 1) {
                const worker = {
                    isProcessing: false,
                    value: new Worker(options.workerURL, options.workerOptions),
                };
                worker.value.addEventListener("message", onWorkerMessage(worker, pool, options, reject, resolve));
                pool.push(worker);
            }
            void batchProcessor(pool, options, reject, resolve);
        });
    }
    finally {
        // terminate workers
        for (const worker of pool) {
            worker.value.terminate();
        }
    }
}
function onWorkerMessage(worker, pool, options, onError, onComplete) {
    return (event) => {
        options.onProcess(event.data);
        if (options.signal?.aborted) {
            onComplete();
            return;
        }
        worker.isProcessing = false;
        // Since a worker has just completed processing
        // a value, we can start processing another batch
        void batchProcessor(pool, options, onError, onComplete);
    };
}
async function batchProcessor(pool, options, onError, onComplete) {
    const batch = [];
    // find available workers
    const availableWorkers = pool.filter(worker => !worker.isProcessing);
    if (availableWorkers.length === 0) {
        onError(new Error("No available workers"));
        return;
    }
    // assign work to available workers
    for (const worker of availableWorkers) {
        const value = options.values.pop();
        // if value is undefined this means there is no more work to do
        if (value === undefined)
            break;
        batch.push([value, worker]);
    }
    // no work left?
    if (batch.length === 0) {
        // are any workers still processing?
        if (pool.every(worker => !worker.isProcessing)) {
            // now we are done
            onComplete();
        }
        // always return as there is no more work to do
        return;
    }
    // mark workers as processing
    // we should do this here as below we may have to wait for promises to resolve
    // and we don't want another batch to be processed in the meantime
    for (const item of batch) {
        const worker = item[1];
        worker.isProcessing = true;
    }
    let values = [];
    if (options.onRead) {
        const promises = [];
        for (const item of batch) {
            const [value, worker] = item;
            const result = options.onRead(value);
            if (result instanceof Promise) {
                promises.push([result, worker]);
            }
            else {
                values.push([result, worker]);
            }
        }
        if (promises.length > 0) {
            const promiseValues = await Promise.all(promises.map(([promise]) => promise));
            for (let i = 0; i < promiseValues.length; i += 1) {
                // @ts-expect-error
                values.push([promiseValues[i], promises[i][1]]);
            }
        }
    }
    else {
        // if there is no onRead function, it just passes the values through
        values = batch;
    }
    // send work to workers
    for (const item of values) {
        const [value, worker] = item;
        if (options.transfer) {
            if (!isTransferable(value)) {
                onError(new Error("Value is not transferable"));
                return;
            }
            worker.value.postMessage(value, [value]);
        }
        else {
            worker.value.postMessage(value);
        }
    }
}
function isTransferable(value) {
    return (value instanceof ArrayBuffer ||
        value instanceof OffscreenCanvas ||
        value instanceof ImageBitmap ||
        value instanceof MessagePort ||
        value instanceof ReadableStream ||
        value instanceof WritableStream ||
        value instanceof TransformStream ||
        value instanceof VideoFrame);
}