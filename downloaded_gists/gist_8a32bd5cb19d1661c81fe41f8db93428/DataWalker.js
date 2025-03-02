const noop = function () { };
class DataWalker {
  constructor(beforeVisit = noop, afterVisit = noop) {
    this.pathStack = [];
    this.parentStack = [];
    this.SkipSubtree = {};

    this._beforeVisit = function (node, prop) {
      this.pathStack.push(prop);
      this.parentStack.push(node);
      return beforeVisit.call(this, node, prop, this.SkipSubtree);
    };

    this._afterVisit = function (node, prop) {
      afterVisit.call(this, node, prop);
      this.parentStack.pop();

      if (this.pathStack.pop() !== prop) {
        throw new Error('退出匹配不成功！');
      }
    };
  }

  get root() {
    return this.parentStack[0];
  }

  get parent() {
    return this.parentStack[Math.max(this.parentStack.length - 2, 0)];
  }

  get parents() {
    return this.parentStack.slice(0, -1);
  }

  get path() {
    return this.pathStack.join('.');
  }

  walk(root) {
    this._innerWalk(root, '');
  }

  _innerWalk(node, prop) {
    if (!node) {
      return;
    }

    if (this._beforeVisit(node, prop) === this.SkipSubtree) {
      return this._afterVisit(node, prop);
    }

    const walkOrder = DataWalker._walkOrder(node);

    if (!walkOrder) {
      return this._afterVisit(node, prop);
    }

    for (let i = 0; i < walkOrder.length; ++i) {
      const entityProp = walkOrder[i];
      const entity = node[entityProp];

      this._innerWalk(entity, entityProp);
    }

    this._afterVisit(node, prop);
  }
}

DataWalker._walkOrder = (node) => {
  if (Array.isArray(node)) {
    let len = node.length;
    let result = new Array(len);

    while (len-- > 0) {
      result[len] = len;
    }
    return result;
  }

  if (node && typeof node === 'object') {
    return Object.keys(node);
  }

  return null;
};

export default DataWalker;
