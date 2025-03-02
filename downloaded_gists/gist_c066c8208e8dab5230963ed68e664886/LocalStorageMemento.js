class Subscription {
    constructor() {
        this._teardown = [];
    }
    unsubscribe() {
        this._teardown.forEach((teardown) => {
            typeof teardown === 'function' ? teardown() : teardown.unsubscribe()
        });
    }
    add(teardown) {
        if (teardown) {
            this._teardown.push(teardown);
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

class Observable {
    constructor(_subscribe) {
        this._subscribe = _subscribe;
    }
    subscribe(observer) {
        const subscriber = new Subscriber(observer);
        subscriber.add(this._subscribe(subscriber));
        return subscriber;
    }
}

export class LocalStorageMemento {
    constructor(prefix) {
        this.prefix = prefix;
    }
    get(key) {
        const json = localStorage.getItem(this.prefix + key);
        return json ? JSON.parse(json) : null;
    }
    watch(key) {
        return new Observable(subscriber => {
            const json = localStorage.getItem(this.prefix + key);
            const first = json ? JSON.parse(json) : null;
            subscriber.next(first);
            const channel = new BroadcastChannel(this.prefix + key);
            channel.addEventListener('message', event => {
                subscriber.next(event.data);
            });
            return () => {
                channel.close();
            };
        });
    }
    set(key, value) {
        localStorage.setItem(this.prefix + key, JSON.stringify(value));
        const channel = new BroadcastChannel(this.prefix + key);
        channel.postMessage(value);
        channel.close();
    }
}

export class LocalStorageGlobalCache extends LocalStorageMemento {
    constructor() {
        super('global-cache:');
    }
}

export class LocalStorageGlobalState extends LocalStorageMemento {
    constructor() {
        super('global-state:');
    }
}