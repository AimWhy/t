export class AsyncQueue {
    constructor(...values) {
        this.promise = new Promise(resolve => { this.resolve = resolve; });
        
        values.forEach(v => this.put(v));

        return this.fork();
    }

    put(v) {
        let resolveNext = null;
        
        let nextPromise = new Promise(resolve => { resolveNext = resolve; });

        this.resolve({ value: Promise.resolve(v), nextPromise });
        
        this.resolve = resolveNext;
    }

    fork(promise = this.promise) {
        let result = {
            _promise: promise,
            put: v => this.put(v),
            fork: toUnhandled => this.fork(toUnhandled ? result._promise : void 0),
            get: () => {
                const _promiseVal = promise.then(({ value }) => value);
                const _nextPromise = promise.then(({ nextPromise }) => nextPromise);
                
                promise = _promiseVal.then(() => { 
                    result._promise = _nextPromise; 
                    return _nextPromise; 
                }); 
                
                return _promiseVal;
            }
        };
        
        return result;
    }
}