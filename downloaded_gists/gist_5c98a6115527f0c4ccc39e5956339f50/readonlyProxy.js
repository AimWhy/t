"use strict";
const readonlyProxy = (target) => {
  return isObject(target)
    ? new Proxy(target, {
        get: (target, property) => readonlyProxy(target[property]),
        set: (_target, property, _value) => {
          throw new Error(
            `TypeError: Cannot assign to read only property '${String(
              property
            )}' of object`
          );
        },
        deleteProperty: (_target, property) => {
          throw new Error(
            `TypeError: Cannot delete read only property '${String(
              property
            )}' of object`
          );
        },
        defineProperty: (_target, property) => {
          throw new Error(
            `TypeError: Cannot define property '${String(
              property
            )}' for a readonly object`
          );
        },
        setPrototypeOf: (_target) => {
          throw new Error(
            `TypeError: Cannot set prototype for a readonly object`
          );
        },
        isExtensible: () => false,
        preventExtensions: () => true,
      })
    : target;
};