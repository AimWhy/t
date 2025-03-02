export default class Promise {
    _onSuccess = [];
    _onFail = [];
    state = 'pending';

    constructor(handler) {
        handler(result => this._resolve(result), error => this._reject(error));
    }

    _process(onSuccess, onFail) {
        this._onSuccess.push(onSuccess);
        this._onFail.push(onFail);
    }

    _resolve(result) {
        this.state = 'resolved';
        this._onSuccess.forEach(fn => fn(result));
        this._process = (onSuccess, onFail) => onSuccess(result);
    };

    _reject(error) {
        this.state = 'rejected';
        this._onFail.forEach(fn => fn(error));
        this._process = (onSuccess, onFail) => onFail(error);
    };

    _then(callback, resolve, reject) {
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

    then(onSuccess, onFail) {
        return new Promise((resolve, reject) => {
            let s = onSuccess ? this._then(onSuccess, resolve, reject) : resolve;
            let f = onFail    ? this._then(onFail,    resolve, reject) : reject;
            this._process(s, f);
        });
    };
}