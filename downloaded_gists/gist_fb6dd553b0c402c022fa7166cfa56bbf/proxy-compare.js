const OWN_KEYS_SYMBOL = Symbol();
const TRACK_MEMO_SYMBOL = Symbol();
const GET_ORIGINAL_SYMBOL = Symbol();

const AFFECTED_PROPERTY = 'a';
const FROZEN_PROPERTY = 'f';
const PROXY_PROPERTY = 'p';
const PROXY_CACHE_PROPERTY = 'c';
const NEXT_OBJECT_PROPERTY = 'n';
const CHANGED_PROPERTY = 'g';

const getProto = Object.getPrototypeOf;
const objectsToTrack = new WeakMap();

const isObjectToTrack = (obj) => (obj && (objectsToTrack.has(obj) ? objectsToTrack.get(obj) : (getProto(obj) === Object.prototype || getProto(obj) === Array.prototype)));

const isObject = (x) => (typeof x === 'object' && x !== null);

const isFrozen = (obj) => (Object.isFrozen(obj) || (Object.values(Object.getOwnPropertyDescriptors(obj)).some((descriptor) => !descriptor.writable)));

const unfreeze = (obj) => {
    if (Array.isArray(obj)) {
        return Array.from(obj);
    }
    // For non-array objects, we create a new object keeping the prototype with changing all configurable options (otherwise, proxies will complain)
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    Object.values(descriptors).forEach((desc) => { desc.configurable = true; });
    return Object.create(getProto(obj), descriptors);
};

const createProxyHandler = (origObj, frozen) => {
    let trackObject = false;

    const recordUsage = (h, key) => {
        if (!trackObject) {
            let used = h[AFFECTED_PROPERTY].get(origObj);
            if (!used) {
                used = new Set();
                h[AFFECTED_PROPERTY].set(origObj, used);
            }
            used.add(key);
        }
    };

    const recordObjectAsUsed = (h) => {
        trackObject = true;
        h[AFFECTED_PROPERTY].delete(origObj);
    };

    const handler = {
        [FROZEN_PROPERTY]: frozen,
        get(target, key) {
            if (key === GET_ORIGINAL_SYMBOL) {
                return origObj;
            }
            recordUsage(this, key);
            return createDeepProxy(target[key], this[AFFECTED_PROPERTY], this[PROXY_CACHE_PROPERTY]);
        },
        has(target, key) {
            if (key === TRACK_MEMO_SYMBOL) {
                recordObjectAsUsed(this);
                return true;
            }
            recordUsage(this, key);
            return key in target;
        },
        ownKeys(target) {
            recordUsage(this, OWN_KEYS_SYMBOL);
            return Reflect.ownKeys(target);
        },
    };
    if (frozen) {
        handler.set = handler.deleteProperty = () => false;
    }
    return handler;
};

export const createDeepProxy = (obj, affected, proxyCache) => {
    if (!isObjectToTrack(obj)){
        return obj;
    }
        
    const origObj = obj[GET_ORIGINAL_SYMBOL]; // unwrap proxy
    const target = origObj || obj;
    const frozen = isFrozen(target);
    let proxyHandler = (proxyCache && proxyCache.get(target));

    if (!proxyHandler || proxyHandler[FROZEN_PROPERTY] !== frozen) {
        proxyHandler = createProxyHandler(target, frozen);
        proxyHandler[PROXY_PROPERTY] = new Proxy(frozen ? unfreeze(target) : target, proxyHandler);
        if (proxyCache) {
            proxyCache.set(target, proxyHandler);
        }
    }

    proxyHandler[AFFECTED_PROPERTY] = affected;
    proxyHandler[PROXY_CACHE_PROPERTY] = proxyCache;
    return proxyHandler[PROXY_PROPERTY];
};

const isOwnKeysChanged = (origObj, nextObj) => {
    const origKeys = Reflect.ownKeys(origObj);
    const nextKeys = Reflect.ownKeys(nextObj);
    return origKeys.length !== nextKeys.length || origKeys.some((k, i) => k !== nextKeys[i]);
};

const IN_DEEP_SHIFT = 2;

export const MODE_ASSUME_UNCHANGED_IF_UNAFFECTED = /* 未访问不比较 */ 0b00001;
export const MODE_IGNORE_REF_EQUALITY =            /* 跳过Ref比较 */ 0b00010;
export const MODE_ASSUME_UNCHANGED_IF_UNAFFECTED_IN_DEEP = (MODE_ASSUME_UNCHANGED_IF_UNAFFECTED << IN_DEEP_SHIFT);
export const MODE_IGNORE_REF_EQUALITY_IN_DEEP = (MODE_IGNORE_REF_EQUALITY << IN_DEEP_SHIFT);

export const isDeepChanged = (origObj, nextObj, affected, cache, mode = 0) => {
    if (Object.is(origObj, nextObj) && (!isObject(origObj) || (mode & MODE_IGNORE_REF_EQUALITY) === 0)) {
        return false;
    }

    if (!isObject(origObj) || !isObject(nextObj)){
        return true;
    }
        
    const used = affected.get(origObj);
    if (!used) {
        return (mode & MODE_ASSUME_UNCHANGED_IF_UNAFFECTED) === 0;
    }
        
    if (cache && (mode & MODE_IGNORE_REF_EQUALITY) === 0) {
        const hit = cache.get(origObj);
        if (hit && hit[NEXT_OBJECT_PROPERTY] === nextObj) {
            return hit[CHANGED_PROPERTY];
        }

        // for object with cycles
        cache.set(origObj, {
            [NEXT_OBJECT_PROPERTY]: nextObj,
            [CHANGED_PROPERTY]: false,
        });
    }

    let changed = null;

    for (const key of used) {
        const c = key === OWN_KEYS_SYMBOL ? isOwnKeysChanged(origObj, nextObj)
            : isDeepChanged(origObj[key], nextObj[key], affected, cache, ((mode >>> IN_DEEP_SHIFT) << IN_DEEP_SHIFT) | (mode >>> IN_DEEP_SHIFT));
        
        if (c === true || c === false) {
            changed = c;
        }
            
        if (changed) {
            break;
        }   
    }

    if (changed === null) {
        changed = (mode & MODE_ASSUME_UNCHANGED_IF_UNAFFECTED) === 0;
    }
        
    if (cache && (mode & MODE_IGNORE_REF_EQUALITY) === 0) {
        cache.set(origObj, {
            [NEXT_OBJECT_PROPERTY]: nextObj,
            [CHANGED_PROPERTY]: changed,
        });
    }

    return changed;
};

export const trackMemo = (obj) => {
    return isObjectToTrack(obj) ? (TRACK_MEMO_SYMBOL in obj) : false;
};

export const getUntrackedObject = (obj) => {
    if (isObjectToTrack(obj)) {
        return obj[GET_ORIGINAL_SYMBOL] || null;
    }
    return null;
};

export const markToTrack = (obj, mark = true) => {
    objectsToTrack.set(obj, mark);
};

export const affectedToPathList = (obj, affected) => {
    const list = [];

    const walk = (x, path = null) => {
        const used = affected.get(x);
        if (used) {
            used.forEach((key) => walk(x[key], path ? [...path, key] : [key]));
        } else if (path) {
            list.push(path);
        }
    };

    walk(obj);

    return list;
};