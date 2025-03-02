export class MapWithExpiration extends Map {
  constructor(expiryMs) {
    super();
    this.expiryMs = expiryMs;
    this.lastRefreshedTimes = new Map();
  }
  refresh(key) {
    this.lastRefreshedTimes.set(key, new Date().valueOf());
  }
  checkExpiry(key, cleanUp = false) {
    const refreshTime = this.lastRefreshedTimes.get(key);
    if (refreshTime === void 0) {
      return void 0;
    }
    const expired = new Date().valueOf() - refreshTime >= this.expiryMs;
    if (expired && cleanUp) {
      this.delete(key);
    }
    return expired;
  }
  clearExpiredEntries() {
    this.forEach(() => {});
  }
  get size() {
    this.clearExpiredEntries();
    return super.size;
  }
  has(key) {
    this.checkExpiry(key, true);
    return super.has(key);
  }
  get(key) {
    this.checkExpiry(key, true);
    return super.get(key);
  }
  set(key, value) {
    this.refresh(key);
    return super.set(key, value);
  }
  delete(key) {
    this.lastRefreshedTimes.delete(key);
    return super.delete(key);
  }
  clear() {
    this.lastRefreshedTimes.clear();
    super.clear();
  }
  forEach(callbackfn, thisArg) {
    const expiredKeys = [];
    super.forEach((v, k, m) => {
      if (this.checkExpiry(k) === true) {
        expiredKeys.push(k);
      } else {
        callbackfn.bind(thisArg)(v, k, m);
      }
    });
    expiredKeys.forEach((key) => {
      this.delete(key);
    });
  }
  entries() {
    this.clearExpiredEntries();
    return super.entries();
  }
  keys() {
    this.clearExpiredEntries();
    return super.keys();
  }
  values() {
    this.clearExpiredEntries();
    return super.values();
  }
  [Symbol.iterator]() {
    this.clearExpiredEntries();
    return super[Symbol.iterator]();
  }
  valueOf() {
    this.clearExpiredEntries();
    return super.valueOf();
  }
}
