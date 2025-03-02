export class MyObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.elements = [];
    MyObserver.notifySet.add(this.notify);
  }

  disconnect() {
    this.elements.length = 0;
    MyObserver.notifySet.delete(this.notify);
  }

  observe(element) {
    if (this.elements.includes(element)) {
      throw new Error('already observed');
    }
    this.elements.push(element);
  }

  unobserve(element) {
    if (!this.elements.includes(element)) {
      throw new Error('not observed: ' + element.id + ' on ' + this.options?.root?.id);
    }
    this.elements = this.elements.filter((item) => item !== element);
  }
  // 基于 options 做特定逻辑
  notify(entries) {
    if (!entries.some(({ target }) => this.elements.includes(target))) {
      throw new Error('unobserved target');
    }
    const { callback } = this;
    return Promise.resolve().then(() => {
      callback(entries, this);
    });
  }
}

MyObserver.notifySet = new Set();
MyObserver.notify = (entries) => {
  for (let item of MyObserver.notifySet.values()) {
    item(entries);
  }
};
