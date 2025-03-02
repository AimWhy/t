export class KeepLast {
  _pid: number;
  _id: number;
  constructor() {
    this._pid = 0;
    this._id = 0;
  }
  reset() {
    this._pid++;
  }
  add(promise) {
    this._id++;
    const currentId = this._id;
    const parentId = this._pid;
    return new Promise((resolve, reject) => {
      promise
        .then((value) => {
          if (this._pid === parentId && this._id === currentId) {
            resolve(value);
          } else {
            reject(-1);
          }
        })
        .catch((reason) => {
          if (this._pid === parentId && this._id === currentId) {
            reject(reason);
          } else {
            reject(-1);
          }
        });
    });
  }
}

let _concurrency = new KeepLast();
let _loadPromise = _concurrency
  .add(this._load())
  .catch((e) => {
    this._isValid = false;
    this._loadErrorMessage = e instanceof RPCError ? e.data.message : e.message;
  })
  .finally(() => {
    this._lastUpdate = Date.now();
    this._isFullyLoaded = true;
  });


/********************************/

export class Mutex {
  constructor() {
    this._lock = Promise.resolve();
    this._queueSize = 0;
    this._unlockedProm = void 0;
    this._unlock = void 0;
  }

  async exec(action) {
    this._queueSize++;

    if (!this._unlockedProm) {
      this._unlockedProm = new Promise((resolve) => {
        this._unlock = () => {
          resolve();
          this._unlockedProm = void 0;
        };
      });
    }

    const always = () => {
      return new Promise((r) => r(action())).finally(() => {
        if (--this._queueSize === 0) {
          this._unlock();
        }
      });
    };
    this._lock = this._lock.then(always, always);
    return this._lock;
  }

  getUnlockedDef() {
    return this._unlockedProm || Promise.resolve();
  }
}


 /*
 *      this.mutex = new Mutex();
 *
 * and if we wrap the calls to _load in a mutex::
 *
 *      return this.mutex.exec(function() {
 *          return this._load().then(function (result) {
 *              this.state = result;
 *          });
 *      });
 */