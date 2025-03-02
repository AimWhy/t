"use strict";

// An iterable WeakSet implementation inspired by the iterable WeakMap example code in the WeakRefs specification:
// https://github.com/tc39/proposal-weakrefs#iterable-weakmaps
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

  * [Symbol.iterator]() {
    for (const ref of this._refSet) {
      const value = ref.deref();
      if (value === undefined) {
        continue;
      }
      yield value;
    }
  }
};

/************************/
function cleanup({ set, ref }) {
  set.delete(ref);
}

export class IterableWeakMap {
  #weakMap = new WeakMap();
  #refSet = new Set();
  #finalizationGroup = new FinalizationRegistry(cleanup);

  set(key, value) {
    const entry = this.#weakMap.get(key);
    if (entry) {
      // If there's already an entry for the object represented by "key",
      // the value can be updated without creating a new WeakRef:
      this.#weakMap.set(key, { value, ref: entry.ref });
    } else {
      const ref = new WeakRef(key);
      this.#weakMap.set(key, { value, ref });
      this.#refSet.add(ref);
      this.#finalizationGroup.register(key, {
        set: this.#refSet,
        ref,
      }, ref);
    }
  }

  get(key) {
    return this.#weakMap.get(key)?.value;
  }

  has(key) {
    return this.#weakMap.has(key);
  }

  delete(key) {
    const entry = this.#weakMap.get(key);
    if (!entry) {
      return false;
    }
    this.#weakMap.delete(key);
    this.#refSet.delete(entry.ref);
    this.#finalizationGroup.unregister(entry.ref);
    return true;
  }

  [SymbolIterator]() {
    const iterator = this.#refSet[SymbolIterator]();

    const next = () => {
      const result = iterator.next();
      if (result.done) {
        return result;
      }
      const key = result.value.deref();
      if (key == null) {
        return next();
      }
      const { value } = this.#weakMap.get(key);
      return { done: false, value };
    };

    return {
      [SymbolIterator]() { return this; },
      next,
    };
  }
}