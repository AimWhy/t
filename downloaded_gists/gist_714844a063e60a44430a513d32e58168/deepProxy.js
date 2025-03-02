const isObject = v => v && typeof v === 'object';

const proxyHandler = {
  apply: function (target, thisArg, argumentsList) {
    return Reflect.apply(target, thisArg, argumentsList);
  },
  construct: function (target, argumentsList, newTarget) {
    return Reflect.construct(target, argumentsList, newTarget);
  },
  defineProperty: function (target, property, descriptor) {
    return Reflect.defineProperty(target, property, descriptor);
  },
  deleteProperty: function (target, property) {
    return Reflect.deleteProperty(target, property);
  },
  get: function (target, property, receiver) {
    if (property === '$') {
      return target;
    }
    const result = Reflect.get(target, property, receiver);
    return isObject(result) ? deepProxy(result) : result;
  },
  getOwnPropertyDescriptor: function (target, property) {
    return Reflect.getOwnPropertyDescriptor(target, property);
  },
  getPrototypeOf(target) {
    return Reflect.getPrototypeOf(target);
  },
  has: function (target, property) {
    return Reflect.has(target, property);
  },
  isExtensible: function (target) {
    return Reflect.isExtensible(target);
  },
  ownKeys: function (target) {
    return Reflect.ownKeys(target);
  },
  preventExtensions: function (target) {
    return Reflect.preventExtensions(target);
  },
  set: function (target, property, value, receiver) {
    return Reflect.set(target, property, value, receiver);
  },
  setPrototypeOf: function (target, prototype) {
    return Reflect.setPrototypeOf(target, prototype);
  }
};

export function deepProxy(obj) {
  return new Proxy(obj, proxyHandler);
}
