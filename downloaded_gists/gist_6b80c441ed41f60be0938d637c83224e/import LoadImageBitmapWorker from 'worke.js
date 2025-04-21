import LoadImageBitmapWorker from 'worker:./loadImageBitmap.worker.ts';

class WorkerManager {
    static UUID = 0;
    static MAX_WORKERS = navigator.hardwareConcurrency || 4;

    constructor() {
        this._initialized = false;
        this._createdWorkers = 0;
        this._todoQueue = [];
        this._workerPool = [];
        this._resolveHash = {};
    }

    _getWorker() {
        let worker = this._workerPool.pop();

        if (!worker && this._createdWorkers < WorkerManager.MAX_WORKERS) {
            this._createdWorkers++;
            worker = new LoadImageBitmapWorker().worker;
            worker.addEventListener('message', (event) => {
                this._complete(event.data);
                this._returnWorker(event.target);
                this._next();
            });
        }
        return worker;
    }
    _returnWorker(worker) {
        this._workerPool.push(worker);
    }
    _complete(data) {
        if (data.error !== void 0) {
            this._resolveHash[data.uuid].reject(data.error);
        } else {
            this._resolveHash[data.uuid].resolve(data.data);
        }
        this._resolveHash[data.uuid] = null;
    }
    _next() {
        if (!this._todoQueue.length) {
            return;
        }
        const worker = this._getWorker();
        if (!worker) {
            return;
        }

        const toDo = this._todoQueue.pop();
        const jobId = toDo.jobId;
        this._resolveHash[WorkerManager.UUID] = { resolve: toDo.resolve, reject: toDo.reject };
        worker.postMessage({
            data: toDo.arguments,
            uuid: WorkerManager.UUID++,
            jobId,
        });
    }

    async _initWorkers() {
        if (!this._initialized) {
            this._initialized = true;
        }
    }
    async _run(jobId, args) {
        await this._initWorkers();

        const promise = new Promise((resolve, reject) => {
            this._todoQueue.push({ jobId, arguments: args, resolve, reject });
        });
        this._next();
        return promise;
    }

    loadImageBitmap(src, asset) {
        return this._run('loadImageBitmap', [src, asset?.data?.alphaMode]);
    }
}

export const wm = new WorkerManager();