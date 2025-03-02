import { isThenable } from './is';
/** SyncPromise internal states */
var States;
(function (States) {
    /** Pending */
    States["PENDING"] = "PENDING";
    /** Resolved / OK */
    States["RESOLVED"] = "RESOLVED";
    /** Rejected / Error */
    States["REJECTED"] = "REJECTED";
})(States || (States = {}));
/**
 * Thenable class that behaves like a Promise and follows it's interface
 * but is not async internally
 */
class SyncPromise {
    constructor(executor) {
        this._state = States.PENDING;
        this._handlers = [];
        /** JSDoc */
        this._resolve = (value) => {
            this._setResult(States.RESOLVED, value);
        };
        /** JSDoc */
        this._reject = (reason) => {
            this._setResult(States.REJECTED, reason);
        };
        /** JSDoc */
        this._setResult = (state, value) => {
            if (this._state !== States.PENDING) {
                return;
            }
            if (isThenable(value)) {
                value.then(this._resolve, this._reject);
                return;
            }
            this._state = state;
            this._value = value;
            this._executeHandlers();
        };
        // TODO: FIXME
        /** JSDoc */
        this._attachHandler = (handler) => {
            this._handlers = this._handlers.concat(handler);
            this._executeHandlers();
        };
        /** JSDoc */
        this._executeHandlers = () => {
            if (this._state === States.PENDING) {
                return;
            }
            const cachedHandlers = this._handlers.slice();
            this._handlers = [];
            cachedHandlers.forEach(handler => {
                if (handler.done) {
                    return;
                }
                if (this._state === States.RESOLVED) {
                    if (handler.onfulfilled) {
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        handler.onfulfilled(this._value);
                    }
                }
                if (this._state === States.REJECTED) {
                    if (handler.onrejected) {
                        handler.onrejected(this._value);
                    }
                }
                handler.done = true;
            });
        };
        try {
            executor(this._resolve, this._reject);
        }
        catch (e) {
            this._reject(e);
        }
    }
    /** JSDoc */
    static resolve(value) {
        return new SyncPromise(resolve => {
            resolve(value);
        });
    }
    /** JSDoc */
    static reject(reason) {
        return new SyncPromise((_, reject) => {
            reject(reason);
        });
    }
    /** JSDoc */
    static all(collection) {
        return new SyncPromise((resolve, reject) => {
            if (!Array.isArray(collection)) {
                reject(new TypeError(`Promise.all requires an array as input.`));
                return;
            }
            if (collection.length === 0) {
                resolve([]);
                return;
            }
            let counter = collection.length;
            const resolvedCollection = [];
            collection.forEach((item, index) => {
                SyncPromise.resolve(item)
                    .then(value => {
                    resolvedCollection[index] = value;
                    counter -= 1;
                    if (counter !== 0) {
                        return;
                    }
                    resolve(resolvedCollection);
                })
                    .then(null, reject);
            });
        });
    }
    /** JSDoc */
    then(onfulfilled, onrejected) {
        return new SyncPromise((resolve, reject) => {
            this._attachHandler({
                done: false,
                onfulfilled: result => {
                    if (!onfulfilled) {
                        // TODO: ¯\_(ツ)_/¯
                        // TODO: FIXME
                        resolve(result);
                        return;
                    }
                    try {
                        resolve(onfulfilled(result));
                        return;
                    }
                    catch (e) {
                        reject(e);
                        return;
                    }
                },
                onrejected: reason => {
                    if (!onrejected) {
                        reject(reason);
                        return;
                    }
                    try {
                        resolve(onrejected(reason));
                        return;
                    }
                    catch (e) {
                        reject(e);
                        return;
                    }
                },
            });
        });
    }
    /** JSDoc */
    catch(onrejected) {
        return this.then(val => val, onrejected);
    }
    /** JSDoc */
    finally(onfinally) {
        return new SyncPromise((resolve, reject) => {
            let val;
            let isRejected;
            return this.then(value => {
                isRejected = false;
                val = value;
                if (onfinally) {
                    onfinally();
                }
            }, reason => {
                isRejected = true;
                val = reason;
                if (onfinally) {
                    onfinally();
                }
            }).then(() => {
                if (isRejected) {
                    reject(val);
                    return;
                }
                resolve(val);
            });
        });
    }
    /** JSDoc */
    toString() {
        return '[object SyncPromise]';
    }
}
