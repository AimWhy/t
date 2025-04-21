export const identity = x => x;
export const isObservable = x => typeof x === 'object' && x !== null && 'subscribe' in x;
export function pipeFromArray(fns) {
    if (fns.length === 0) {
        return identity;
    }
    if (fns.length === 1) {
        return fns[0];
    }
    return function piped(input) {
        return fns.reduce((prev, fn) => fn(prev), input);
    };
}

export function observable(source) {
    const self = {
        subscribe(observer) {
            let teardownRef = null;
            let isDone = false;
            let unsubscribed = false;
            let teardownImmediately = false;
            function unsubscribe() {
                if (teardownRef === null) {
                    teardownImmediately = true;
                    return;
                }
                if (unsubscribed) {
                    return;
                }
                unsubscribed = true;
                if (typeof teardownRef === 'function') {
                    teardownRef();
                } else if (teardownRef) {
                    teardownRef.unsubscribe();
                }
            }

            teardownRef = source({
                next(value) {
                    if (!isDone) {
                        observer.next?.(value);
                    }
                },
                error(err) {
                    if (!isDone) {
                        observer.error?.(err);
                        unsubscribe();
                    }
                    isDone = true;
                },
                complete() {
                    if (!isDone) {
                        observer.complete?.();
                        unsubscribe();
                    }
                    isDone = true;
                },
            });

            if (teardownImmediately) {
                unsubscribe();
            }

            return { unsubscribe };
        },
        pipe(...operations) {
            return pipeFromArray(operations)(self);
        },
    };
    return self;
}

/********************************/

export class ObservableAbortError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ObservableAbortError';
        Object.setPrototypeOf(this, ObservableAbortError.prototype);
    }
}
export function observableToPromise(observable) {
    let abort;
    const promise = new Promise((resolve, reject) => {
        let isDone = false;
        function onDone() {
            if (!isDone) {
                reject(new ObservableAbortError('This operation was aborted.'));
                obs$.unsubscribe();
            }
            isDone = true;
        }
        const obs$ = observable.subscribe({
            next(data) {
                isDone = true;
                resolve(data);
            },
            error(data) {
                isDone = true;
                reject(data);
            },
            complete() {
                isDone = true;
            },
        });
        abort = onDone;
    });
    return { promise, abort };
}

export function map(project) {
    return (originalObserver) => ({
        subscribe(observer) {
            let index = 0;
            return originalObserver.subscribe({
                next(value) {
                    observer.next?.(project(value, index++));
                },
                error(error) {
                    observer.error?.(error);
                },
                complete() {
                    observer.complete?.();
                },
            });
        }
    });
}

export function tap(observer) {
    return (originalObserver) => ({
        subscribe(observer2) {
            return originalObserver.subscribe({
                next(v) {
                    observer.next?.(v);
                    observer2.next?.(v);
                },
                error(v) {
                    observer.error?.(v);
                    observer2.error?.(v);
                },
                complete() {
                    observer.complete?.();
                    observer2.complete?.();
                },
            });
        }
    });
}

export function share(_opts) {
    return (originalObserver) => {
        let refCount = 0;
        let subscription = null;
        const observers = [];
        function startIfNeeded() {
            subscription ||= originalObserver.subscribe({
                next(value) {
                    for (const observer of observers) {
                        observer.next?.(value);
                    }
                },
                error(error) {
                    for (const observer of observers) {
                        observer.error?.(error);
                    }
                },
                complete() {
                    for (const observer of observers) {
                        observer.complete?.();
                    }
                },
            });
        }
        function resetIfNeeded() {
            if (refCount === 0 && subscription) {
                const _sub = subscription;
                subscription = null;
                _sub.unsubscribe();
            }
        }
        return {
            subscribe(observer) {
                refCount++;
                observers.push(observer);
                startIfNeeded();
                return {
                    unsubscribe() {
                        refCount--;
                        resetIfNeeded();
                        const index = observers.findIndex((v) => v === observer);
                        if (index > -1) {
                            observers.splice(index, 1);
                        }
                    },
                };
            },
        };
    };
}
