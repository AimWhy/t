class ConcurrentMapper {
    constructor() {
        this._promisePool = new Set();
        this._allConcurrencyLimits = [];
    }

    static async map(values, callbackfn, options) {
        const cm = new ConcurrentMapper();
        return cm.pooledMap(values, callbackfn, options);
    }

    _canRunMoreAtLimit(concurrencyLimit) {
        return this._promisePool.size < concurrencyLimit && this._promisePool.size < Math.min(...this._allConcurrencyLimits);
    }

    _addJob(job, concurrencyLimit) {
        this._promisePool.add(job);
        this._allConcurrencyLimits.push(concurrencyLimit);
    }

    _removeJob(job, concurrencyLimit) {
        this._promisePool.delete(job);
        const limitIndex = this._allConcurrencyLimits.indexOf(concurrencyLimit);
        if (limitIndex === -1) {
            throw new Error('No current limit found for finishing job');
        }
        this._allConcurrencyLimits.splice(limitIndex, 1);
    }

    async pooledMap(values, callbackfn, options = { concurrency: Infinity }) {
        const { concurrency } = options;
        const result = [];
        for (let i = 0; i < values.length; i++) {
            while (!this._canRunMoreAtLimit(concurrency)) {
                await Promise.race(this._promisePool).catch(() => { });
            }
            // innerPromise removes itself from the pool and resolves on return from callback.
            const innerPromise = callbackfn(values[i], i, values).finally(() => this._removeJob(innerPromise, concurrency));
            this._addJob(innerPromise, concurrency);
            result.push(innerPromise);
        }
        return Promise.all(result);
    }

    async runInPool(fn, options = { concurrency: Infinity }) {
        const result = await this.pooledMap([''], fn, options);
        return result[0];
    }
}
export { ConcurrentMapper };