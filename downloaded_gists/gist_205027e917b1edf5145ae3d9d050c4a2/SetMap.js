export class SetMap {
  constructor() {
    this.map = new Map();
  }

  add(key, value) {
    let values = this.map.get(key);
    if (!values) {
      values = new Set();
      this.map.set(key, values);
    }
    values.add(value);
  }

  delete(key, value) {
    const values = this.map.get(key);
    if (!values) {
      return;
    }
    values.delete(value);
    if (values.size === 0) {
      this.map.delete(key);
    }
  }

  forEach(key, fn) {
    const values = this.map.get(key);
    if (!values) {
      return;
    }
    values.forEach(fn);
  }

  get(key) {
    const values = this.map.get(key);
    if (!values) {
      return new Set();
    }
    return values;
  }
}
