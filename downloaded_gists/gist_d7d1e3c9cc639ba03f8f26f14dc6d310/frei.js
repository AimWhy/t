export const Fragment = (props) => props.children;
export const jsx = (type, props = {}, key = null) => ({
  key,
  type,
  props,
  $$typeof: 1,
});

const noop = (_) => _;
const isArray = (val) => Array.isArray(val);
const isString = (val) => "string" === typeof val;
const isFunction = (val) => "function" === typeof val;
const SkipEventFunc = noop;
const print = (method, ...args) => {
  1 && console[method](...args);
};
const primitiveNoEqual = (a, b) =>
  null === a || null === b || "object" !== typeof a || "object" !== typeof b;

export const objectEqual = (object1, object2, deepCheck, isInDeep) => {
  if (object1 === object2) {
    return true;
  }

  if (!isInDeep && primitiveNoEqual(object1, object2)) {
    return false;
  }

  if (object1.constructor !== object2.constructor) {
    deepCheck && deepCheck(object1, object2);
    return false;
  }

  if (isArray(object1) && object1.length !== object2.length) {
    deepCheck && deepCheck(object1, object2);
    return false;
  }

  const keys1 = Object.keys(object1);
  const keyLen1 = keys1.length;
  const keyLen2 = Object.keys(object2).length;

  if (keyLen1 !== keyLen2) {
    deepCheck && deepCheck(object1, object2);
    return false;
  }

  for (const key of keys1) {
    const o1 = object1[key];
    const o2 = object2[key];

    if (o1 !== o2) {
      if (primitiveNoEqual(o1, o2)) {
        return false;
      }
      if (!deepCheck) {
        return false;
      } else if (!objectEqual(o1, o2, deepCheck, true)) {
        deepCheck(object1, object2);
        return false;
      }
    }
  }

  return true;
};

const NoEqualMapCache = new Map();
const addNoEqualProp = (a, b) => {
  NoEqualMapCache.set(a, b);
};

const propsEqual = (props1, props2, isElement = false) => {
  if (
    null !== props1 &&
    "object" === typeof props1 &&
    NoEqualMapCache.has(props1) &&
    NoEqualMapCache.get(props1) === props2
  ) {
    print("count", "Equal Reuse Count");
    return false;
  }

  return objectEqual(props1, props2, addNoEqualProp);
};

const isSpecialBooleanAttr = (val) =>
  "allowfullscreen" === val ||
  "formnovalidate" === val ||
  "novalidate" === val ||
  "itemscope" === val ||
  "nomodule" === val ||
  "readonly" === val ||
  "ismap" === val;

const includeBooleanAttr = (value) => "" === value || !!value;

const genQueueMacrotask = (macrotaskName) => {
  let ThrottleCount = 5000;
  let isLoopRunning = false;
  const scheduledQueue = [];
  const channel = new MessageChannel();

  channel.port1.onmessage = () => {
    if (!scheduledQueue.length) {
      isLoopRunning = false;
      return;
    }

    let resetCount = ThrottleCount;
    const startTime = Date.now();
    while (scheduledQueue.length && resetCount > 0) {
      const beforeLen = scheduledQueue.length;
      const work = scheduledQueue[beforeLen - 1];
      const next = work();
      const afterLen = scheduledQueue.length;

      if (beforeLen !== afterLen) {
        // 说明执行过程中有添加进来新的 work
      }

      if (next === true) {
        // 不丢弃 (不删除尾部work, 下次执行还是它)
      } else if (isFunction(next)) {
        scheduledQueue[afterLen - 1] = next;
      } else {
        scheduledQueue.length = afterLen - 1;
      }

      resetCount--;
    }

    if (resetCount <= 0) {
      const deltaTime = Date.now() - startTime;
      if (deltaTime < 5) {
        ThrottleCount = (ThrottleCount * 1.1) >> 0;
      } else if (deltaTime > 11) {
        ThrottleCount = (ThrottleCount * 0.9) >> 0;
      }
    }

    if (scheduledQueue.length) {
      schedulePerform();
    } else {
      isLoopRunning = false;
    }
  };

  const schedulePerform = () => channel.port2.postMessage(null);

  return (task) => {
    scheduledQueue.unshift(task);

    if (!isLoopRunning) {
      isLoopRunning = true;
      schedulePerform();
    }
  };
};

const mainQueueMacrotask = genQueueMacrotask("main-macro-task");
const effectQueueMacrotask = genQueueMacrotask("effect-macro-task");

const $ElementPropsKey = Symbol.for("frei.Fiber");

/* #region 事件相关 */
const toEventName = (eventType) =>
  `on${eventType[0].toUpperCase()}${eventType.slice(1)}`;

const eventTypeMap = `click,dblclick,mousedown,mouseup,mousemove,
keydown,keyup,keypress,submit,touchstart,touchend,touchmove`
  .split(/[^a-z]+/)
  .reduce((map, eventType) => {
    const eventName = toEventName(eventType);
    map[eventType] = [`${eventName}Capture`, eventName];
    return map;
  }, {});

const collectPaths = (targetElement, container, eventType) => {
  const paths = {
    capture: [],
    bubble: [],
  };

  while (targetElement && targetElement !== container) {
    const eventNameList = eventTypeMap[eventType];
    const elementProps = targetElement[$ElementPropsKey]
      ? targetElement[$ElementPropsKey].memoizedProps
      : null;

    if (elementProps && eventNameList) {
      const [captureName, bubbleName] = eventNameList;
      if (elementProps[captureName]) {
        paths.capture.unshift(elementProps[captureName]);
      }

      if (elementProps[bubbleName]) {
        paths.bubble.push(elementProps[bubbleName]);
      }
    }
    targetElement = targetElement.parentNode;
  }

  return paths;
};

const createSyntheticEvent = (e) => {
  const syntheticEvent = e;
  const originStopPropagation = e.stopPropagation;

  syntheticEvent.__stopPropagation = false;
  syntheticEvent.stopPropagation = () => {
    syntheticEvent.__stopPropagation = true;
    if (originStopPropagation) {
      originStopPropagation();
    }
  };

  return syntheticEvent;
};

const triggerEventFlow = (paths, se) => {
  for (let i = 0; i < paths.length; i++) {
    const callback = paths[i];
    callback.call(null, se);
    if (se.__stopPropagation) {
      return;
    }
  }
};

const dispatchEvent = (container, eventType, e) => {
  const targetElement = e.target;

  if (!targetElement) {
    return console.warn("事件不存在target", e);
  }

  const { bubble, capture } = collectPaths(targetElement, container, eventType);
  const se = createSyntheticEvent(e);

  triggerEventFlow(capture, se);

  if (!se.__stopPropagation) {
    triggerEventFlow(bubble, se);
  }
};

const initEvent = (container, eventType) => {
  container.addEventListener(eventType, (e) => {
    dispatchEvent(container, eventType, e);
  });
};

const testHostSpecialAttr = (attrName) => {
  const code = attrName.charCodeAt(2);
  return attrName[0] === "o" && attrName[1] === "n" && code >= 65 && code <= 90;
};
const hostSpecialAttrSet = new Set(
  `onLoad,onBeforeunload,onUnload,onScroll,onFocus,onBlur,
  onPointerenter,onPointerleave,onInput`.split(/[^a-zA-Z]+/)
);

const onCompositionStart = (e) => {
  e.target.composing = true;
};
const onCompositionEnd = (e) => {
  if (e.target.composing) {
    e.target.composing = false;
    e.target.dispatchEvent(new Event("input"));
  }
};
const onInputFixed = (e) => {
  if (!e.target.composing) {
    eventCallback(e);
  }
};
const eventCallback = (e) => {
  const pKey = toEventName(e.type);
  const elementProps = e.target[$ElementPropsKey]
    ? e.target[$ElementPropsKey].memoizedProps
    : null;

  if (elementProps && elementProps[pKey]) {
    elementProps[pKey](e);
  }
};

const camelizePlacer = (_, c) => (c ? c.toUpperCase() : "");
const camelize = (str) => str.replace(/-(\w)/g, camelizePlacer);

const setStyle = (style, name, val) => {
  if (isArray(val)) {
    for (const v of val) {
      setStyle(style, name, v);
    }
    return;
  }

  if (val == null) {
    val = "";
  }
  if (name.startsWith("--")) {
    style.setProperty(name, val);
  } else {
    style[camelize(name)] = val;
  }
};

const domHostConfig = {
  attrMap: {
    className: "class",
    htmlFor: "for",
  },
  fixAttrName(key) {
    return domHostConfig.attrMap[key] || key;
  },
  createInstance(type) {
    return document.createElement(type);
  },
  createComment(comment) {
    return document.createComment(comment);
  },
  createText(text) {
    return document.createTextNode(text);
  },
  createFragment() {
    return document.createDocumentFragment();
  },
  toFirst(child, pReference) {
    pReference.insertBefore(
      isVNode(child) ? child.fragment() : child,
      pReference.firstChild
    );
  },
  toLast(child, pReference) {
    pReference.appendChild(isVNode(child) ? child.fragment() : child);
  },
  toBefore(node, sReference) {
    sReference.parentNode.insertBefore(
      isVNode(node) ? node.fragment() : node,
      sReference
    );
  },
  toAfter(node, sReference) {
    sReference.parentNode.insertBefore(
      isVNode(node) ? node.fragment() : node,
      sReference.nextSibling
    );
  },
  removeChildren(pNode) {
    if (isVNode(pNode)) {
      document.createElement("div").appendChild(pNode.fragment(false));
    } else {
      while (pNode.firstChild) {
        pNode.removeChild(pNode.firstChild);
      }
    }
  },
  removeNode(node) {
    if (isVNode(node)) {
      document.createElement("div").appendChild(node.fragment());
    } else {
      node.parentNode.removeChild(node);
    }
  },
  commitTextUpdate(node, content) {
    node.nodeValue = content;
  },
  commitInstanceUpdate(node, attrArr) {
    for (let i = 0; i < attrArr.length; i = i + 2) {
      const pKey = attrArr[i];
      const pValue = attrArr[i + 1];

      if (pValue === SkipEventFunc) {
        continue;
      }

      if (hostSpecialAttrSet.has(pKey)) {
        domHostConfig.fixHostSpecial(node, pKey, pValue);
        continue;
      }

      const attrName = domHostConfig.fixAttrName(pKey);
      if (pValue === void 0) {
        node.removeAttribute(attrName);
      } else if (attrName === "style") {
        if (isString(pValue)) {
          node.style.cssText = pValue;
        } else {
          for (const key in pValue) {
            setStyle(node.style, key, pValue[key]);
          }
        }
      } else {
        node.setAttribute(attrName, pValue);
      }
    }
  },
  fixHostSpecial(node, eventName, callback) {
    const eventType = eventName.slice(2).toLowerCase();
    const method =
      callback === void 0 ? "removeEventListener" : "addEventListener";

    if (eventType === "input") {
      node[method]("compositionstart", onCompositionStart);
      node[method]("compositionend", onCompositionEnd);
      node[method]("change", onCompositionEnd);
      node[method]("input", onInputFixed);
    } else {
      node[method](eventType, eventCallback);
    }
  },
  updateInstanceProps(node, fiber) {
    node[$ElementPropsKey] = fiber;
  },
  genRestoreDataFn() {
    const focusedElement = document.activeElement;
    const start = focusedElement.selectionStart;
    const end = focusedElement.selectionEnd;

    // 重新定位焦点, 恢复选择位置
    return () => {
      if (focusedElement.isConnected) {
        focusedElement.focus();
        focusedElement.selectionStart = start;
        focusedElement.selectionEnd = end;
      }
    };
  },
};

const isVNode = (node) => node instanceof VNode;

class VNode {
  constructor(key) {
    this.fg = domHostConfig.createFragment();
    this.startNode = domHostConfig.createComment(`start:${key}`);
    this.endNode = domHostConfig.createComment(`end:${key}`);
  }
  fragment(hasEdge = true) {
    if (this.startNode.isConnected) {
      while (this.startNode.nextSibling !== this.endNode) {
        this.fg.appendChild(this.startNode.nextSibling);
      }
    }
    if (hasEdge) {
      this.fg.appendChild(this.endNode);
      this.fg.insertBefore(this.startNode, this.fg.firstChild);
    }
    return this.fg;
  }
}

const hostConfig = domHostConfig;

let workInProgress = null;
export const useFiber = (isInitHook) => {
  if (isInitHook && !workInProgress.hookQueue) {
    workInProgress.hookQueue = [];
  }
  return workInProgress;
};

const genComponentInnerElement = (fiber) => {
  let result = null;
  const preFiber = workInProgress;

  try {
    fiber.__StateIndex = 0;
    workInProgress = fiber;
    result = fiber.type(fiber.pendingProps);
  } finally {
    workInProgress = preFiber;
  }

  return result;
};

export const useReducer = (reducer, initialState) => {
  const fiber = useFiber(true);
  const innerIndex = fiber.__StateIndex++;
  const { hookQueue } = fiber;

  if (hookQueue.length <= innerIndex) {
    const state = isFunction(initialState) ? initialState() : initialState;

    // 协调阶段，其他事件修改了state，需要排队到下一个时间循环
    const dispatch = (action) => {
      fiber.updateQueue ||= [];
      fiber.updateQueue.push(() => {
        const newState = reducer(hookQueue[innerIndex].state, action);
        hookQueue[innerIndex].state = newState;
      });
      fiber.rerender();
    };

    hookQueue[innerIndex] = { state, dispatch };
  }

  return [hookQueue[innerIndex].state, hookQueue[innerIndex].dispatch];
};

export const useRef = (initialValue) => {
  const fiber = useFiber(true);
  const innerIndex = fiber.__StateIndex++;
  const { hookQueue } = fiber;

  if (hookQueue.length <= innerIndex) {
    hookQueue[innerIndex] = { current: initialValue };
  }

  return hookQueue[innerIndex];
};

export const useState = (initialState) => {
  return useReducer((state, newStateOrAction) => {
    return isFunction(newStateOrAction)
      ? newStateOrAction(state)
      : newStateOrAction;
  }, initialState);
};

export const createContext = (initialState) => {
  return {
    Provider: (props) => {
      const fiber = useFiber();
      const { value, children } = props;

      if (value === void 0) {
        fiber.pendingProps.value = initialState;
      }

      fiber.memoizedState ||= new Set();
      fiber.memoizedState.forEach((f) => f.rerender());
      fiber.memoizedState.clear();

      return children;
    },
  };
};

export const useContext = (context) => {
  const fiber = useFiber();
  const checkProvider = (f) => f.type === context.Provider;
  const providerFiber = findParentFiber(fiber, checkProvider);
  providerFiber.memoizedState.add(fiber);

  return providerFiber.pendingProps.value;
};

export const useEffect = (func, dep) => {
  const fiber = useFiber(true);
  const innerIndex = fiber.__StateIndex++;
  const { hookQueue } = fiber;

  if (hookQueue.length <= innerIndex) {
    if (!fiber.onMounted) {
      Fiber.initLifecycle(fiber);
    }

    if (isArray(dep)) {
      if (!dep.length) {
        fiber.onMounted.add(func);
      } else {
        fiber.onUpdated.add(func);
      }
    } else if (Number.isNaN(dep)) {
      fiber.onBeforeMove.add(func);
    } else {
      fiber.onUpdated.add(func);
    }
    hookQueue[innerIndex] = { func, dep };
  } else {
    const { dep: oldDep, func: oldFunc } = hookQueue[innerIndex];
    if (isArray(dep) && isArray(oldDep) && dep.length && oldDep.length) {
      fiber.onUpdated.delete(oldFunc);

      if (!objectEqual(oldDep, dep)) {
        hookQueue[innerIndex] = { func, dep };
        fiber.onUpdated.add(func);
      }
    }
  }
};

export const useMemo = (func, dep) => {
  const fiber = useFiber(true);
  const innerIndex = fiber.__StateIndex++;
  const { hookQueue } = fiber;

  if (hookQueue.length <= innerIndex) {
    const value = func();
    hookQueue[innerIndex] = { value, dep };
  } else {
    const { dep: oldDep, value: oldValue } = hookQueue[innerIndex];
    const value = !objectEqual(oldDep, dep) ? func() : oldValue;
    hookQueue[innerIndex] = { value, dep };
  }
  return hookQueue[innerIndex].value;
};

export const useCallback = (func, deps) => {
  return useMemo(() => func, deps);
};

const checkIfSnapshotChanged = ({ value, getSnapshot }) => {
  try {
    return value !== getSnapshot();
  } catch {
    return true;
  }
};
export const useSyncExternalStore = (subscribe, getSnapshot) => {
  const value = getSnapshot();
  const [{ inst }, forceUpdate] = useState({
    inst: { value, getSnapshot },
  });

  useEffect(() => {
    if (checkIfSnapshotChanged(inst)) {
      forceUpdate({ inst });
    }

    return subscribe(() => {
      if (checkIfSnapshotChanged(inst)) {
        forceUpdate({ inst });
      }
    });
  }, [subscribe]);

  return value;
};

const nextHookMap = {
  onBeforeMove: "onMoved",
  onMounted: "onUnMounted",
  onUpdated: "onBeforeUpdate",
};

const runner = (fiber, hookName) => {
  if (hookName === "onMounted") {
    markUnMountEffect(fiber, LifecycleFlag);
  }
  for (const hook of fiber[hookName]) {
    const destroy = hook(fiber);

    if (isFunction(destroy) && hookName in nextHookMap) {
      const cleanName = nextHookMap[hookName];
      if (fiber[cleanName]) {
        const destroyOnce = () => {
          destroy();
          fiber[cleanName].delete(destroyOnce);
        };
        fiber[cleanName].add(destroyOnce);
      }
    }
  }
};

const dispatchHook = (fiber, hookName, async) => {
  if (fiber[hookName] && fiber[hookName].size) {
    if (async) {
      effectQueueMacrotask(() => runner(fiber, hookName));
    } else {
      runner(fiber, hookName);
    }
  }
};

const toElement = (item) => {
  const itemType = typeof item;
  if (item && item.$$typeof) {
    return item;
  } else if ("string" === itemType || "number" === itemType) {
    return jsx("text", { content: item });
  } else if (isArray(item)) {
    return jsx(Fragment, { children: item });
  } else {
    return jsx("text", { content: "" });
  }
};

const NoFlags = 0 << 0;
const MountFlag = 1 << 0;
const MovedFlag = 1 << 1;
const PortalMovedFlag = 1 << 2;
const UpdateFlag = 1 << 3;
const ChildDeletion = 1 << 4;
const RefFlag = 1 << 5; // 更新 & 卸载副作用
const LifecycleFlag = 1 << 6; // 卸载副作用
const UnmountFlag = 1 << 7; // 卸载标记

const markUnMount = (fiber) => void (fiber.flags |= UnmountFlag);
const isMarkUnMount = (fiber) => fiber.flags & UnmountFlag;
const markUpdate = (fiber) => void (fiber.flags |= UpdateFlag);
const isMarkUpdate = (fiber) => fiber.flags & UpdateFlag;
const markMount = (fiber) => void (fiber.flags |= MountFlag);
const isMarkMount = (fiber) => fiber.flags & MountFlag;
const markMoved = (fiber) => void (fiber.flags |= MovedFlag);
const markPortalMoved = (fiber) => void (fiber.flags |= PortalMovedFlag);
const unMarkMoved = (fiber) => void (fiber.flags &= ~MovedFlag);
const isMarkMoved = (fiber) => fiber.flags & (MovedFlag | PortalMovedFlag);
const markChildDeletion = (fiber) => void (fiber.flags |= ChildDeletion);
const isMarkChildDeletion = (fiber) => fiber.flags & ChildDeletion;
const markRef = (fiber) => void (fiber.flags |= RefFlag);
const isMarkRef = (fiber) => fiber.flags & RefFlag;

const EmptyProps = {};

class Fiber {
  ref = null;
  key = null;
  type = null;
  relationKey = "";
  pendingProps = EmptyProps;
  memoizedProps = EmptyProps;
  memoizedState = null;
  updateQueue = null;
  __StateIndex = 0;

  index = -1;
  oldIndex = -1;
  childrenCount = 0;
  stateNode = null;
  __skipSelf = false;
  __skipToLast = false;
  __deletion = null;
  __preReferFiber = null;

  child = null;
  return = null;
  sibling = null;

  needRender = true;
  flags = MountFlag;
  effectFlag = NoFlags;
  subTreeEffectFlag = NoFlags;

  isHostText = false;
  isHostComponent = false;
  isFunctionComponent = false;

  get absoluteKey() {
    return `${this.return ? this.return.absoluteKey : ""}^${this.relationKey}`;
  }

  get portalTarget() {
    return this.pendingProps.$target;
  }

  get isStatic() {
    return this.pendingProps.$static;
  }

  get normalChildren() {
    if (this.isHostText) {
      return null;
    }

    const tempChildren = this.isHostComponent
      ? this.pendingProps.children
      : genComponentInnerElement(this);

    if (tempChildren == null) {
      return null;
    } else if (isArray(tempChildren)) {
      const len = tempChildren.length;
      const result = Array(len);
      for (let i = 0; i < len; i++) {
        result[i] = toElement(tempChildren[i]);
      }
      return result;
    } else {
      return [toElement(tempChildren)];
    }
  }

  constructor(type, content) {
    this.type = type;

    if (this.type === "text") {
      this.isHostText = true;
      this.stateNode = hostConfig.createText(content);
    } else if (isString(this.type)) {
      this.isHostComponent = true;
      this.stateNode = hostConfig.createInstance(this.type);

      // 常规元素，添加 $ElementPropsKey 属性指向 fiber, 用于事件委托 和 调试
      hostConfig.updateInstanceProps(this.stateNode, this);
    } else {
      this.isFunctionComponent = true;
      this.stateNode = new VNode(this.type.name);
    }
  }

  rerender() {
    // 同步执行中添加多次，只向渲染 mainQueueMacrotask 队列中添加一条
    const fiber = this;
    if (!fiber.lock) {
      fiber.lock = true;

      mainQueueMacrotask(() => {
        fiber.lock = false;
        const destroyFiber = findParentFiber(fiber, isMarkUnMount);
        if (destroyFiber) {
          return;
        }

        // 执行更新队列
        if (fiber.updateQueue) {
          fiber.updateQueue.forEach((fn) => fn());
          fiber.updateQueue.length = 0;
        }

        // 设置更新标记
        fiber.needRender = true;
        markUpdate(fiber);

        // 深度遍历执行
        return innerRender.bind(null, {
          MutationQueue: [],
          gen: genFiberTree2(fiber),
          restoreDataFn: hostConfig.genRestoreDataFn(),
        });
      });
    }
  }

  unMount(cleanEffect) {
    let cursor = this.child;
    while (cursor) {
      const hasEffect = !cursor.isHostText && !!(cursor.effectFlag || cursor.subTreeEffectFlag);
      if (hasEffect) {
        cursor.unMount(!!cursor.effectFlag);
      }
      cursor = cursor.sibling;
    }

    if (cleanEffect) {
      if (this.effectFlag & LifecycleFlag) {
        if (this.hookQueue) {
          this.hookQueue.length = 0;
        }
        dispatchHook(this, "onUnMounted");
      }

      if (this.effectFlag & RefFlag) {
        this.ref && this.ref(null);
      }
    }

    // fiber.oldIndex = -1;
    // fiber.flags = NoFlags;
    // fiber.needRender = true;
    // fiber.child = fiber.sibling = fiber.return = null;
    // fiber.__skipSelf = this.__skipToLast = false;
    // fiber.__preReferFiber = fiber.__deletion = null;

    this.effectFlag = this.subTreeEffectFlag = NoFlags;
    markUnMount(this);
    print("count", "Fiber unMount: ");
  }
}

Fiber.genRelationKey = (element, index) =>
  `${isString(element.type) ? element.type : element.type.name}#${element.key != null ? element.key : index
  }`;

Fiber.isCanReuse = (fiber, children, i) =>
  children[i] &&
  fiber.type === children[i].type &&
  (fiber.key != null ? fiber.key == children[i].key : fiber.index === i);

Fiber.initLifecycle = (fiber) => {
  fiber.onMounted = new Set();
  fiber.onUnMounted = new Set();
  fiber.onUpdated = new Set();
  fiber.onBeforeUpdate = new Set();
  fiber.onBeforeMove = new Set();
  fiber.onMoved = new Set();
};

const createFiber = (element, relationKey, oldFiber) => {
  let fiber = oldFiber;

  if (fiber) {
    fiber.__skipSelf = false;
    fiber.__skipToLast = false;
    fiber.__deletion = null;
    fiber.__preReferFiber = null;

    fiber.return = null;
    fiber.sibling = null;
  } else {
    fiber = new Fiber(element.type, element.props.content);
  }

  fiber.key = element.key;
  fiber.relationKey = relationKey;
  fiber.pendingProps = element.props;
  if (oldFiber && fiber.pendingProps.$static === true) {
    fiber.needRender = false;
  } else {
    fiber.needRender = finishedWork(fiber, !oldFiber);
  }

  return fiber;
};

const findParentFiber = (fiber, checker) => {
  let current = fiber.return;
  while (current) {
    if (checker(current)) {
      return current;
    }
    current = current.return;
  }
};

const findIndex = (increasing, currentIndex) => {
  let i = 0;
  let mid;
  let j = increasing.length;

  // 如果是仅更新未移动，则可快速定位
  if (j === 0 || increasing[j - 1] < currentIndex) {
    return j;
  }

  while (i < j) {
    mid = Math.floor((i + j) / 2);
    if (increasing[mid] < currentIndex) {
      i = mid + 1;
    } else {
      j = mid;
    }
  }
  return i;
};

const isSkipFiber = (f) => !f.needRender && f.flags === NoFlags;

const fillFiberKeyMap = (fiberKeyMap, fiberArray, startIndex, children) => {
  for (let i = startIndex; i < fiberArray.length; i++) {
    const newNodeKey = Fiber.genRelationKey(children[i], i);
    fiberArray[i] = newNodeKey;
    fiberKeyMap.set(newNodeKey, i);
  }
};

const beginWork = (returnFiber) => {
  if (!returnFiber.needRender) {
    return returnFiber.child;
  }

  let startIndex = 0;
  let oldCursor = returnFiber.child;
  const children = returnFiber.normalChildren;
  const childLength = children ? children.length : 0;
  const newFiberArr = childLength ? Array(childLength) : null;

  if (childLength) {
    let j = 0;
    let maxCount = 0;
    const indexCount = [];
    const increasing = [];
    const deletionArr = [];
    const reuseFiberArr = [];

    let isFromMap = false;
    let newKeyToIndex = null;


    while (oldCursor) {
      let index = -1;
      if (!isFromMap) {
        if (Fiber.isCanReuse(oldCursor, children, startIndex)) {
          index = startIndex;
          startIndex++;
        } else {
          isFromMap = true;
          newKeyToIndex = new Map();
          fillFiberKeyMap(newKeyToIndex, newFiberArr, startIndex, children);
          startIndex = childLength;
        }
      }

      if (isFromMap) {
        index = newKeyToIndex.has(oldCursor.relationKey)
          ? newKeyToIndex.get(oldCursor.relationKey)
          : -1;
      }

      if (index > -1) {
        newFiberArr[index] = oldCursor;

        // 最长的递归复用新索引序列
        markMoved(oldCursor)
        const _i = findIndex(increasing, index);
        indexCount[j] = _i === increasing.length ? _i : _i + 1;
        increasing[_i] = index;
        maxCount = Math.max(maxCount, indexCount[j]);
        reuseFiberArr[j++] = oldCursor
      } else {
        deletionArr.push(oldCursor);
      }

      oldCursor = oldCursor.sibling;
    }

    while (maxCount > 0 && j--) {
      if (indexCount[j] === maxCount) {
        unMarkMoved(reuseFiberArr[j])
        maxCount--;
      }
    }

    returnFiber.__deletion = deletionArr.length ? deletionArr : null;
  } else {
    // 移除所有子节点 => 此时不为数组、而是指向旧的第一个子节点
    returnFiber.__deletion = oldCursor;
  }

  if (returnFiber.__deletion) {
    markChildDeletion(returnFiber);
  }

  // 新节点数比旧节点数多，则填充后续新节点的 relationKey
  for (let index = startIndex; index < childLength; index++) {
    const newNodeKey = Fiber.genRelationKey(children[index], index);
    newFiberArr[index] = newNodeKey;
  }

  returnFiber.child = null;
  returnFiber.childrenCount = childLength;

  let preFiber = null;
  let preNoPortalFiber = null;
  for (let index = 0; index < childLength; index++) {
    const fiberOrKey = newFiberArr[index];
    const isKey = isString(fiberOrKey);
    const relationKey = isKey ? fiberOrKey : fiberOrKey.relationKey;
    const oldFiber = isKey ? null : fiberOrKey;
    const fiber = createFiber(children[index], relationKey, oldFiber);

    fiber.oldIndex = fiber.index;
    fiber.index = index;
    fiber.return = returnFiber;

    if (index === 0) {
      returnFiber.child = fiber;
    } else {
      preFiber.sibling = fiber;
    }

    if (fiber.oldIndex === -1) {
      markMount(fiber);
    }

    if (!!fiber.memoizedProps.$target ^ !!fiber.portalTarget) {
      markPortalMoved(fiber);
    }

    // 只考虑在 returnFiber 内部是否可以跳过
    if (isSkipFiber(fiber)) {
      fiber.__skipSelf = true;
      // fiber.__skipToLast = !fiber.sibling || fiber.sibling.__skipToLast;
    }

    fiber.__preReferFiber = preNoPortalFiber;
    fiber.memoizedProps = fiber.pendingProps;

    preFiber = fiber;
    if (!fiber.portalTarget) {
      preNoPortalFiber = fiber;
    }
  }

  return returnFiber.child;
};

const markUnMountEffect = (fiber, flag) => {
  fiber.effectFlag |= flag;
  findParentFiber(fiber, (f) => {
    f.subTreeEffectFlag |= flag;
  });
};

const finishedWork = (fiber, isMount) => {
  const oldProps = fiber.memoizedProps;
  const newProps = fiber.pendingProps;

  // print("count", "Generator B");

  if (fiber.isHostText) {
    if (!oldProps || newProps.content !== oldProps.content) {
      fiber.memoizedState = newProps.content;
      markUpdate(fiber);
      return true;
    }
    return false;
  }

  const oldRef = oldProps.ref;
  const newRef = newProps.ref;

  if (oldRef !== newRef) {
    fiber.ref = (instance) => {
      if (isFunction(oldRef)) {
        oldRef(null);
      } else if (oldRef && "current" in oldRef) {
        oldRef.current = null;
      }

      if (isFunction(newRef)) {
        newRef(instance);
        markUnMountEffect(fiber, RefFlag);
      } else if (newRef && "current" in newRef) {
        newRef.current = instance;
      }
    };
    markRef(fiber);
  }

  if (fiber.isHostComponent) {
    const unionProps =
      oldProps === EmptyProps ? newProps : { ...oldProps, ...newProps };
    const result = [];

    for (const pKey in unionProps) {
      if (pKey === "children" || pKey === "ref" || pKey[0] === "$") {
        continue;
      }

      let newValue = newProps[pKey];
      let oldValue = oldProps[pKey];

      if (testHostSpecialAttr(pKey)) {
        const isFun = isFunction(newValue);

        if (isFun ^ isFunction(oldValue)) {
          if (isFun) {
            result.push(
              pKey,
              hostSpecialAttrSet.has(pKey) ? newValue : SkipEventFunc
            );
          } else {
            result.push(pKey, void 0);
          }
        }
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(newProps, pKey)) {
        if (oldValue !== void 0) {
          result.push(pKey, void 0);
        }
        continue;
      }

      const isBooleanAttr = isSpecialBooleanAttr(pKey);
      if (
        newValue == null ||
        (isBooleanAttr && !includeBooleanAttr(newValue))
      ) {
        newValue = void 0;
      } else {
        newValue = isBooleanAttr ? "" : newValue;
      }

      if (!Object.prototype.hasOwnProperty.call(oldProps, pKey)) {
        result.push(pKey, newValue);
      } else {
        if (!objectEqual(newValue, oldValue, noop)) {
          result.push(pKey, newValue);
        }
      }
    }

    fiber.memoizedState = result;
    if (isMount || fiber.memoizedState.length) {
      markUpdate(fiber);
    }

    return isMount || !propsEqual(oldProps.children, newProps.children, true);
  }

  if (isMount || !propsEqual(oldProps, newProps)) {
    markUpdate(fiber);
    return true;
  }

  return false;
};

function* genFiberTree2(returnFiber) {
  beginWork(returnFiber);
  const queue = [returnFiber];
  let current = returnFiber.child;

  while (queue.length > 0) {
    // print("count", "Generator A");

    if (!current || current.__skipToLast) {
      current = queue.pop();
      yield current;
      current = current.sibling;
    } else if (current.__skipSelf) {
      current = current.sibling;
    } else if (current.isHostText || !current.needRender) {
      yield current;
      current = current.sibling;
    } else {
      beginWork(current);
      queue.push(current);
      current = current.child;
    }
  }
}

const placementFiber = (fiber, isMount) => {
  const parentFiber = fiber.return;

  if (!parentFiber) {
    return;
  }

  // 它是一个 portal: 用带有 $target 指向的 stateNode
  if (!!fiber.portalTarget) {
    hostConfig.toLast(fiber.stateNode, fiber.portalTarget);
    return;
  }

  const isMountInsert = isMarkMount(parentFiber);
  const isVNodeParent = parentFiber.isFunctionComponent;

  if (isMountInsert) {
    hostConfig.toLast(
      fiber.stateNode,
      isVNodeParent
        ? parentFiber.stateNode.fragment(false)
        : parentFiber.stateNode
    );
    return;
  }

  if (fiber.__preReferFiber) {
    hostConfig.toAfter(
      fiber.stateNode,
      fiber.__preReferFiber.isFunctionComponent
        ? fiber.__preReferFiber.stateNode.endNode
        : fiber.__preReferFiber.stateNode
    );
    return;
  }

  if (isVNodeParent) {
    hostConfig.toAfter(fiber.stateNode, parentFiber.stateNode.startNode);
  } else {
    hostConfig.toFirst(fiber.stateNode, parentFiber.stateNode);
  }
};

const updateHostFiber = (fiber) => {
  if (fiber.isHostText) {
    hostConfig.commitTextUpdate(fiber.stateNode, fiber.memoizedState);
  } else {
    hostConfig.commitInstanceUpdate(fiber.stateNode, fiber.memoizedState);
  }
};

const childDeletionFiber = (returnFiber) => {
  if (isArray(returnFiber.__deletion)) {
    for (const fiber of returnFiber.__deletion) {
      hostConfig.removeNode(fiber.stateNode);
      fiber.unMount(true);
    }
  } else {
    // 删除 旧returnFiber 的所有子节点，__deletion 指向 旧的.child
    hostConfig.removeChildren(returnFiber.stateNode);

    let current = returnFiber.__deletion;
    while (current) {
      current.unMount(true);
      current = current.sibling;
    }
  }
  returnFiber.__deletion = null;
};

const commitRoot = (renderContext) => {
  print("log", "MutationQueue Count: " + renderContext.MutationQueue.length);

  for (const fiber of renderContext.MutationQueue) {
    if (!fiber.isFunctionComponent) {
      if (isMarkChildDeletion(fiber)) {
        childDeletionFiber(fiber);
      }
      if (isMarkUpdate(fiber)) {
        updateHostFiber(fiber);
      }
      if (isMarkMount(fiber)) {
        placementFiber(fiber, true);
      }
      if (isMarkMoved(fiber)) {
        placementFiber(fiber, false);
      }
      if (isMarkRef(fiber)) {
        fiber.ref(fiber.stateNode);
      }
    } else {
      if (isMarkChildDeletion(fiber)) {
        childDeletionFiber(fiber);
      }
      if (isMarkMount(fiber)) {
        placementFiber(fiber, true);
        dispatchHook(fiber, "onMounted", true);
      }
      if (isMarkUpdate(fiber)) {
        if (!isMarkMount(fiber)) {
          dispatchHook(fiber, "onBeforeUpdate");
        }
        dispatchHook(fiber, "onUpdated", true);
      }
      if (isMarkMoved(fiber)) {
        placementFiber(fiber, false);
        dispatchHook(fiber, "onBeforeMove");
        dispatchHook(fiber, "onMoved", true);
      }
      if (isMarkRef(fiber)) {
        fiber.ref(fiber);
      }
    }

    fiber.flags = NoFlags;
  }
};

const toCommit = (renderContext) => {
  commitRoot(renderContext);

  if (renderContext.restoreDataFn) {
    renderContext.restoreDataFn();
  }
};

const innerRender = (renderContext) => {
  const obj = renderContext.gen.next();
  const current = obj.value;

  if (obj.done) {
    NoEqualMapCache.clear();
    return toCommit.bind(null, renderContext);
  }

  print("count", "Generator Fiber Count");

  current.needRender = false;
  if (current.flags !== NoFlags) {
    renderContext.MutationQueue.push(current);
  }

  return true;
};

export const createRoot = (container) => {
  const fiberType = container.tagName.toLowerCase();
  const fiberNodeKey = `${fiberType}#${container.id || (Date.now() + Math.random()).toString(36)
    }`;

  Object.keys(eventTypeMap).forEach((eventType) =>
    initEvent(container, eventType)
  );

  return {
    render(jsx) {
      const rootFiber = createFiber(
        { type: fiberType, props: { children: jsx } },
        fiberNodeKey
      );

      rootFiber.stateNode = container;
      container.__rootFiber = rootFiber;
      rootFiber.rerender();
    },
  };
};
