/* eslint-disable no-underscore-dangle */

export function noop() {}

export class DataWalker {
  constructor(beforeVisit = noop, afterVisit = noop) {
    this.pathStack = [];
    this.parentStack = [];
    this.SkipSubtree = {};

    this._beforeVisit = function _beforeVisit(node, prop) {
      this.pathStack.push(prop);
      this.parentStack.push(node);
      return beforeVisit(node, prop, this);
    };

    this._afterVisit = function _afterVisit(node, prop) {
      afterVisit(node, prop, this);
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
    return this.parentStack.slice(0, -1).reverse();
  }

  get path() {
    return this.pathStack.join('.');
  }

  walk(root) {
    this._innerWalk(root, '');
  }

  _innerWalk(node, prop) {
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

  $(key, def, obj = this.root) {
    const keys = key.split ? key.split('.') : key;
    let pos = 0;
    let context = obj;

    for (; pos < keys.length && context; pos++) {
      context = context[keys[pos]];
    }

    return pos === keys.length ? context : def;
  }
}

DataWalker._walkOrder = node => {
  if (Array.isArray(node)) {
    let len = node.length;
    const result = new Array(len);

    while (len > 0) {
      len -= 1;
      result[len] = len;
    }
    return result;
  }

  if (node && typeof node === 'object') {
    return Object.keys(node);
  }

  return null;
};

export function getAllKey(fromData) {
  const result = [];

  new DataWalker((node, prop, _) => {
    if (prop !== '') {
      result.push(_.path);
    }
  }).walk(fromData);

  return result;
}

/**
 * It walks the fromData object, and for each property it finds, it looks up the corresponding rule in the ruleMap, and applies it
 * @param ruleMap - { toData: {}, visitor: (node, prop, _) => { // change this.toData } }
 * @param fromData - The data you want to convert.
 * @returns The ruleMap.toData
 * !important： ruleMap.visitor 不能是箭头函数
 */

export function convert(fromData, ruleMap) {
  new DataWalker(ruleMap.visitor.bind(ruleMap)).walk(fromData);
  return ruleMap.toData;
}

export function convertToMapData(arrayData, itemKeyProp) {
  const result = { keyList: [], valueMap: {} };

  new DataWalker((node, prop, _) => {
    if (typeof prop === 'number') {
      const itemKeyValue = _.$(itemKeyProp, '', node);
      result.keyList.push(itemKeyValue);
      result.valueMap[itemKeyValue] = node;
      return _.SkipSubtree;
    }
  }).walk(arrayData);

  return result;
}
