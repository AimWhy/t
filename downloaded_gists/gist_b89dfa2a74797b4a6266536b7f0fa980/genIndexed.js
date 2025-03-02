const UNTERMINATED = 0;
const TERMINATED = 1;
const ERRORED = 2;

const createCacheNode = () => ({
  state: UNTERMINATED,
  value: void 0,
  likeValue: [],
  reference: null,
  primitive: null,
});

const cache = (rootData, isLike) => {
  const RootMap = new WeakMap();
  let isCollecting = true;

  return {
    collect(...args) {
      let cacheNode;
      const fnNode = RootMap.get(rootData);
      const len = args.length - 1;

      if (fnNode === void 0) {
        cacheNode = createCacheNode();
        RootMap.set(rootData, cacheNode);
      } else {
        cacheNode = fnNode;
      }

      for (let i = 0; i < len; i++) {
        const arg = args[i];
        let nodeMap;

        if (typeof arg === 'function' || (arg && typeof arg === 'object')) {
          nodeMap = cacheNode.reference =
            cacheNode.reference !== null ? cacheNode.reference : new WeakMap();
        } else {
          nodeMap = cacheNode.primitive =
            cacheNode.primitive !== null ? cacheNode.primitive : new Map();
        }

        cacheNode = nodeMap.get(arg);

        if (cacheNode === void 0) {
          cacheNode = createCacheNode();
          nodeMap.set(arg, cacheNode);
        }
        if (isLike && isCollecting && i !== len - 1) {
          cacheNode.likeValue.push(args[len]);
        }
      }

      if (!isCollecting) {
        if (cacheNode.state === TERMINATED) {
          return args[len] ? cacheNode.likeValue : cacheNode.value;
        }
        if (cacheNode.state === ERRORED) {
          throw args[len] ? cacheNode.likeValue : cacheNode.value;
        }
        return args[len] ? cacheNode.likeValue : cacheNode.value;
      }

      try {
        const result = args[len];
        const terminatedNode = cacheNode;
        terminatedNode.state = TERMINATED;
        terminatedNode.value = result;
        if (isLike) {
          terminatedNode.likeValue.push(result);
        }
        return result;
      } catch (error) {
        const erroredNode = cacheNode;
        erroredNode.state = ERRORED;
        erroredNode.value = error;
        if (isLike) {
          erroredNode.likeValue.push(error);
        }
        throw error;
      }
    },
    complete() {
      isCollecting = false;
    },
  };
};

const genIndexed = (list, ...genIndexFnList) => {
  const cacheInfo = cache(list, true);

  for (let i = 0; i < list.length; i++) {
    for (const genIndexFn of genIndexFnList) {
      const indexed = genIndexFn(list[i], i, list);
      cacheInfo.collect(...String(indexed), list[i]);
    }
  }

  cacheInfo.complete();

  Object.defineProperty(list, 'get', {
    value: (...args) => {
      const params = typeof args[args.length - 1] === 'boolean' ? args : [...args, false];
      return cacheInfo.collect(...params);
    },
  });

  return list;
};

const result = genIndexed(
  [{ a: 'a1' }, { a: 'a2' }, { a: 'a3' }],
  (item) => item.a,
  (item) => 'b' + item.a
);
