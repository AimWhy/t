class NanoObservable {
    constructor(subscribe) {
        this._subscribe = subscribe;
    }

    subscribe(observer) {
        return this._subscribe(observer);
    }

    // Static creation methods

    static of(value) {
        return new NanoObservable(observer => {
            observer.next(value);
            observer.complete();
        });
    }

    static from(iterable) {
        return new NanoObservable(observer => {
            for (let value of iterable) {
                observer.next(value);
            }
            observer.complete();
        });
    }

    // Instance methods

    map(callback) {
        return new NanoObservable(observer => {
            return this.subscribe({
                next: value => observer.next(callback(value)),
                error: err => observer.error(err),
                complete: () => observer.complete()
            });
        });
    }

    filter(callback) {
        return new NanoObservable(observer => {
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
        return new NanoObservable(observer => {
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

    // Static operators

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

// Example usage:
const observable = new NanoObservable(observer => {
    observer.next(1);
    observer.next(2);
    observer.next(3);
    observer.complete();
});

observable
    .map(x => x * 2)
    .filter(x => x > 3)
    .take(2)
    .subscribe({
        next: value => console.log(value),
        complete: () => console.log('Complete')
    });
  // Output: 4, 6, Complete