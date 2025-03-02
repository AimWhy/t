class WorkerPool {
    constructor(fn, options = {}) {
        this.code = genWorkerCode(fn);
        this.max = Math.max(1, options.max || 1);
        this.workPool = [];
        this.idlePool = [];
        this.waitQueue = [];
    }

    run(...args) {
        return this._getAvailableWorker().then(worker => {
            return new Promise((resolve, reject) => {
                worker.ipcResolve = resolve;
                worker.ipcReject = reject;
                worker.postMessage(args);
            });
        });
    }

    stop() {
        this.workPool.forEach((w) => w.terminate());
        this.waitQueue.forEach(([_, reject]) => reject(new Error('Main worker pool stopped before a worker was available.')));

        this.workPool = [];
        this.idlePool = [];
        this.waitQueue = [];
    }

    _getAvailableWorker() {
        if (this.idlePool.length) {
            return Promise.resolve(this.idlePool.shift());
        }

        if (this.workPool.length < this.max) {
            const worker = new Worker(
                'data:application/javascript,' + encodeURIComponent(this.code)
            );

            worker.addEventListener('message', (res) => {
                if (worker.ipcResolve) {
                    worker.ipcResolve(res);
                }
                worker.ipcResolve = null;
                this._assignDoneWorker(worker);
            });

            worker.addEventListener('error', (err) => {
                if (worker.ipcReject) {
                    worker.ipcReject(err);
                }
                worker.ipcReject = null;
            });

            worker.addEventListener('exit', (code) => {
                const i = this.workPool.indexOf(worker);
                if (i > -1) {
                    this.workPool.splice(i, 1);
                }

                if (code !== 0 && worker.ipcReject) {
                    worker.ipcReject(new Error(`Worker stopped with non-0 exit code ${code}`));
                }
                worker.ipcResolve = null;
                worker.ipcReject = null;
            });

            this.workPool.push(worker);
            return Promise.resolve(worker);
        }

        let workerResolve;
        let workerReject;
        const onWorkerAvailablePromise = new Promise((resolve, reject) => {
            workerResolve = resolve;
            workerReject = reject;
        });
        this.waitQueue.push([workerResolve, workerReject]);
        return onWorkerAvailablePromise;
    }

    _assignDoneWorker(worker) {
        if (this.waitQueue.length) {
            const [workerResolve] = this.waitQueue.shift();
            workerResolve(worker);
        } else {
            this.idlePool.push(worker);
        }
    }
}

function genWorkerCode(fn) {
    return `
        const doWork = ${fn.toString()}

        self.addEventListener('message', async (event) => {
            const res = await doWork(...event.data)
            debugger
            postMessage(res)
        });
  `;
}