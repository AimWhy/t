
export class MyWorker {
    constructor(fn, options = {}) {
        this.code = genWorkerCode(fn);
        this.max = options.max;
        this.workPool = [];
        this.idlePool = [];
        this.waitQueue = [];
    }

    async run(...args) {
        const worker = await this._getAvailableWorker();
        return new Promise((resolve, reject) => {
            worker.currentResolve = resolve;
            worker.currentReject = reject;
            worker.postMessage(args);
        });
    }

    stop() {
        this.workPool.forEach((w) => w.terminate());
        this.waitQueue.forEach(([_, reject]) => reject(new Error('Main worker pool stopped before a worker was available.')));
        this.workPool = [];
        this.idlePool = [];
        this.waitQueue = [];
    }

    async _getAvailableWorker() {
        // has idle one?
        if (this.idlePool.length) {
            return this.idlePool.shift();
        }
        // can spawn more?
        if (this.workPool.length < this.max) {
            const worker = new _Worker(this.code, { eval: true });
            worker.on('message', (res) => {
                worker.currentResolve && worker.currentResolve(res);
                worker.currentResolve = null;
                this._assignDoneWorker(worker);
            });
            worker.on('error', (err) => {
                worker.terminate();
                this.workPool.splice(this.workPool.indexOf(worker), 1);
                worker.currentReject && worker.currentReject(err);
                worker.currentReject = null;
            });
            worker.on('exit', (code) => {
                this.workPool.splice(this.workPool.indexOf(worker), 1);
                if (code !== 0) {
                    worker.currentReject &&
                        worker.currentReject(new Error(`Worker stopped with non-0 exit code ${code}`));
                    worker.currentReject = null;
                }
            });
            this.workPool.push(worker);
            return worker;
        }

        // no one is available, we have to wait
        let resolve;
        let reject;
        const onWorkerAvailablePromise = new Promise((r, rj) => {
            resolve = r;
            reject = rj;
        });
        this.waitQueue.push([resolve, reject]);
        return onWorkerAvailablePromise;
    }

    _assignDoneWorker(worker) {
        // someone's waiting already?
        if (this.waitQueue.length) {
            const [resolve] = this.waitQueue.shift();
            resolve(worker);
        } else {
            // take a rest.
            this.idlePool.push(worker);
        }
    }
}

function genWorkerCode(fn) {
    return `
        const doWork = ${fn.toString()};
        self.on('message', async (args) => {
            const res = await doWork(...args);
            self.postMessage(res);
        });
    `;
}