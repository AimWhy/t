if (typeof self == void 0 || typeof postMessage !== 'function' || typeof addEventListener !== 'function') {
    throw new Error('Script must be executed as a worker');
}

function isPromise(value) {
    return value && (typeof value.then === 'function') && (typeof value.catch === 'function');
}

function convertError(error) {
    return Object.getOwnPropertyNames(error).reduce(function (product, name) {
        return Object.defineProperty(product, name, {
            value: error[name],
            enumerable: true
        });
    }, {});
}

var Transfer = require('./transfer');

var TERMINATE_METHOD_ID = '__workerpool-terminate__';

var currentRequestId = null;

var worker = {
    terminationHandler: void 0,
    methods: {
        run: function run(fn, args) {
            var f = new Function('return (' + fn + ').apply(null, arguments);');
            return f.apply(f, args);
        },
        methods: function methods() {
            return Object.keys(worker.methods);
        }
    },
    on: function on(event, callback) {
        addEventListener(event, function (message) {
            callback(message.data);
        })
    },
    send: function send(message) {
        postMessage(message);
    },
    exit: function () { },
    cleanupAndExit: function cleanupAndExit(code) {
        var _exit = function () {
            worker.exit(code);
        }

        if (!worker.terminationHandler) {
            return _exit();
        }

        var result = worker.terminationHandler(code);

        if (isPromise(result)) {
            result.then(_exit, _exit);
        } else {
            _exit();
        }
    },
    register: function register(methods, options) {
        if (methods) {
            for (var name in methods) {
                if (methods.hasOwnProperty(name)) {
                    worker.methods[name] = methods[name];
                }
            }
        }
        if (options) {
            worker.terminationHandler = options.onTerminate;
        }

        worker.send('ready');
    },
    emit: function emit(payload) {
        if (currentRequestId) {
            worker.send({
                id: currentRequestId,
                isEvent: true,
                payload: payload instanceof Transfer ? payload.message : payload
            }, payload instanceof Transfer ? payload.transfer : void 0);
        }
    }
};

worker.on('message', function (request) {
    if (request === TERMINATE_METHOD_ID) {
        return worker.cleanupAndExit(0);
    }

    try {
        var method = worker.methods[request.method];

        if (method) {
            currentRequestId = request.id;

            var result = method.apply(method, request.params);

            if (isPromise(result)) {
                result.then(function (result) {
                    worker.send({
                        id: request.id,
                        result: result instanceof Transfer ? result.message : result,
                        error: null
                    }, result instanceof Transfer ? result.transfer : void 0);

                    currentRequestId = null;
                }).catch(function (err) {
                    worker.send({
                        id: request.id,
                        result: null,
                        error: convertError(err)
                    });
                    currentRequestId = null;
                });
            } else {
                worker.send({
                    id: request.id,
                    result: result instanceof Transfer ? result.message : result,
                    error: null
                }, result instanceof Transfer ? result.transfer : void 0);

                currentRequestId = null;
            }
        } else {
            throw new Error('Unknown method "' + request.method + '"');
        }
    } catch (err) {
        worker.send({
            id: request.id,
            result: null,
            error: convertError(err)
        });
    }
});