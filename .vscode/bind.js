class Lock {
    #resolve;
    #promise;
    constructor(values) {
        const { promise, resolve } = Promise.withResolvers();
        this.#resolve = resolve;
        this.#promise = promise;
        this.#setValues(Array.isArray(values) ? values : [values]);
    }

    #setValues(values) {
        for (const v of values) {
            this.release(v);
        }
    }

    release(v) {
        const { promise, resolve } = Promise.withResolvers();
        this.#resolve({ next: promise, value: Promise.resolve(v) });
        this.#resolve = resolve;
    }

    acquire() {
        const prev = this.#promise;
        this.#promise = prev.then(wrap => wrap.next);
        return prev.then(wrap => wrap.value);
    }
}

class ConcurrencyControl {
    #lock;
    #mode = 'limit'; // 'limit' | 'batch' | 'unlimit'
    #capacity = 1;
    #disposeCount = 0;

    constructor(capacity = 1, mode = 'limit') {
        if ((capacity >>> 0) !== capacity) {
            throw new TypeError("capacity must be an integer");
        }
        if (capacity < 0) {
            throw new RangeError("capacity must be non-negative");
        }
        this.#mode = mode;
        this.#capacity = capacity;
        this.#lock = new Lock(Array(this.#capacity).fill(null));
    }

    #dispose() {
        this.#disposeCount = (this.#disposeCount + 1) % this.#capacity;
        if (this.#mode === 'unlimit') {
            return;
        }
        if (this.#mode === 'limit') {
            return this.#lock.release();
        }
        if (this.#mode === 'batch' && this.#disposeCount === 0) {
            for (let i = 0; i < this.#capacity; i++) {
                this.#lock.release();
            }
        }
    }

    acquire() {
        return Promise.resolve(this.#mode === 'unlimit' ? null : this.#lock.acquire());
    }

    with(fn) {
        const _this = this;
        return function (...args) {
            return _this.acquire().then(() => {
                return fn.apply(this, args);
            }).finally(() => {
                _this.#dispose();
            });
        };
    }
}

function test() {
    const res = [];
    const x = new ConcurrencyControl(2, 'limit');

    for (let i = 0; i < 10; i++) {
        const v = x.with(async () => {
            console.log('start' + i);
            await new Promise(resolve => setTimeout(resolve, i == 0 ? 1500 : 3000));
            console.log('end' + i);
            return i;
        })();
        res.push(v);
    }

    Promise.all(res).then(console.log);
}

test();