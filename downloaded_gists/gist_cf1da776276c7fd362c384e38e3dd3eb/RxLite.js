class Observable {
    constructor(subscribe) {
        this._subscribe = subscribe;
    }

    subscribe(observer) {
        return this._subscribe(observer);
    }

    map(callback) {
        return new Observable(observer => {
            return this.subscribe({
                next: value => observer.next(callback(value)),
                error: err => observer.error(err),
                complete: () => observer.complete()
            });
        });
    }

    filter(callback) {
        return new Observable(observer => {
            return this.subscribe({
                next: value => {
                    if (callback(value)) {
                        observer.next(value);
                    }
                },
                error: err => observer.error(err),
                complete: () => observer.complete()
            });
        });
    }

    take(count) {
        return new Observable(observer => {
            let remaining = count;
            return this.subscribe({
                next: value => {
                    if (remaining > 0) {
                        observer.next(value);
                        remaining--;
                        if (remaining === 0) {
                            observer.complete();
                        }
                    }
                },
                error: err => observer.error(err),
                complete: () => observer.complete()
            });
        });
    }

    static of(value) {
        return new Observable(observer => {
            observer.next(value);
            observer.complete();
        });
    }

    static from(iterable) {
        return new Observable(observer => {
            for (let value of iterable) {
                observer.next(value);
            }
            observer.complete();
        });
    }

    static map(callback) {
        return observable => observable.map(callback);
    }

    static filter(callback) {
        return observable => observable.filter(callback);
    }

    static take(count) {
        return observable => observable.take(count);
    }
}

class Observer {
    constructor(handlers) {
        this.handlers = handlers;
    }

    next(value) {
        if (this.handlers && this.handlers.next) {
            this.handlers.next(value);
        }
    }

    error(err) {
        if (this.handlers && this.handlers.error) {
            this.handlers.error(err);
        }
    }

    complete() {
        if (this.handlers && this.handlers.complete) {
            this.handlers.complete();
        }
    }
}

class Subject extends Observable {
    constructor() {
        super(observer => {
            this.observers.push(observer);
            return {
                unsubscribe: () => {
                    const index = this.observers.indexOf(observer);
                    if (index >= 0) {
                        this.observers.splice(index, 1);
                    }
                }
            };
        });
        this.observers = [];
    }

    next(value) {
        for (let observer of this.observers) {
            observer.next(value);
        }
    }

    error(err) {
        for (let observer of this.observers) {
            observer.error(err);
        }
    }

    complete() {
        for (let observer of this.observers) {
            observer.complete();
        }
    }
}

// Example usage:

const observable = Observable.of(1, 2, 3);

observable
    .map(x => x * 2)
    .filter(x => x > 3)
    .take(2)
    .subscribe({
        next: value => console.log(value),
        complete: () => console.log('Complete')
    });

const subject = new Subject();

const observer1 = new Observer({
    next: value => console.log('Observer 1:', value),
    complete: () => console.log('Observer 1: Complete')
});

const observer2 = new Observer({
    next: value => console.log('Observer 2:', value),
    complete: () => console.log('Observer 2: Complete')
});

subject.subscribe(observer1);
subject.subscribe(observer2);

subject.next(1);
subject.next(2);
subject.complete();