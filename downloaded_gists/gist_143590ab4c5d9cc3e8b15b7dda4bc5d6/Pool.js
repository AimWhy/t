var WorkerHandler = require('./WorkerHandler');
var environment = require('./environment');

function Pool(script, options = {}) {
    if (typeof script === 'string') {
        this.script = script || null
    } else {
        this.script = null;
        options = script
    }

    this.workers = [];
    this.tasks = [];
    this.maxQueueSize = options.maxQueueSize || Infinity;
    this.workerTerminateTimeout = options.workerTerminateTimeout || 1000;
    this.onCreateWorker = options.onCreateWorker || (() => null);
    this.onTerminateWorker = options.onTerminateWorker || (() => null);

    if (options && 'maxWorkers' in options) {
        validateMaxWorkers(options.maxWorkers);
        this.maxWorkers = options.maxWorkers
    } else {
        this.maxWorkers = Math.max((environment.cpus || 4) - 1, 1)
    }

    if (options && 'minWorkers' in options) {
        if (options.minWorkers === 'max') {
            this.minWorkers = this.maxWorkers
        } else {
            validateMinWorkers(options.minWorkers);
            this.minWorkers = options.minWorkers;
            this.maxWorkers = Math.max(this.minWorkers, this.maxWorkers)
        }
        this._ensureMinWorkers()
    }

    this._boundNext = this._next.bind(this);
}
Pool.prototype.exec = function (method, params, options) {
    if (params && !Array.isArray(params)) {
        throw new TypeError('Array expected as argument "params"');
    }
    if (typeof method === 'string') {
        var resolver = Promise.defer();
        if (this.tasks.length >= this.maxQueueSize) {
            throw new Error('Max queue size of ' + this.maxQueueSize + ' reached');
        }
        var tasks = this.tasks;
        var task = {
            method: method,
            params: params,
            resolver: resolver,
            timeout: null,
            options: options
        };
        tasks.push(task);
        var originalTimeout = resolver.promise.timeout;
        resolver.promise.timeout = function timeout(delay) {
            if (tasks.indexOf(task) !== -1) {
                task.timeout = delay;
                return resolver.promise
            } else {
                return originalTimeout.call(resolver.promise, delay)
            }
        };
        this._next();
        return resolver.promise
    } else if (typeof method === 'function') {
        return this.exec('run', [String(method), params])
    } else {
        throw new TypeError('Function or string expected as argument "method"');
    }
};
Pool.prototype.proxy = function () {
    if (arguments.length > 0) {
        throw new Error('No arguments expected');
    }
    var pool = this;
    return this.exec('methods').then(function (methods) {
        var proxy = {};
        methods.forEach(function (method) {
            proxy[method] = function () {
                return pool.exec(method, Array.prototype.slice.call(arguments))
            }
        });
        return proxy
    })
};
Pool.prototype._next = function () {
    if (this.tasks.length > 0) {
        var worker = this._getWorker();
        if (worker) {
            var me = this;
            var task = this.tasks.shift();
            if (task.resolver.promise.pending) {
                var promise = worker.exec(task.method, task.params, task.resolver, task.options).then(me._boundNext).catch(function () {
                    if (worker.terminated) {
                        return me._removeWorker(worker)
                    }
                }).then(function () {
                    me._next()
                });
                if (typeof task.timeout === 'number') {
                    promise.timeout(task.timeout)
                }
            } else {
                me._next()
            }
        }
    }
};
Pool.prototype._getWorker = function () {
    var workers = this.workers;
    for (var i = 0; i < workers.length; i++) {
        var worker = workers[i];
        if (worker.busy() === false) {
            return worker
        }
    }
    if (workers.length < this.maxWorkers) {
        worker = this._createWorkerHandler();
        workers.push(worker);
        return worker
    }
    return null
};
Pool.prototype._removeWorker = function (worker) {
    var me = this;
    DEBUG_PORT_ALLOCATOR.releasePort(worker.debugPort);
    this._removeWorkerFromList(worker);
    this._ensureMinWorkers();
    return new Promise(function (resolve, reject) {
        worker.terminate(false, function (err) {
            me.onTerminateWorker({
                script: worker.script
            });
            if (err) {
                reject(err)
            } else {
                resolve(worker)
            }
        })
    })
};
Pool.prototype._removeWorkerFromList = function (worker) {
    var index = this.workers.indexOf(worker);
    if (index !== -1) {
        this.workers.splice(index, 1)
    }
};
Pool.prototype.terminate = function (force, timeout) {
    var me = this;
    this.tasks.forEach(function (task) {
        task.resolver.reject(new Error('Pool terminated'))
    });
    this.tasks.length = 0;
    var f = function (worker) {
        DEBUG_PORT_ALLOCATOR.releasePort(worker.debugPort);
        this._removeWorkerFromList(worker)
    };
    var removeWorker = f.bind(this);
    var promises = [];
    var workers = this.workers.slice();
    workers.forEach(function (worker) {
        var termPromise = worker.terminateAndNotify(force, timeout).then(removeWorker).always(function () {
            me.onTerminateWorker({
                script: worker.script
            })
        });
        promises.push(termPromise)
    });
    return Promise.all(promises)
};
Pool.prototype.stats = function () {
    var totalWorkers = this.workers.length;
    var busyWorkers = this.workers.filter(function (worker) {
        return worker.busy()
    }).length;

    return {
        totalWorkers: totalWorkers,
        busyWorkers: busyWorkers,
        idleWorkers: totalWorkers - busyWorkers,
        pendingTasks: this.tasks.length,
        activeTasks: busyWorkers
    }
};
Pool.prototype._ensureMinWorkers = function () {
    if (this.minWorkers) {
        for (var i = this.workers.length; i < this.minWorkers; i++) {
            this.workers.push(this._createWorkerHandler())
        }
    }
};
Pool.prototype._createWorkerHandler = function () {
    const overridenParams = this.onCreateWorker({ script: this.script }) || {};

    return new WorkerHandler(overridenParams.script || this.script, {
        workerTerminateTimeout: this.workerTerminateTimeout,
    })
}

function validateMaxWorkers(maxWorkers) {
    if (!isNumber(maxWorkers) || !isInteger(maxWorkers) || maxWorkers < 1) {
        throw new TypeError('Option maxWorkers must be an integer number >= 1');
    }
}

function validateMinWorkers(minWorkers) {
    if (!isNumber(minWorkers) || !isInteger(minWorkers) || minWorkers < 0) {
        throw new TypeError('Option minWorkers must be an integer number >= 0');
    }
}

function isNumber(value) {
    return typeof value === 'number'
}

function isInteger(value) {
    return Math.round(value) == value
}
module.exports = Pool;