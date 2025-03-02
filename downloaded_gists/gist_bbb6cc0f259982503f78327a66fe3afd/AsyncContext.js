export class FrozenRevert {
  #mapping;
  constructor(mapping) {
    this.#mapping = mapping;
  }
  restore() {
    return this.#mapping;
  }
}

export class Revert {
  #key;
  #has;
  #prev;
  constructor(mapping, key) {
    this.#key = key;
    this.#has = mapping.has(key);
    this.#prev = mapping.get(key);
  }
  restore(current) {
    if (this.#has) {
      return current.set(this.#key, this.#prev);
    } else {
      return current.delete(this.#key);
    }
  }
}

export class Mapping {
  #data;
  #frozen;
  constructor(data) {
    this.#data = data;
    this.#frozen = data === null;
  }
  has(key) {
    return this.#data?.has(key) || false;
  }
  get(key) {
    return this.#data?.get(key);
  }
  set(key, value) {
    const mapping = this.#fork();
    mapping.#data.set(key, value);
    return mapping;
  }
  delete(key) {
    const mapping = this.#fork();
    mapping.#data.delete(key);
    return mapping;
  }
  freeze() {
    this.#frozen = true;
  }
  isFrozen() {
    return this.#frozen;
  }
  #fork() {
    if (this.#frozen) {
      return new Mapping(new Map(this.#data));
    }
    return this;
  }
}

export class Storage {
  static #current = new Mapping(null);

  static get(key) {
    return this.#current.get(key);
  }

  static set(key, value) {
    const undo = this.#current.isFrozen()
      ? new FrozenRevert(this.#current)
      : new Revert(this.#current, key);
    this.#current = this.#current.set(key, value);
    return undo;
  }

  static restore(revert) {
    this.#current = revert.restore(this.#current);
  }

  static snapshot() {
    this.#current.freeze();
    return new FrozenRevert(this.#current);
  }

  static switch(snapshot) {
    const previous = this.#current;
    this.#current = snapshot.restore(previous);
    return new FrozenRevert(previous);
  }
}

export class AsyncContext {
  static wrap(fn) {
    const snapshot = Storage.snapshot();
    function wrap(...args) {
      const head = Storage.switch(snapshot);
      try {
        return fn.apply(this, args);
      } finally {
        Storage.restore(head);
      }
    }
    return wrap;
  }
  run(value, fn, ...args) {
    const revert = Storage.set(this, value);
    try {
      return fn(...args);
    } finally {
      Storage.restore(revert);
    }
  }
  get() {
    return Storage.get(this);
  }
}
