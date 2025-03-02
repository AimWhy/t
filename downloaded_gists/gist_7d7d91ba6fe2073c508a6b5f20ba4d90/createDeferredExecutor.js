export function createDeferredExecutor() {
    const executor = ((resolve, reject) => {
        executor.state = 'pending';
        executor.resolve = (data) => {
            if (executor.state !== 'pending') {
                return;
            }
            executor.result = data;
            const onFulfilled = (value) => {
                executor.state = 'fulfilled';
                return value;
            };
            return resolve(data instanceof Promise ? data : Promise.resolve(data).then(onFulfilled));
        };
        executor.reject = (reason) => {
            if (executor.state !== 'pending') {
                return;
            }
            queueMicrotask(() => {
                executor.state = 'rejected';
            });
            return reject((executor.rejectionReason = reason));
        };
    });
    executor.promise = new Promise(executor);
    return executor;
}