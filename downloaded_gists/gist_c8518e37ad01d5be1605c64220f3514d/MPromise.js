function Promise(handler, parent) {
    let me = this;
    let _onSuccess = [];
    let _onFail = [];

    this.resolved = false;
    this.rejected = false;
    this.pending = true;

    let _process = function (onSuccess, onFail) {
        _onSuccess.push(onSuccess);
        _onFail.push(onFail);
    };

    this.then = function (onSuccess, onFail) {
        return new Promise(function (resolve, reject) {
            let s = onSuccess ? _then(onSuccess, resolve, reject) : resolve;
            let f = onFail    ? _then(onFail,    resolve, reject) : reject;
            _process(s, f);
        }, me);
    };

    let _resolve = function (result) {
        me.resolved = true;
        me.rejected = false;
        me.pending = false;

        _onSuccess.forEach(function (fn) {
            fn(result);
        });

        _process = function (onSuccess, onFail) {
            onSuccess(result);
        };

        _resolve = _reject = function () { };
    };

    let _reject = function (error) {
        me.resolved = false;
        me.rejected = true;
        me.pending = false;

        _onFail.forEach(function (fn) {
            fn(error);
        });

        _process = function (onSuccess, onFail) {
            onFail(error);
        };
    
        _resolve = _reject = function () { }
    };

    this.cancel = function () {
        if (parent) {
            parent.cancel();
        } else {
            _reject(new CancellationError());
        }

        return me;
    };

    this.timeout = function (delay) {
        if (parent) {
            parent.timeout(delay);
        } else {
            let timer = setTimeout(function () {
                _reject(new TimeoutError('Promise timed out after ' + delay + ' ms'));
            }, delay);

            me.always(() => clearTimeout(timer));
        }

        return me;
    };

    handler(result => _resolve(result), error => _reject(error));
}


function _then(callback, resolve, reject) {
    return function (result) {
        try {
            let res = callback(result);
            if (res && typeof res.then === 'function') {
                res.then(resolve, reject);
            } else {
                resolve(res);
            }
        } catch (error) {
            reject(error);
        }
    }
}

Promise.prototype.catch = function (onFail) {
    return this.then(null, onFail);
};

Promise.prototype.always = function (fn) {
    return this.then(fn, fn);
};

Promise.all = function (promises){
    return new Promise(function (resolve, reject) {
        let remaining = promises.length;
        let results = [];

        if (remaining) {
            promises.forEach(function (p, i) {
                p.then(function (result) {
                    results[i] = result;
                    remaining--;
                    if (remaining == 0) {
                        resolve(results);
                    }
                }, function (error) {
                    remaining = 0;
                    reject(error);
                });
            });
        } else {
            resolve(results);
        }
    });
};

Promise.defer = function () {
    let resolver = {};

    resolver.promise = new Promise(function (resolve, reject) {
        resolver.resolve = resolve;
        resolver.reject = reject;
    });

    return resolver;
};

function CancellationError(message) {
    this.message = message || 'promise cancelled';
    this.stack = (new Error()).stack;
}
CancellationError.prototype = new Error();
CancellationError.prototype.constructor = Error;
CancellationError.prototype.name = 'CancellationError';

Promise.CancellationError = CancellationError;

function TimeoutError(message) {
    this.message = message || 'timeout exceeded';
    this.stack = (new Error()).stack;
}
TimeoutError.prototype = new Error();
TimeoutError.prototype.constructor = Error;
TimeoutError.prototype.name = 'TimeoutError';

Promise.TimeoutError = TimeoutError;

export default Promise;