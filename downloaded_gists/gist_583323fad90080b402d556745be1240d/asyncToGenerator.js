const internal = {
    abortTime: 0,
    startTime: 0,
    finishTime: 0,

    aborted: false,
    errorHandler: null,

    get running() {
        return internal.startTime > internal.finishTime;
    },
    get aborting() {
        return !internal.aborted && (internal.abortTime > internal.startTime);
    }
}

function start() {
    if (internal.running) {
        return Promise.reject(new Error("Already Started"));
    }

    internal.startTime = Date.now();
    internal.aborted = false;
    return Promise.resolve();
}

function finish() {
    internal.finishTime = Date.now();
    return Promise.resolve();
}

function abort() {
    internal.abortTime = Date.now();
    return Promise.resolve();
}

function pass() {
    if (aborting) {
        aborted = true;
        finish();
        return Promise.reject(new Error("Abort"));
    }

    return new Promise(function (resolve) {
        setTimeout(resolve);
    });
}

function asyncToGenerator(fn) {
    return _asyncToGenerator(function* () {
        try {
            yield start();
            yield* fn();
            yield finish();
        } catch (err) {
            finish();
            const _errorHandler = internal.errorHandler ?? defaultErrorHandler;
            _errorHandler(err);
        }
    });
}

function _asyncToGenerator(fn) {
    return function (...args) {
        const self = this;

        return new Promise(function (resolve, reject) {
            const gen = fn.apply(self, args)
            const _next = (value) => {
                _asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value)
            }
            const _throw = (err) => {
                _asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err)
            }
            _next(void 0)
        })
    }
}

function _asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    let value;
    try {
        const info = gen[key](arg)
        value = info.value
    } catch (error) {
        reject(error)
        return
    }

    if (info.done) {
        resolve(value)
    } else {
        Promise.resolve(value).then(_next, _throw)
    }
}