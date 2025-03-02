export const isObject = (v) => v && typeof v === 'object';
export const createNode = (key) => ({ key, next: null });

const shadowAssign = (obj, { key, next }) => {
  const targe = obj[key]
  if (isObject(targe)) {
    obj[key] = Array.isArray(targe) ? targe.slice() : Object.assign({}, targe);
    if (next) {
      for (const n of Object.values(next)) {
        shadowAssign(obj[key], n)
      }
    }
  }
}

export const produce = (baseState, reducer) => {
  let rootNode;
  const addModifyPath = (path = '') => {
    rootNode = rootNode || createNode('');
    const keyArr = path.split('.');
    let curNode = rootNode;

    for (let i = 1; i < keyArr.length; i++) {
      const key = keyArr[i]
      const childMap = curNode.next = curNode.next || Object.create(null);
      const childNode = childMap[key] = childMap[key] || createNode(key);
      curNode = childNode;
    }
  }
  const _Metadata_ = new WeakMap();
  const proxyHandler = {
    deleteProperty: function (target, property) {
      addModifyPath(_Metadata_.get(target));
      return Reflect.deleteProperty(target, property);
    },
    get: function (target, property, receiver) {
      if (property === '$') {
        return target;
      }
      if (!_Metadata_.has(target)) {
        _Metadata_.set(target, '');
      }
      const result = Reflect.get(target, property, receiver);
      if (isObject(result)) {
        _Metadata_.set(result, _Metadata_.get(target) + '.' + property);
        return deepProxy(result);
      }
      return result;
    },
    has: (target, property) => Reflect.has(target, property),
    ownKeys: (target) => Reflect.ownKeys(target),
    set: function (target, property, value, receiver) {
      const path = _Metadata_.get(target) + (isObject(value) ? '.' + property : '');
      addModifyPath(path);
      return Reflect.set(target, property, value, receiver);
    },
  };
  const deepProxy = (obj) => new Proxy(obj, proxyHandler);
  const draft = deepProxy(baseState);

  reducer(draft);

  const result = { '': baseState };
  rootNode && shadowAssign(result, rootNode);
  return result[''];
};