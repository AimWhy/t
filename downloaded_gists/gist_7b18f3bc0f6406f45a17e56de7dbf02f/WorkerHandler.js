function ensureWebWorker() {
    if (typeof Worker !== 'function' && (typeof Worker !== 'object' || typeof Worker.prototype.constructor !== 'function')) {
        throw new Error('WorkerPool: Web Workers not supported');
    }
}

function getDefaultWorker() {
    if (typeof Blob === 'undefined') {
        throw new Error('Blob not supported by the browser');
    }
    if (!window.URL || typeof window.URL.createObjectURL !== 'function') {
        throw new Error('URL.createObjectURL not supported by the browser');
    }
    var blob = new Blob([require('./generated/embeddedWorker')], {
        type: 'text/javascript'
    });

    return window.URL.createObjectURL(blob)
}

function setupWorker(script) {
    ensureWebWorker();
    return setupBrowserWorker(script, Worker)
}

function setupBrowserWorker(script, Worker) {
    var worker = new Worker(script);
    worker.on = function (event, callback) {
        this.addEventListener(event, function (message) {
            callback(message.data)
        })
    };
    worker.send = function (message, transfer) {
        this.postMessage(message, transfer)
    };
    return worker
}

function objectToError(obj) {
    var temp = new Error('')
    var props = Object.keys(obj)
    for (var i = 0; i < props.length; i++) {
        temp[props[i]] = obj[props[i]]
    }
    return temp
}

function WorkerHandler(script, _options) {
    var me = this;
    var options = _options || {};
    this.script = script || getDefaultWorker();
    this.worker = setupWorker(this.script, options);
    this.workerTerminateTimeout = options.workerTerminateTimeout;
    this.requestQueue = [];

    if (!script) {
        this.worker.ready = true
    }

    function onError(error) {
        me.terminated = true;
        for (var id in me.processing) {
            if (me.processing[id] !== void 0) {
                me.processing[id].resolver.reject(error)
            }
        }
        me.processing = Object.create(null)
    }

    function dispatchQueuedRequests() {
        for (const request of me.requestQueue.splice(0)) {
            me.worker.send(request.message, request.transfer)
        }
    }

    this.worker.on('message', function (response) {
        if (me.terminated) {
            return
        }
        if (response === 'ready') {
            me.worker.ready = true;
            dispatchQueuedRequests()
        } else {
            var id = response.id;
            var task = me.processing[id];
            if (task !== void 0) {
                if (response.isEvent) {
                    if (task.options && typeof task.options.on === 'function') {
                        task.options.on(response.payload)
                    }
                } else {
                    delete me.processing[id];
                    if (me.terminating === true) {
                        me.terminate()
                    }
                    if (response.error) {
                        task.resolver.reject(objectToError(response.error))
                    } else {
                        task.resolver.resolve(response.result)
                    }
                }
            }
        }
    });

    this.worker.on('error', onError);
    this.worker.on('exit', function (exitCode, signalCode) {
        var message = 'Workerpool Worker terminated Unexpectedly\n';
        message += '    workerpool.script: `' + me.script + '`\n';
        onError(new Error(message))
    });
    this.processing = Object.create(null);
    this.terminating = false;
    this.terminated = false;
    this.terminationHandler = null;
    this.lastId = 0
}
WorkerHandler.prototype.methods = function () {
    return this.exec('methods')
};
WorkerHandler.prototype.exec = function (method, params, resolver, options) {
    if (!resolver) {
        resolver = Promise.defer()
    }
    var id = ++this.lastId;
    this.processing[id] = {
        id: id,
        resolver: resolver,
        options: options
    };
    var request = {
        message: {
            id: id,
            method: method,
            params: params
        },
        transfer: options && options.transfer
    };
    if (this.terminated) {
        resolver.reject(new Error('Worker is terminated'))
    } else if (this.worker.ready) {
        this.worker.send(request.message, request.transfer)
    } else {
        this.requestQueue.push(request)
    }
    var me = this;
    return resolver.promise.catch(function (error) {
        if (error instanceof Promise.CancellationError || error instanceof Promise.TimeoutError) {
            delete me.processing[id];
            return me.terminateAndNotify(true).then(function () {
                throw error;
            }, function (err) {
                throw err;
            })
        } else {
            throw error;
        }
    })
};
WorkerHandler.prototype.busy = function () {
    return Object.keys(this.processing).length > 0
};
WorkerHandler.prototype.terminate = function (force, callback) {
    var me = this;
    if (force) {
        for (var id in this.processing) {
            if (this.processing[id] !== void 0) {
                this.processing[id].resolver.reject(new Error('Worker terminated'))
            }
        }
        this.processing = Object.create(null)
    }

    if (typeof callback === 'function') {
        this.terminationHandler = callback
    }

    if (this.busy()) {
        this.terminating = true
    } else {
        var cleanup = function (err) {
            me.terminated = true;
            me.cleaning = false;
            if (me.worker != null && me.worker.removeAllListeners) {
                me.worker.removeAllListeners('message')
            }
            me.worker = null;
            me.terminating = false;
            if (me.terminationHandler) {
                me.terminationHandler(err, me)
            } else if (err) {
                throw err;
            }
        }
        if (this.worker) {
            if (typeof this.worker.terminate === 'function') {
                this.worker.terminate();
            } else {
                throw new Error('Failed to terminate worker');
            }
        }
        cleanup()
    }
};

WorkerHandler.prototype.terminateAndNotify = function (force, timeout) {
    var resolver = Promise.defer();
    if (timeout) {
        resolver.promise.timeout = timeout
    }
    this.terminate(force, function (err, worker) {
        if (err) {
            resolver.reject(err)
        } else {
            resolver.resolve(worker)
        }
    });
    return resolver.promise
};

module.exports = WorkerHandler;
module.exports._setupBrowserWorker = setupBrowserWorker;