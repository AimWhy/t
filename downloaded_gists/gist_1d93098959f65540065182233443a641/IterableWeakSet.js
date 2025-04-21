module.exports = class IterableWeakSet {
  constructor() {
    this._refSet = new Set();
    this._refMap = new WeakMap();
    this._finalizationRegistry = new FinalizationRegistry(({ ref, set }) => set.delete(ref));
  }

  add(value) {
    if (!this._refMap.has(value)) {
      const ref = new WeakRef(value);
      this._refMap.set(value, ref);
      this._refSet.add(ref);
      this._finalizationRegistry.register(value, { ref, set: this._refSet }, ref);
    }

    return this;
  }

  delete(value) {
    const ref = this._refMap.get(value);
    if (!ref) {
      return false;
    }

    this._refMap.delete(value);
    this._refSet.delete(ref);
    this._finalizationRegistry.unregister(ref);
    return true;
  }

  has(value) {
    return this._refMap.has(value);
  }

  *[Symbol.iterator]() {
    for (const ref of this._refSet) {
      const value = ref.deref();
      if (value === void 0) {
        continue;
      }
      yield value;
    }
  }
};

// Fixed version that doesn't leak memory.
function makeWeakCached(f) {
  const cache = new Map();
  const cleanup = new FinalizationRegistry(key => {
    // See note below on concurrency considerations.
    const ref = cache.get(key);
    if (ref && !ref.deref()) cache.delete(key);
  });

  return key => {
    const ref = cache.get(key);
    if (ref) {
      const cached = ref.deref();
      // See note below on concurrency considerations.
      if (cached !== undefined) return cached;
    }

    const fresh = f(key);
    cache.set(key, new WeakRef(fresh));
    cleanup.register(fresh, key);
    return fresh;
  };
}

var getImageCached = makeWeakCached(getImage);
