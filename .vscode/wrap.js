export class Governor {
    with(fn) {
        return this.wrap(fn)();
    }
    wrap(fn) {
        const _this = this;
        return async function (...args) {
            const token = await _this.acquire();
            try {
                return await fn.apply(this, args);
            } finally {
                token[Symbol.dispose]();
            }
        };
    }
    wrapIterator(iter) {
        return {
            next: async (n) => await this.wrap(iter.next).call(iter, n),
            return: async () => typeof iter.return === "function" ?
                iter.return() : { done: true, value: void 0 }
        };
    }
}

export class CountingGovernor extends Governor {
    #capacity;
    #acquired = 0;
    #wait = null;
    #idleListeners = [];
    constructor(capacity) {
        if ((capacity >>> 0) !== capacity) {
            throw new TypeError("capacity must be an integer");
        }
        if (capacity < 0) {
            throw new RangeError("capacity must be non-negative");
        }
        super();
        this.#capacity = capacity;
    }
    async acquire() {
        while (this.#acquired >= this.#capacity) {
            if (!this.#wait) {
                this.#wait = Promise.withResolvers();
            }
            await this.#wait.promise;
        }
        ++this.#acquired;
        let hasReleased = false;
        const dispose = () => {
            if (hasReleased) {
                throw new Error("Already released");
            }
            hasReleased = true;
            --this.#acquired;
            if (this.#wait) {
                this.#wait.resolve();
                this.#wait = null;
            } else if (this.#acquired === 0) {
                this.#notifyIdleListeners();
            }
        };

        return ({ release: dispose, [Symbol.dispose]: dispose });
    }
    addIdleListener(cb) {
        this.#idleListeners.push(cb);
    }
    removeIdleListener(cb) {
        const idx = this.#idleListeners.indexOf(cb);
        if (idx >= 0) {
            this.#idleListeners.splice(idx, 1);
        }
    }
    #notifyIdleListeners() {
        for (const cb of this.#idleListeners) {
            try {
                cb();
            } catch { }
        }
    }
}