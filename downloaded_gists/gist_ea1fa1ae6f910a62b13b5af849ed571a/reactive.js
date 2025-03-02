(function (exports) {
    'use strict';
    const isMap = (val) => val && val instanceof Map;
    const isSet = (val) => val && val instanceof Set;
    const isWeakMap = (val) => val && val instanceof WeakMap;
    const isWeakSet = (val) => val && val instanceof WeakSet;
    const isFn = (val) => typeof val === 'function';
    const isArr = Array.isArray;
    const isPlainObj = (val) => Object.prototype.toString.call(val) === '[object Object]';
    const isValid = (val) => val !== null && val !== undefined;
    const isCollectionType = (target) => (isMap(target) || isWeakMap(target) || isSet(target) || isWeakSet(target));
    const isNormalType = (target) => (isPlainObj(target) || isArr(target));

    const ProxyRaw = new WeakMap();
    const RawProxy = new WeakMap();
    const RawShallowProxy = new WeakMap();
    const RawNode = new WeakMap();
    const RawReactionsMap = new WeakMap();
    const ReactionStack = [];
    const BatchCount = { value: 0 };
    const UntrackCount = { value: 0 };
    const BatchScope = { value: false };
    const PendingReactions = new Set();
    const PendingScopeReactions = new Set();
    const ITERATION_KEY = Symbol('iteration key');

    const MakeObservableSymbol = Symbol('MakeObservableSymbol');
    const isAnnotation = (target) => {
        return target && !!target[MakeObservableSymbol];
    };

    const ObserverListeners = new Set();
    const notifyObservers = (operation) => {
        ObserverListeners.forEach((fn) => fn(operation));
    };

    const addReactionsToTargetKeyMap = (target, key, reaction) => {
        const reactionsMap = RawReactionsMap.get(target);
        if (reactionsMap) {
            const reactions = reactionsMap.get(key);
            if (reactions) {
                reactions.add(reaction);
            } else {
                reactionsMap.set(key, new Set([reaction]));
            }
            return reactionsMap;
        } else {
            const reactionsMap = new Map([[key, new Set([reaction])]]);
            RawReactionsMap.set(target, reactionsMap);
            return reactionsMap;
        }
    };
    const getReactionsFromTargetKey = (target, key) => {
        const reactionsMap = RawReactionsMap.get(target);
        if (reactionsMap) {
            const set = reactionsMap.get(key);
            if (set) {
                return [...set];
            }
        }
        return [];
    };
    const runReactions = (target, key) => {
        const reactions = getReactionsFromTargetKey(target, key);
        for (let i = 0, len = reactions.length; i < len; i++) {
            const reaction = reactions[i];
            if (reaction._isComputed) {
                reaction._scheduler(reaction);
            } else if (isScopeBatching()) {
                PendingScopeReactions.add(reaction);
            } else if (isBatching()) {
                PendingReactions.add(reaction);
            } else {
                if (isFn(reaction._scheduler)) {
                    reaction._scheduler(reaction);
                } else {
                    reaction();
                }
            }
        }
    };
    const runReactionsFromTargetKey = (operation) => {
        let { key, type, target, oldTarget } = operation;
        notifyObservers(operation);
        if (type === 'clear') {
            oldTarget.forEach((_, key) => {
                runReactions(target, key);
            });
        } else {
            runReactions(target, key);
        }
        if (type === 'add' || type === 'delete' || type === 'clear') {
            const newKey = Array.isArray(target) ? 'length' : ITERATION_KEY;
            runReactions(target, newKey);
        }
    };
    const bindTargetKeyWithCurrentReaction = (operation) => {
        if (isUntracking()) {
            return;
        }
        let { key, type, target } = operation;
        if (type === 'iterate') {
            key = ITERATION_KEY;
        }
        const currentReaction = ReactionStack[ReactionStack.length - 1];
        if (currentReaction) {
            const reactionsMap = addReactionsToTargetKeyMap(target, key, currentReaction);
            const bindSet = currentReaction._reactionsSet;
            if (bindSet) {
                bindSet.add(reactionsMap);
            } else {
                currentReaction._reactionsSet = new Set([reactionsMap]);
            }
        }
    };
    const bindComputedReactions = (computedReaction) => {
        if (isFn(computedReaction)) {
            const currentReaction = ReactionStack[ReactionStack.length - 1];
            if (currentReaction) {
                const computes = currentReaction._computesSet;
                if (computes) {
                    computes.add(computedReaction);
                } else {
                    currentReaction._computesSet = new Set([computedReaction]);
                }
            }
        }
    };
    const releaseBindingReactions = (reaction) => {
        const bindingSet = reaction._reactionsSet;
        if (bindingSet) {
            bindingSet.forEach((reactionsMap) => {
                reactionsMap.forEach((reactions) => {
                    reactions.delete(reaction);
                });
            });
        }
        delete reaction._reactionsSet;
    };
    const suspendComputedReactions = (reaction) => {
        const computes = reaction._computesSet;
        if (computes) {
            computes.forEach((computedReaction) => {
                const reactions = getReactionsFromTargetKey(computedReaction._context, computedReaction._property);
                if (reactions.length === 0) {
                    disposeBindingReactions(computedReaction);
                    computedReaction._dirty = true;
                }
            });
        }
    };
    const disposeBindingReactions = (reaction) => {
        releaseBindingReactions(reaction);
        suspendComputedReactions(reaction);
    };
    const batchStart = () => {
        BatchCount.value++;
    };
    const batchEnd = () => {
        BatchCount.value--;
        if (BatchCount.value === 0) {
            excutePendingReactions();
        }
    };
    const batchScopeStart = () => {
        BatchScope.value = true;
    };
    const batchScopeEnd = () => {
        BatchScope.value = false;
        PendingScopeReactions.forEach((reaction) => {
            PendingScopeReactions.delete(reaction);
            if (isFn(reaction._scheduler)) {
                reaction._scheduler(reaction);
            } else {
                reaction();
            }
        });
    };
    const untrackStart = () => {
        UntrackCount.value++;
    };
    const untrackEnd = () => {
        UntrackCount.value--;
    };
    const isBatching = () => BatchCount.value > 0;
    const isScopeBatching = () => BatchScope.value;
    const isUntracking = () => UntrackCount.value > 0;
    const excutePendingReactions = () => {
        PendingReactions.forEach((reaction) => {
            PendingReactions.delete(reaction);
            if (isFn(reaction._scheduler)) {
                reaction._scheduler(reaction);
            } else {
                reaction();
            }
        });
    };

    const RAW_TYPE = Symbol('RAW_TYPE');
    const OBSERVABLE_TYPE = Symbol('OBSERVABLE_TYPE');
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    const isSupportObservable = (target) => {
        if (!isValid(target)) {
            return false;
        }
        if (isArr(target)) {
            return true;
        }
        if (isPlainObj(target)) {
            if (target[RAW_TYPE]) {
                return false;
            }
            if (target[OBSERVABLE_TYPE]) {
                return true;
            }
            if ('$$typeof' in target && '_owner' in target) {
                return false;
            }
            if (target['_isAMomentObject']) {
                return false;
            }
            if (target['_isJSONSchemaObject']) {
                return false;
            }
            if (isFn(target['toJS'])) {
                return false;
            }
            if (isFn(target['toJSON'])) {
                return false;
            }
            return true;
        }
        if (isMap(target) || isWeakMap(target) || isSet(target) || isWeakSet(target)) {
            return true;
        }
        return false;
    };
    const isObservable = (target) => {
        return ProxyRaw.has(target);
    };
    const markRaw = (target) => {
        if (!target) {
            return;
        }
        if (isFn(target)) {
            target.prototype[RAW_TYPE] = true;
        } else {
            target[RAW_TYPE] = true;
        }
        return target;
    };
    const markObservable = (target) => {
        if (!target) {
            return;
        }
        if (isFn(target)) {
            target.prototype[OBSERVABLE_TYPE] = true;
        } else {
            target[OBSERVABLE_TYPE] = true;
        }
        return target;
    };
    const getRaw = (target) => ProxyRaw.get(target);
    const toJS = (values) => {
        const visited = new WeakSet();
        const tojs = (values) => {
            if (isArr(values)) {
                if (visited.has(values)) {
                    return values;
                }
                const originValues = values;
                if (ProxyRaw.has(values)) {
                    values = ProxyRaw.get(values);
                }
                visited.add(originValues);
                const res = [];
                values.forEach((item) => {
                    res.push(tojs(item));
                });
                return res;
            }
            if (isPlainObj(values)) {
                if (visited.has(values)) {
                    return values;
                }
                const originValues = values;
                if (ProxyRaw.has(values)) {
                    values = ProxyRaw.get(values);
                }
                if ('$$typeof' in values && '_owner' in values) {
                    return values;
                } else if (values['_isAMomentObject']) {
                    return values;
                } else if (values['_isJSONSchemaObject']) {
                    return values;
                } else if (isFn(values['toJS'])) {
                    return values['toJS']();
                } else if (isFn(values['toJSON'])) {
                    return values['toJSON']();
                } else {
                    visited.add(originValues);
                    const res = {};
                    for (const key in values) {
                        if (hasOwnProperty.call(values, key)) {
                            res[key] = tojs(values[key]);
                        }
                    }
                    return res;
                }
            }
            return values;
        };
        return tojs(values);
    };

    const wellKnownSymbols = new Set(Object.getOwnPropertyNames(Symbol)
        .map((key) => Symbol[key])
        .filter((value) => typeof value === 'symbol'));

    function findObservable(target, key, value) {
        const observableObj = RawProxy.get(value);
        if (observableObj) {
            return observableObj;
        }
        if (!isObservable(value) && isSupportObservable(value)) {
            return createObservable(target, key, value);
        }
        return value;
    }
    function patchIterator(target, key, iterator, isEntries) {
        const originalNext = iterator.next;
        iterator.next = () => {
            let { done, value } = originalNext.call(iterator);
            if (!done) {
                if (isEntries) {
                    value[1] = findObservable(target, key, value[1]);
                } else {
                    value = findObservable(target, key, value);
                }
            }
            return { done, value };
        };
        return iterator;
    }
    const instrumentations = {
        has(key) {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            bindTargetKeyWithCurrentReaction({ target, key, type: 'has' });
            return proto.has.apply(target, arguments);
        },
        get(key) {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            bindTargetKeyWithCurrentReaction({ target, key, type: 'get' });
            return findObservable(target, key, proto.get.apply(target, arguments));
        },
        add(key) {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            const hadKey = proto.has.call(target, key);
            const result = proto.add.apply(target, arguments);
            if (!hadKey) {
                runReactionsFromTargetKey({ target, key, value: key, type: 'add' });
            }
            return result;
        },
        set(key, value) {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            const hadKey = proto.has.call(target, key);
            const oldValue = proto.get.call(target, key);
            const result = proto.set.apply(target, arguments);
            if (!hadKey) {
                runReactionsFromTargetKey({ target, key, value, type: 'add' });
            } else if (value !== oldValue) {
                runReactionsFromTargetKey({ target, key, value, oldValue, type: 'set' });
            }
            return result;
        },
        delete(key) {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            const hadKey = proto.has.call(target, key);
            const oldValue = proto.get ? proto.get.call(target, key) : undefined;
            const result = proto.delete.apply(target, arguments);
            if (hadKey) {
                runReactionsFromTargetKey({ target, key, oldValue, type: 'delete' });
            }
            return result;
        },
        clear() {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            const hadItems = target.size !== 0;
            const oldTarget = target instanceof Map ? new Map(target) : new Set(target);
            const result = proto.clear.apply(target, arguments);
            if (hadItems) {
                runReactionsFromTargetKey({ target, oldTarget, type: 'clear' });
            }
            return result;
        },
        forEach(cb, ...args) {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            bindTargetKeyWithCurrentReaction({ target, type: 'iterate' });
            const wrappedCb = (value, key, ...args) => cb(findObservable(target, key, value), key, ...args);
            return proto.forEach.call(target, wrappedCb, ...args);
        },
        keys() {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            bindTargetKeyWithCurrentReaction({ target, type: 'iterate' });
            return proto.keys.apply(target, arguments);
        },
        values() {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            bindTargetKeyWithCurrentReaction({ target, type: 'iterate' });
            const iterator = proto.values.apply(target, arguments);
            return patchIterator(target, '', iterator, false);
        },
        entries() {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            bindTargetKeyWithCurrentReaction({ target, type: 'iterate' });
            const iterator = proto.entries.apply(target, arguments);
            return patchIterator(target, '', iterator, true);
        },
        [Symbol.iterator]() {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            bindTargetKeyWithCurrentReaction({ target, type: 'iterate' });
            const iterator = proto[Symbol.iterator].apply(target, arguments);
            return patchIterator(target, '', iterator, target instanceof Map);
        },
        get size() {
            const target = ProxyRaw.get(this);
            const proto = Reflect.getPrototypeOf(this);
            bindTargetKeyWithCurrentReaction({ target, type: 'iterate' });
            return Reflect.get(proto, 'size', target);
        },
    };
    const collectionHandlers = {
        get(target, key, receiver) {
            target = hasOwnProperty.call(instrumentations, key) ? instrumentations : target;
            return Reflect.get(target, key, receiver);
        },
    };
    const baseHandlers = {
        get(target, key, receiver) {
            const result = target[key];
            if (wellKnownSymbols.has(key)) {
                return result;
            }
            bindTargetKeyWithCurrentReaction({ target, key, receiver, type: 'get' });
            const observableResult = RawProxy.get(result);
            if (observableResult) {
                return observableResult;
            }
            if (!isObservable(result) && isSupportObservable(result)) {
                const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
                if (!descriptor || descriptor.writable || descriptor.configurable) {
                    return createObservable(target, key, result);
                }
            }
            return result;
        },
        has(target, key) {
            const result = Reflect.has(target, key);
            bindTargetKeyWithCurrentReaction({ target, key, type: 'has' });
            return result;
        },
        ownKeys(target) {
            bindTargetKeyWithCurrentReaction({ target, type: 'iterate' });
            return Reflect.ownKeys(target);
        },
        set(target, key, value, receiver) {
            const hadKey = hasOwnProperty.call(target, key);
            const newValue = createObservable(target, key, value);
            const oldValue = target[key];
            target[key] = newValue;
            if (!hadKey) {
                runReactionsFromTargetKey({ target, key, value: newValue, oldValue, receiver, type: 'add' });
            } else if (value !== oldValue) {
                runReactionsFromTargetKey({ target, key, value: newValue, oldValue, receiver, type: 'set' });
            }
            return true;
        },
        deleteProperty(target, key) {
            const res = Reflect.deleteProperty(target, key);
            const oldValue = target[key];
            runReactionsFromTargetKey({ target, key, oldValue, type: 'delete' });
            return res;
        },
    };

    class DataChange {
        constructor(operation, node) {
            this.key = operation.key;
            this.type = operation.type;
            this.value = operation.value;
            this.oldValue = operation.oldValue;
            this.path = [...node.path, operation.key];
        }
    }
    class DataNode {
        constructor(target, key, value) {
            this.target = target;
            this.key = key;
            this.value = value;
        }
        get path() {
            if (!this.parent) {
                return this.key ? [this.key] : [];
            }
            return [...this.parent.path, this.key];
        }
        get targetRaw() {
            return ProxyRaw.get(this.target) || this.target;
        }
        get parent() {
            return this.target ? RawNode.get(this.targetRaw) : undefined;
        }
        isEqual(node) {
            if (this.key) {
                return node.targetRaw === this.targetRaw && node.key === this.key;
            }
            return node.value === this.value;
        }
        contains(node) {
            if (node === this) {
                return true;
            }
            let parent = node.parent;
            while (!!parent) {
                if (this.isEqual(parent)) {
                    return true;
                }
                parent = parent.parent;
            }
            return false;
        }
    }
    const buildDataTree = (target, key, value) => {
        const currentNode = RawNode.get(ProxyRaw.get(value) || value);
        if (currentNode) {
            return currentNode;
        }
        RawNode.set(value, new DataNode(target, key, value));
    };

    const createNormalProxy = (target, shallow) => {
        const proxy = new Proxy(target, baseHandlers);
        ProxyRaw.set(proxy, target);
        if (shallow) {
            RawShallowProxy.set(target, proxy);
        } else {
            RawProxy.set(target, proxy);
        }
        return proxy;
    };
    const createCollectionProxy = (target, shallow) => {
        const proxy = new Proxy(target, collectionHandlers);
        ProxyRaw.set(proxy, target);
        if (shallow) {
            RawShallowProxy.set(target, proxy);
        } else {
            RawProxy.set(target, proxy);
        }
        return proxy;
    };
    const createObservable = (target, key, value, shallow) => {
        if (typeof value !== 'object') {
            return value;
        }
        const raw = ProxyRaw.get(value);
        if (!!raw) {
            const node = RawNode.get(raw);
            node.key = key;
            return value;
        }
        if (!isSupportObservable(value)) {
            return value;
        }
        if (target) {
            const parentRaw = ProxyRaw.get(target) || target;
            const isShallowParent = RawShallowProxy.get(parentRaw);
            if (isShallowParent) {
                return value;
            }
        }
        buildDataTree(target, key, value);
        if (isNormalType(value)) {
            return createNormalProxy(value, shallow);
        }
        if (isCollectionType(value)) {
            return createCollectionProxy(value, shallow);
        }
        return value;
    };
    function createAnnotation(maker) {
        const annotation = (target) => {
            return maker({ value: target });
        };
        if (isFn(maker)) {
            annotation[MakeObservableSymbol] = maker;
        }
        return annotation;
    }

    const createBatchAnnotation = (method) => createAnnotation(({ target, key, value }) => {
        const action = (callback) => {
            return function (...args) {
                return method(() => isFn(callback) ? callback.apply(target, args) : undefined);
            };
        };
        if (target) {
            target[key] = action(target[key]);
            return target;
        }
        return action(value);
    });
    const batch = (callback) => {
        let result = null;
        try {
            batchStart();
            if (isFn(callback)) {
                result = callback();
            }
        } finally {
            batchEnd();
        }
        return result;
    };
    const action = createBatchAnnotation(batch);
    batch.scope = (callback) => {
        let result = null;
        try {
            batchScopeStart();
            if (isFn(callback)) {
                result = callback();
            }
        } finally {
            batchScopeEnd();
        }
        return result;
    };
    batch[MakeObservableSymbol] = action;
    batch.scope[MakeObservableSymbol] = createBatchAnnotation(batch.scope);

    const untracked = (untracker) => {
        untrackStart();
        let res;
        try {
            if (isFn(untracker)) {
                res = untracker();
            }
        } finally {
            untrackEnd();
        }
        return res;
    };

    const observable$1 = createAnnotation(({ target, key, value }) => {
        const store = {
            value: createObservable(target, key, target ? target[key] : value),
        };
        function get() {
            bindTargetKeyWithCurrentReaction({ target: target, key: key, type: 'get' });
            return store.value;
        }
        function set(value) {
            const oldValue = store.value;
            value = createObservable(target, key, value);
            store.value = value;
            if (oldValue !== value) {
                runReactionsFromTargetKey({ target, key, value, oldValue, type: 'set' });
            }
        }
        if (target) {
            Object.defineProperty(target, key, { set, get, enumerable: true, configurable: false });
            return target;
        }
        return store.value;
    });

    const box = createAnnotation(({ target, key, value }) => {
        const store = {
            value: target ? target[key] : value,
        };
        const proxy = { set, get };

        ProxyRaw.set(proxy, store);
        RawProxy.set(store, proxy);

        buildDataTree(target, key, store);
        function get() {
            bindTargetKeyWithCurrentReaction({ target: store, key, type: 'get' });
            return store.value;
        }
        function set(value) {
            const oldValue = store.value;
            store.value = value;
            if (oldValue !== value) {
                runReactionsFromTargetKey({ target: store, key, value, oldValue, type: 'set' });
            }
        }
        if (target) {
            Object.defineProperty(target, key, { value: proxy, enumerable: true, configurable: false, writable: false });
            return target;
        }
        return proxy;
    });

    const ref = createAnnotation(({ target, key, value }) => {
        const store = {
            value: target ? target[key] : value,
        };
        const proxy = {};
        const context = target ? target : store;
        const property = target ? key : 'value';

        buildDataTree(target, key, store);
        ProxyRaw.set(proxy, store);
        RawProxy.set(store, proxy);

        function get() {
            bindTargetKeyWithCurrentReaction({ target: context, key: property, type: 'get' });
            return store.value;
        }
        function set(value) {
            const oldValue = store.value;
            store.value = value;
            if (oldValue !== value) {
                runReactionsFromTargetKey({ target: context, key: property, value, oldValue, type: 'set' });
            }
        }
        if (target) {
            Object.defineProperty(target, key, { get, set, enumerable: true, configurable: false });
            return target;
        } else {
            Object.defineProperty(proxy, 'value', { set, get });
        }
        return proxy;
    });

    const shallow = createAnnotation(({ target, key, value }) => {
        const store = {
            value: createObservable(target, key, target ? target[key] : value, true),
        };
        function get() {
            bindTargetKeyWithCurrentReaction({ target, key, type: 'get' });
            return store.value;
        }
        function set(value) {
            const oldValue = store.value;
            value = createObservable(target, key, value, true);
            store.value = value;
            if (oldValue !== value) {
                runReactionsFromTargetKey({ target, key, value, oldValue, type: 'set' });
            }
        }
        if (target) {
            Object.defineProperty(target, key, { set, get, enumerable: true, configurable: false });
            return target;
        }
        return store.value;
    });

    const computed = createAnnotation(({ target, key, value }) => {
        const store = {};
        const proxy = {};
        const context = target ? target : store;
        const property = target ? key : 'value';
        const getter = getGetter(context);
        const setter = getSetter(context);
        function getGetter(target) {
            if (!target) {
                if (value?.get) {
                    return value?.get;
                }
                return value;
            }
            const descriptor = Object.getOwnPropertyDescriptor(target, property);
            if (descriptor?.get) {
                return descriptor.get;
            }
            return getGetter(Object.getPrototypeOf(target));
        }
        function getSetter(target) {
            if (!target) {
                if (value?.set) {
                    return value?.set;
                }
                return;
            }
            const descriptor = Object.getOwnPropertyDescriptor(target, property);
            if (descriptor?.set) {
                return descriptor.set;
            }
            return getSetter(Object.getPrototypeOf(target));
        }
        function compute() {
            store.value = getter?.call?.(context);
        }
        function reaction() {
            if (!ReactionStack.includes(reaction)) {
                try {
                    ReactionStack.push(reaction);
                    compute();
                } finally {
                    ReactionStack.pop();
                }
            }
        }
        reaction._name = 'ComputedReaction';
        reaction._scheduler = () => {
            reaction._dirty = true;
            batchStart();
            runReactionsFromTargetKey({ target: context, key: property, value: store.value, type: 'set' });
            batchEnd();
        };
        reaction._isComputed = true;
        reaction._dirty = true;
        reaction._context = context;
        reaction._property = property;

        ProxyRaw.set(proxy, store);
        RawProxy.set(store, proxy);
        buildDataTree(target, key, store);
        function get() {
            if (ReactionStack.length > 0) {
                bindComputedReactions(reaction);
            }
            if (!isUntracking()) {
                if (reaction._dirty) {
                    reaction();
                    reaction._dirty = false;
                }
            } else {
                compute();
            }
            bindTargetKeyWithCurrentReaction({ target: context, key: property, type: 'get' });
            return store.value;
        }
        function set(value) {
            try {
                batchStart();
                setter?.call?.(context, value);
            } finally {
                batchEnd();
            }
        }
        if (target) {
            Object.defineProperty(target, key, { get, set, enumerable: true, configurable: false });
            return target;
        } else {
            Object.defineProperty(proxy, 'value', { set, get });
        }
        return proxy;
    });

    function observable(target) {
        return createObservable(null, null, target);
    }
    observable.box = box;
    observable.ref = ref;
    observable.deep = observable$1;
    observable.shallow = shallow;
    observable.computed = computed;
    observable[MakeObservableSymbol] = observable$1;

    function getObservableMaker(target) {
        let level1 = target[MakeObservableSymbol];
        if (level1) {
            return level1[MakeObservableSymbol] ? getObservableMaker(level1) : level1;
        }
    }

    function define(target, annotations) {
        if (isObservable(target)) {
            return target;
        }
        if (!isSupportObservable(target)) {
            return target;
        }
        buildDataTree(undefined, undefined, target);
        ProxyRaw.set(target, target);
        RawProxy.set(target, target);
        for (const key in annotations) {
            const annotation = annotations[key];
            if (isAnnotation(annotation)) {
                getObservableMaker(annotation)({ target, key });
            }
        }
        return target;
    }

    function model(target) {
        const annotations = Object.keys(target || {}).reduce((buf, key) => {
            const descriptor = Object.getOwnPropertyDescriptor(target, key);
            if (descriptor && descriptor.get) {
                buf[key] = observable.computed;
            } else if (isFn(target[key])) {
                buf[key] = batch;
            } else {
                buf[key] = observable;
            }
            return buf;
        }, {});
        return define(target, annotations);
    }

    const autorun = (tracker, name = 'AutoRun') => {
        const reaction = () => {
            if (!isFn(tracker)) {
                return;
            }
            if (reaction._boundary > 0) {
                return;
            }
            if (!ReactionStack.includes(reaction)) {
                releaseBindingReactions(reaction);
                try {
                    batchStart();
                    ReactionStack.push(reaction);
                    tracker();
                } finally {
                    ReactionStack.pop();
                    reaction._boundary++;
                    batchEnd();
                    reaction._boundary = 0;
                }
            }
        };
        reaction._boundary = 0;
        reaction._name = name;
        reaction();
        return () => disposeBindingReactions(reaction);
    };
    const reaction$1 = (tracker, subscriber, options) => {
        const value = {};
        const initialized = {};
        const dirty = {};
        const dirtyCheck = () => {
            if (isFn(options.equals)) {
                return !options.equals(value.oldValue, value.currentValue);
            }
            return value.oldValue !== value.currentValue;
        };
        const reaction = () => {
            if (!ReactionStack.includes(reaction)) {
                releaseBindingReactions(reaction);
                try {
                    ReactionStack.push(reaction);
                    value.currentValue = tracker();
                    dirty.current = dirtyCheck();
                } finally {
                    ReactionStack.pop();
                }
            }
            if ((dirty.current && initialized.current) ||
                (!initialized.current && options.fireImmediately)) {
                try {
                    batchStart();
                    untrackStart();
                    if (isFn(subscriber)) {
                        subscriber(value.currentValue, value.oldValue);
                    }
                } finally {
                    untrackEnd();
                    batchEnd();
                }
            }
            value.oldValue = value.currentValue;
            initialized.current = true;
        };
        reaction._name = 'Reaction';
        reaction();
        return () => disposeBindingReactions(reaction);
    };

    class Tracker {
        constructor(scheduler, name = 'TrackerReaction') {
            this.track = (tracker) => {
                if (!isFn(tracker)) {
                    return this.results;
                }
                if (this.track._boundary > 0) {
                    return;
                }
                if (!ReactionStack.includes(this.track)) {
                    try {
                        batchStart();
                        ReactionStack.push(this.track);
                        this.results = tracker();
                    } finally {
                        ReactionStack.pop();
                        this.track._boundary++;
                        batchEnd();
                        this.track._boundary = 0;
                    }
                }
                return this.results;
            };
            this.track._scheduler = (callback) => {
                if (this.track._boundary === 0) {
                    this.dispose();
                }
                if (isFn(callback)) {
                    scheduler(callback);
                }
            };
            this.track._name = name;
            this.track._boundary = 0;
            this.dispose = () => disposeBindingReactions(this.track);
        }
    }

    const observe = (target, observer, deep = true) => {
        const addListener = (target) => {
            const raw = ProxyRaw.get(target) || target;
            const node = RawNode.get(raw);
            const listener = (operation) => {
                const targetRaw = ProxyRaw.get(operation.target) || operation.target;
                const targetNode = RawNode.get(targetRaw);
                if (deep && node.contains(targetNode)) {
                    observer(new DataChange(operation, targetNode));
                    return;
                }
                if (node === targetNode || (node.targetRaw === targetRaw && node.key === operation.key)) {
                    observer(new DataChange(operation, targetNode));
                }
            };
            if (node && isFn(observer)) {
                ObserverListeners.add(listener);
            }
            return () => {
                ObserverListeners.delete(listener);
            };
        };
        if (target && typeof target !== 'object') {
            throw Error(`Can not observe ${typeof target} type.`);
        }
        return addListener(target);
    };

    exports.Reactive = {
        DataChange, DataNode, Tracker, action, autorun, batch, buildDataTree,
        define, isAnnotation, isObservable, isSupportObservable, markObservable,
        markRaw, model, observable, observe, getRaw, reaction$1, toJS, untracked,
    }
})(global.Formily = global.Formily || {});
