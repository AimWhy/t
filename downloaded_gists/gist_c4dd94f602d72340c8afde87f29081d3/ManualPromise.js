function toRegExp(str) {
  return new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\w+/g, '\\w+'));
}
function toRegExp2(str) {
  return new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

x = toRegExp('[abc]')
y = toRegExp2('[abc]')
x.toString()
y.toString()

/****************************************/

export class ManualPromise extends Promise {
    constructor() {
        let resolve;
        let reject;
        super((f, r) => {
            resolve = f;
            reject = r;
        });
        this._isDone = false;
        this._resolve = resolve;
        this._reject = reject;
    }
    isDone() {
        return this._isDone;
    }
    resolve(t) {
        this._isDone = true;
        this._resolve(t);
    }
    reject(e) {
        this._isDone = true;
        this._reject(e);
    }
    static get [Symbol.species]() {
        return Promise;
    }
    get [Symbol.toStringTag]() {
        return 'ManualPromise';
    }
}

/*************************************/

export class NewPromise extends Promise {
  constructor (executor, timeout = 120000) {
    let timeoutId

    super((resolve, reject) => {
      const wrappedResolve = (value) => {
        clearTimeout(timeoutId)
        resolve(value)
      }

      const wrappedReject = (reason) => {
        clearTimeout(timeoutId)
        reject(reason)
      }

      timeoutId = setTimeout(() => {
        wrappedReject(new Error('Promise timed out'))
      }, timeout)

      executor(wrappedResolve, wrappedReject)
    })
  }
}