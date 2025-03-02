function pipeFromArray(fns) {
    if (fns.length === 0) {
        return (x) => x;
    }
    if (fns.length === 1) {
        return fns[0];
    }
    return (input) => {
        return fns.reduce((prev, fn) => fn(prev), input);
    };
}
class Subscription {
    constructor() {
        this._teardowns = [];
    }
    unsubscribe() {
        this._teardowns.forEach((teardown) => {
            if (typeof teardown === 'function') {
                teardown();
            }
            else {
                teardown.unsubscribe();
            }
        });
    }
    add(teardown) {
        if (teardown) {
            this._teardowns.push(teardown);
        }
    }
}
class Subscriber extends Subscription {
    constructor(observer) {
        super();
        this.observer = observer;
        this.isStopped = false;
    }
    next(value) {
        if (this.observer.next && !this.isStopped) {
            this.observer.next(value);
        }
    }
    error(value) {
        this.isStopped = true;
        if (this.observer.error) {
            this.observer.error(value);
        }
    }
    complete() {
        this.isStopped = true;
        if (this.observer.complete) {
            this.observer.complete();
        }
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
export class Observable {
    constructor(_subscribe) {
        this._subscribe = _subscribe;
    }
    subscribe(observer) {
        const subscriber = new Subscriber(observer);
        subscriber.add(this._subscribe(subscriber));
        return subscriber;
    }
    pipe(...operations) {
        return pipeFromArray(operations)(this);
    }
}
function map(project) {
    return (observable) => new Observable((subscriber) => {
        let i = 0;
        const subcription = observable.subscribe({
            next(value) {
                return subscriber.next(project(value, i++));
            },
            error(err) {
                subscriber.error(err);
            },
            complete() {
                subscriber.complete();
            },
        });
    });
}
const source = new Observable((observer) => {
    setTimeout(() => {
        observer.next(1);
    }, 3000);
    return {
        unsubscribe: () => console.log('done'),
    };
});
const subscription = source.pipe(map((i) => ++i)).subscribe({
    next: (v) => console.log(v),
    complete: () => console.log('complete'),
});