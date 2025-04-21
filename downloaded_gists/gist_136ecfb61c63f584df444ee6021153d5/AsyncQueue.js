function AsyncQueue() {
    this.promise = new Promise((resolve) => void (this.resolve = resolve));
};

AsyncQueue.prototype.put = function put(v) {
    let resolveNext = null;
    const nextPromise = new Promise((resolve) => void (resolveNext = resolve));
    this.resolve({ value: Promise.resolve(v), nextPromise });
    this.resolve = resolveNext;
};

AsyncQueue.prototype.get = function get() {
    const result = this.promise.then(info => info.value);
    this.promise = this.promise.then(info => info.nextPromise);
    return result;
};

AsyncQueue.loopProcess = (callback, queue = ) => {
    let count = 0;
    const queue = new AsyncQueue();

    (function loop(pre) {
        const pValue = queue.get().then((data) => {
            return typeof data === 'function' ? [data(pre), pre] : [data, pre];
        });

        pValue.then(([value, pre]) => {
            try {
                callback(value, pre, count++);
            } finally {
                loop(value);
            }
        });
    })(null);

    return queue;
}