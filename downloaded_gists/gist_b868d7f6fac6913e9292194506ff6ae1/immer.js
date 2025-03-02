const carefulDataTypes = {
    Object: 'Object',
    Map: 'Map',
    Set: 'Set',
    Array: 'Array',
};
const objDesc = '[object Object]';
const mapDesc = '[object Map]';
const setDesc = '[object Set]';
const arrDesc = '[object Array]';
const desc2dataType = {
    [objDesc]: carefulDataTypes.Object,
    [mapDesc]: carefulDataTypes.Map,
    [setDesc]: carefulDataTypes.Set,
    [arrDesc]: carefulDataTypes.Array,
};

// fill,push,pop,splice,shift,unshift should trigger copy, so they are not in arrIgnoreFnOrAttributeKeys
const arrFnKeys = [
    'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex', 'flat', 'flatMap',
    'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'map', 'pop', 'push', 'reduce',
    'reduceRight', 'reverse', 'shift', 'unshift', 'slice', 'some', 'sort', 'splice', 'values', 'valueOf',
];
const arrIgnoreFnOrAttributeKeys = [
    'length', 'forEach', 'slice', 'concat', 'find', 'findIndex', 'filter', 'flat', 'flatMap', 'includes',
    'reverse', 'indexOf', 'every', 'some', 'constructor', 'join', 'keys', 'lastIndexOf', 'map', 'reduce',
    'reduceRight', 'sort', 'values', 'entries', 'copyWithin', 'valueOf', 'asymmetricMatch', 'nodeType',
];

const mapFnKeys = ['clear', 'delete', 'entries', 'forEach', 'get', 'has', 'keys', 'set', 'values'];
const mapIgnoreFnKeys = ['entries', 'keys', 'values', 'forEach', 'has', 'get'];
const mapIgnoreFnOrAttributeKeys = [...mapIgnoreFnKeys, 'size'];

const setFnKeys = ['add', 'clear', 'delete', 'entries', 'forEach', 'has', 'keys', 'values'];
const setIgnoreFnKeys = ['entries', 'forEach', 'has', 'keys', 'values'];
const setIgnoreFnOrAttributeKeys = [...setIgnoreFnKeys, 'size'];

const carefulType2FnKeys = {
    [carefulDataTypes.Map]: mapFnKeys,
    [carefulDataTypes.Set]: setFnKeys,
    [carefulDataTypes.Array]: arrFnKeys,
};

// slice、concat 以及一些特殊的key取值等操作无需copy副本
function allowCopyForOp(parentType, op) {
    if (parentType === carefulDataTypes.Array) {
        if (arrIgnoreFnOrAttributeKeys.includes(op)) {
            return false;
        }
        if (canBeNum(op)) {
            return false;
        }
    }
    if (parentType === carefulDataTypes.Map && mapIgnoreFnOrAttributeKeys.includes(op)) {
        return false;
    }
    if (parentType === carefulDataTypes.Set && setIgnoreFnOrAttributeKeys.includes(op)) {
        return false;
    }
    // like Symbol(Symbol.isConcatSpreadable) in test case array-base/concat
    if (isSymbol(op)) {
        return false;
    }
    return true;
}

const getValStrDesc = val => Object.prototype.toString.call(val);
const isSymbol = maySymbol => typeof maySymbol === 'symbol';
const isObject = val => getValStrDesc(val) === objDesc;
const isMap = val => getValStrDesc(val) === mapDesc;
const isSet = val => getValStrDesc(val) === setDesc;
const isComplexDataType = val => !!desc2dataType[getValStrDesc(val)];
const getDataNodeType = val => getValStrDesc(val).slice(8, -1);

const isPromiseFn = obj => obj.constructor.name === 'AsyncFunction' || 'function' === typeof obj.then;

function canBeNum(val) {
    const valType = typeof val;
    if (valType === 'string') {
        if (val.includes('.')) {
            const pureStr = val.replace(/\./g, '');
            // 去掉.之后，如果还包含有其他字符，则直接返回false
            if (!/^[1-9]+[0-9]*$/.test(pureStr)) {
                return false;
            }
            const parsed = parseFloat(val);
            return !Number.isNaN(parsed);
        } else if (val === "0") {
            return true;
        } else {
            return /^[1-9]+[0-9]*$/.test(val);
        }
    } else if (valType === 'number') {
        return true;
    }
    return false;
}

// 用于验证 proxyDraft 和 finishDraft函数 是否能够匹配
const verKey = Symbol('verKey');
const metasKey = Symbol('metas');

const verWrap = { value: 0 };
function getMetaVer() {
    verWrap.value += 1;
    return verWrap.value;
}

const ver2MetasList = {};
function clearAllDataNodeMeta(metaVer) {
    let metasList = ver2MetasList[metaVer];
    metasList.forEach(metas => delete metas[metaVer]);
}

function setMetasProto(val, realProto) {
    // 把 metas 放到单独的 __proto__ 层里，确保写入的数据不会污染 Object.prototype
    //__proto__:
    //  Symbol('metas'): { 1: metaV1, 2: metaV2, 3: metaV3, ... }
    //      __proto__: RealProto[Object | Array | Set | Map]
    const metaProto = Object.create(null);
    Object.setPrototypeOf(metaProto, realProto);

    // 故意多写一层 __proto__ 容器
    Object.setPrototypeOf(val, metaProto);
    val.__proto__[metasKey] = {};
}

function getRealProto(val) {
    return Object.getPrototypeOf(val) || Object.prototype;
}

function ensureDataNodeMetasProtoLayer(val, metaVer, throwError = false) {
    if (isComplexDataType(val) && val) {
        let metasList = ver2MetasList[metaVer] || [];

        if (!val[metasKey]) {
            setMetasProto(val, getRealProto(val));
        }

        metasList.push(val[metasKey]);
        ver2MetasList[metaVer] = metasList;
    } else if (throwError) {
        throw new Error('type can only be object or array');
    }
}

function getMetas(mayMetasProtoObj) {
    return mayMetasProtoObj ? mayMetasProtoObj[metasKey] : null;
}

function getMeta(mayMetasProtoObj, metaVer) {
    const metas = getMetas(mayMetasProtoObj);
    return metas ? metas[metaVer] : null;
}

function getMetaForDraft(draft, metaVer) {
    return getMeta(draft.__proto__, metaVer);
}

function setMeta(obj, meta, metaVer) {
    const metas = getMetas(obj);
    metas && (metas[metaVer] = meta);
}

// 调用处已保证 meta 不为空
function makeCopy(meta) {
    const metaOwner = meta.self;
    if (Array.isArray(metaOwner)) {
        return metaOwner.slice();
    }
    if (isObject(metaOwner)) {
        return { ...metaOwner };
    }
    if (isMap(metaOwner)) {
        return new Map(metaOwner);
    }
    if (isSet(metaOwner)) {
        return new Set(metaOwner);
    }
    throw new Error(`data ${metaOwner} try trigger getCopy, its type is ${typeof meta}`);
}

function getUnProxyValue(value, metaVer) {
    const valueMeta = getMetaForDraft(value, metaVer);
    if (!valueMeta) {
        return value;
    }
    let copy = valueMeta.copy || makeCopy(valueMeta);
    return valueMeta.copy = copy;
}

function getLevel(mayContainMetaObj, metaVer) {
    const meta = getMeta(mayContainMetaObj, metaVer);
    return meta ? meta.level + 1 : 1;
}

function isDraft(mayDraft) {
    return !!mayDraft[verKey];
}

function getKeyPath(mayContainMetaObj, curKey, metaVer) {
    const pathArr = [curKey];
    const meta = getMeta(mayContainMetaObj, metaVer);
    if (meta && meta.level > 0) {
        const { keyPath } = meta;
        return [...keyPath, curKey];
    }
    return pathArr;
}

function copyDataNode(parentDataNode, copyCtx, isFirstCall) {
    const { op, key, value: mayProxyValue, metaVer, parentType } = copyCtx;
    const parentDataNodeMeta = getMeta(parentDataNode, metaVer);
    /**
     * 防止 value 本身就是一个 Proxy
     * let draft_a1_b = draft.a1.b;
     * draft.a2 = draft_a1_b;
     * value 本身可能是代理对象
     */
    let value = isFirstCall ? getUnProxyValue(mayProxyValue, metaVer) : mayProxyValue;

    if (parentDataNodeMeta) {
        let selfCopy = parentDataNodeMeta.copy;
        const allowCopy = allowCopyForOp(parentType, op);

        if (!selfCopy && allowCopy) {
            selfCopy = makeCopy(parentDataNodeMeta);
            parentDataNodeMeta.copy = selfCopy;

            if (isComplexDataType(value)) {
                const valueMeta = getMeta(value, metaVer);
                if (valueMeta) {
                    /**
                     * 值的父亲节点和当时欲写值的数据节点层级对不上，说明节点发生了层级移动
                     * 总是记录最新的父节点关系，防止原有的关系被解除
                     * ------------------------------------------------------------
                     *
                     * // 移动情况
                     * // draft => { a: { b: { c: { d: { e: 1 } } } } }
                     * const cValue = draft.a.b.c;   // cValue: { d: { e: 1 } }，此时 cValue 已被代理，parentLevel = 2
                     *
                     * // [1]: dataNode: draft, key: 'a', value: cValue
                     * draft.a = cValue;
                     * // parentLevel = 0, 数据节点层级出现移动
                     *
                     * // [2]: dataNode: draft.a, key: 'b', value: cValue
                     * draft.a.b = cValue;
                     * // parentLevel = 1, 数据节点层级出现移动
                     *
                     * // [3]: dataNode: draft.a.b, key: 'c', value: cValue
                     * draft.a.b.c = cValue;
                     * // parentLevel = 2, 数据节点层级没有出现移动，还保持原来的关系
                     *
                     * ------------------------------------------------------------
                     * // 关系解除情况
                     * // draft => { a: { b: { c: { d: { e: 1 } } } }, a1: 2 }
                     * const dValue = draft.a.b.c.d;   // { e: 1 }
                     * draft.a1 = dValue;
                     * draft.a.b.c = null; // d属性数据节点和父亲关系解除
                     */
                    if (valueMeta.parent.level !== parentDataNodeMeta.level) {
                        // 修正 valueMeta 维护的相关数据
                        valueMeta.parent = parentDataNodeMeta.self;
                        valueMeta.level = parentDataNodeMeta.level + 1;
                        valueMeta.key = key;
                        valueMeta.keyPath = getKeyPath(valueMeta.parent, key, metaVer);
                        /**
                         * 父亲节点 P 和当时欲写值的数据节点 C 层级相等，也不能保证 C 向上链路的所有父辈们是否有过层级移动
                         * 因为他们发生移动时，是不会去修改所有子孙的元数据的
                         */
                    }
                    /**
                     * 还没为当前数据节点建立代理，就被替换了
                     * // draft => { a: { b: { c: 1 } } }
                     * draft.a = { b: { c: 100 } };
                     */
                }
            }

            // 向上回溯，复制完整条链路，parentMeta 为 null 表示已回溯到顶层
            if (parentDataNodeMeta.parentMeta) {
                const copyCtx = { key: parentDataNodeMeta.key, value: selfCopy, metaVer };
                copyDataNode(parentDataNodeMeta.parentMeta.self, copyCtx, false);
            }
        }

        const { self, proxyVal } = parentDataNodeMeta;

        if (!allowCopy) {
            // avoid error: X.prototype.y called on incompatible type
            // see https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Errors/Called_on_incompatible_type
            const isMapFnKey = mapIgnoreFnKeys.includes(op);
            const isSetFnKey = setIgnoreFnKeys.includes(op);

            if (isMapFnKey || isSetFnKey) {
                let fn = selfCopy ? selfCopy[op].bind(selfCopy) : self[op].bind(self);
                if (op === 'forEach' && parentType === carefulDataTypes.Map) {
                    const oriFn = fn;
                    fn = (val, key) => oriFn(val, key, proxyVal);
                }
                return fn;
            } else {
                return selfCopy ? selfCopy[op] : self[op];
            }
        }

        // 是 Map, Set, Array 类型的方法操作或者值获取!  此时肯定有 selfCopy
        const fnKeys = carefulType2FnKeys[parentType];
        if (fnKeys) {
            if (fnKeys.includes(op)) {
                // slice 操作无需使用copy，返回自身即可
                return 'slice' === op ? self.slice : selfCopy[op].bind(selfCopy);
            } else {
                return selfCopy[op];
            }
        }

        if (op === 'del') {
            delete selfCopy[key];
        } else {
            selfCopy[key] = value;
        }
        /**
         * 链路断裂，此对象未被代理
         * // draft => { a: { b: { c: 1 } }};
         * const newData = { n1: { n2: 2 } };
         * draft.a = newData;
         * draft.a.n1.n2 = 888; // 此时 n2_DataNode 是未代理对象
         */
    } else {
        parentDataNode[key] = value;
    }
}

function buildLimuApis() {
    const metaVer = getMetaVer();
    let revoke = null;

    let copyOnWriteTraps = {
        get: (parent, key) => {
            let currentChildVal = parent[key];
            if (key === '__proto__') {
                return currentChildVal;
            }
            if (key === verKey) {
                return metaVer;
            }

            const parentMeta = getMeta(parent, metaVer);

            // 第 2+ 次进入 key 的 get 函数，已为 parent 生成了代理
            if (parentMeta) {
                const { self, copy } = parentMeta;
                const originalChildVal = self[key];

                // 存在 copy，则从 copy 上获取
                if (copy) {
                    currentChildVal = copy[key];
                }

                // 产生了节点替换情况（此时currentChildVal应该是从 copy 里 获取的）
                // 直接返回 currentChildVal 即可
                // 因为 currentChildVal 已经是一个全新的值，无需对它做代理
                // ori: { a: 1 },     cur: 1
                // ori: 1,            cur: { a: 1 }
                // ori: 1,            cur: 2
                // ori: { a: 1 }      cur: { a: 1 }
                if (originalChildVal !== currentChildVal) {
                    // 返回出去的值因未做代理，之后对它的取值行为不会再进入到 get 函数中
                    // todo：后续版本考虑 createDraft 加参数来控制是否为这种已替换节点也做代理
                    return currentChildVal;
                }
            }

            if (currentChildVal && isComplexDataType(currentChildVal)) {
                ensureDataNodeMetasProtoLayer(currentChildVal, metaVer);
                let meta = getMeta(currentChildVal, metaVer);

                // 惰性生成代理对象和其元数据
                if (!meta) {
                    const level = getLevel(parent, metaVer);
                    const parentMeta = getMeta(parent, metaVer);

                    meta = {
                        parent,
                        self: currentChildVal,
                        key,
                        keyPath: getKeyPath(parent, key, metaVer),
                        level,
                        proxyVal: new Proxy(currentChildVal, copyOnWriteTraps),
                    };

                    if (parentMeta && level > 0) {
                        meta.parentMeta = parentMeta;
                        meta.rootMeta = parentMeta.rootMeta;
                    }
                    setMeta(currentChildVal, meta, metaVer);
                }

                // 指向代理对象
                currentChildVal = meta.proxyVal;
            }

            const parentType = getDataNodeType(parent);
            // 用下标去数组时，可直接返回
            // 例如数组操作: arrDraft[0].xxx = 'new'， 此时 arrDraft[0] 需要操作的是代理对象
            if (parentType === carefulDataTypes.Array && canBeNum(key)) {
                return currentChildVal;
            }
            if (!!carefulType2FnKeys[parentType]) {
                return copyDataNode(parent, { parentType, op: key, key, value: '', metaVer }, true);
            }
            return currentChildVal;
        },
        set: (parent, key, value) => {
            copyDataNode(parent, { key, value, metaVer }, true);
            return true;
        },
        deleteProperty: (parent, key) => {
            copyDataNode(parent, { op: 'del', key, value: '', metaVer }, true);
            return true;
        },
    };

    return {
        _createDraft: (mayDraft, finishDraft) => {
            let baseState = mayDraft;
            if (isDraft(mayDraft)) {
                const draftMeta = getMetaForDraft(mayDraft, mayDraft[verKey]);
                baseState = draftMeta.self;
            }

            ensureDataNodeMetasProtoLayer(baseState, metaVer, true);
            let meta = getMeta(baseState, metaVer);

            if (!meta) {
                meta = { // 10项： 还有一个copy
                    parent: null,
                    self: baseState,
                    key: '',
                    keyPath: [],
                    level: 0,
                    proxyVal: null,
                    parentMeta: null,
                    finishDraft,
                    ver: metaVer,
                };
                meta.rootMeta = meta;
                setMeta(baseState, meta, metaVer);
            }

            const { proxy: proxyDraft, revoke: revokeHandler } = Proxy.revocable(baseState, copyOnWriteTraps);
            meta.proxyVal = proxyDraft;
            revoke = revokeHandler;
            return proxyDraft;
        },
        _finishDraft: (proxyDraft, options = {}) => {
            // attention: if pass a revoked proxyDraft
            // it will throw: Cannot perform 'set' on a proxy that has been revoked
            // 再次检查，以免用户是用 new Immut() 返回的 finishDraft
            // 去结束另一个 new Immut() createDraft 的 草稿对象
            if (metaVer !== proxyDraft[verKey]) {
                throw new Error('oops, the input draft does not match finishDraft handler');
            }
            const rootMeta = getMetaForDraft(proxyDraft, metaVer);
            const final = rootMeta.copy || rootMeta.self;
            // todo: 留着这个参数，解决多引用问题
            // let base = { a: { b: { c: 1 } }, b: null };
            // base.b = base.a.b;
            // let d = createDraft(base);
            // d.b.c = 888;
            // if (options.multiRef && rootMeta.copy) { **** }
            revoke && revoke();
            clearAllDataNodeMeta(metaVer);
            return final;
        },
    };
}

function createDraft(base) {
    const limuApis = buildLimuApis();
    return limuApis._createDraft(base, limuApis._finishDraft);
}

function finishDraft(draft) {
    const draftMeta = getMetaForDraft(draft, draft[verKey]);
    let finishHandler = draftMeta ? draftMeta.finishDraft : null;
    if (!finishHandler) {
        throw new Error(`opps, not an draft!`);
    }
    return finishHandler(draft);
}

function checkCb(cb) {
    if (typeof cb !== 'function') {
        throw new Error('produce callback is not a function');
    }
    if (isPromiseFn(cb)) {
        throw new Error('produce callback can not be a promise function');
    }
}

function innerProduce(baseState, cb, check = true) {
    if (check) {
        checkCb(cb);
    }
    const draft = createDraft(baseState);
    cb(draft);
    return finishDraft(draft);
}

const produce = (baseStateOrCb, cb) => {
    if (!cb) {
        checkCb(baseStateOrCb);
        return state => innerProduce(state, baseStateOrCb, false);
    }
    return innerProduce(baseState, cb);
};

export { createDraft, finishDraft, produce };
