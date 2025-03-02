// Inspired by https://github.com/github/fetch/issues/175
//
// withTimeout wraps a promise in a timeout.
export class TimeoutError extends Error {
    constructor(timeout) {
        const message = `Promise timed out after ${timeout.asMilliseconds()} ms`;
        super(message);
        this.name = this.constructor.name;
        this.timeout = timeout;
    }
}
export function withTimeout(promise, timeout) {
    if (timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(() => reject(new TimeoutError(timeout)), timeout.asMilliseconds());
            promise.then(resolve, reject);
        });
    } else {
        return promise;
    }
}