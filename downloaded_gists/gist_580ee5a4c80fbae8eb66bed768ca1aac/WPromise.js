class WPromise {
    static pending = 'pending';
    static fulfilled = 'fulfilled';
    static rejected = 'rejected';

    constructor(executor) {
        this.status = WPromise.pending; 
        this.value = undefined; 
        this.reason = undefined; 
        this.callbacks = [];
        executor(this._resolve.bind(this), this._reject.bind(this));
    }

    then(onFulfilled, onRejected) {
        return new WPromise((nextResolve, nextReject) => {
            this._handler({
                onFulfilled,
                nextResolve,
                onRejected,
                nextReject
            });
        });
    }

    _resolve(value) {
        if (value instanceof WPromise) {
            value.then(
                this._resolve.bind(this),
                this._reject.bind(this)
            );
        } else {
            this.value = value;
            this.status = WPromise.fulfilled; 
            this.callbacks.forEach(cb => this._handler(cb));
        }
    }

    _reject(reason) {
        if (reason instanceof WPromise) {
            reason.then(
                this._resolve.bind(this),
                this._reject.bind(this)
            );
        } else {
            this.reason = reason;
            this.status = WPromise.rejected;
            this.callbacks.forEach(cb => this._handler(cb));
        }
    }

    _handler(callback) {
        const {
            onFulfilled,
            onRejected,
            nextResolve,
            nextReject
        } = callback;

        if (this.status === WPromise.pending) {
            this.callbacks.push(callback);
        } else if (this.status === WPromise.fulfilled) {
            const nextValue = onFulfilled ? onFulfilled(this.value) : this.value;
            nextResolve(nextValue);
        } else if (this.status === WPromise.rejected) {
            const nextReason = onRejected ? onRejected(this.reason) : this.reason;
            nextReject(nextReason);
        }
    }
}