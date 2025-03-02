"use strict";
const proxyMap = new WeakMap();
// k:v 代理过的对象:原对象
const rawMap = new WeakMap();

function isObject(val) {
    return typeof val === 'object' && val !== null;
}

export function observer(initialVal, cb) {
    const existingProxy = proxyMap.get(initialVal);
  
    // 添加缓存 防止重新构建proxy
    if (existingProxy) {
        return existingProxy;
    }
  
    // 防止代理已经代理过的对象 https://github.com/alibaba/hooks/issues/839
    if (rawMap.has(initialVal)) {
        return initialVal;
    }
  
    const proxy = new Proxy(initialVal, {
        get(target, key, receiver) {
            const res = Reflect.get(target, key, receiver);
            return isObject(res) ? observer(res, cb) : Reflect.get(target, key);
        },
        set(target, key, val) {
            const ret = Reflect.set(target, key, val);
            cb();
            return ret;
        },
        deleteProperty(target, key) {
            const ret = Reflect.deleteProperty(target, key);
            cb();
            return ret;
        },
    });
  
    proxyMap.set(initialVal, proxy);
    rawMap.set(proxy, initialVal);
  
    return proxy;
}
