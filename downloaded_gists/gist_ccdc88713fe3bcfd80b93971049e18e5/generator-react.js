const HTML_TAGS =
  `html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot`.split(
    ","
  );

const specialBooleanAttrs =
  `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`.split(
    ","
  );

const makeMap = (list) => {
  const map = Object.create(null);
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return (val) => !!map[val];
};

const isHTMLTag = makeMap(HTML_TAGS);
const isSpecialBooleanAttr = makeMap(specialBooleanAttrs);
const includeBooleanAttr = (value) => !!value || value === "";
const isTextElement = (element) => element.type === "text";

const resolvedPromise = Promise.resolve();
const queueMicrotask =
  window.queueMicrotask ||
  ((callback) => {
    if (typeof callback !== "function") {
      throw new TypeError("The argument to queueMicrotask must be a function.");
    }

    resolvedPromise.then(callback).catch((error) =>
      setTimeout(() => {
        throw error;
      }, 0)
    );
  });

const uniqueSet = new Set();
const queueMicrotaskOnce = (func) => {
  if (!uniqueSet.has(func)) {
    uniqueSet.add(func);
    queueMicrotask(() => {
      func();
      uniqueSet.delete(func);
    });
  }
};

let isMessageLoopRunning = false;
const scheduledCallbackQueue = [];
const performWork = () => {
  if (scheduledCallbackQueue.length) {
    try {
      const work = scheduledCallbackQueue.shift();
      work();
    } finally {
      if (scheduledCallbackQueue.length) {
        schedulePerform();
      } else {
        isMessageLoopRunning = false;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
};

const channel = new MessageChannel();
channel.port1.onmessage = performWork;
const schedulePerform = () => channel.port2.postMessage(null);

const requestCallback = (callback) => {
  scheduledCallbackQueue.push(callback);
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerform();
  }
};

function shallowEqual(object1, object2) {
  if (object1 === object2) {
    return true;
  }

  if (
    typeof object1 !== "object" ||
    typeof object2 !== "object" ||
    object1 === null ||
    object2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (object1[key] !== object2[key]) {
      return false;
    }
  }

  return true;
}

const firstNextWithProps = (generatorFunction) => {
  return (...args) => {
    const generatorObject = generatorFunction(...args);

    generatorObject.next();

    const result = {
      next: (...args) => {
        return generatorObject.next(...args);
      },
      throw: (...args) => {
        return generatorObject.throw(...args);
      },
      return: (...args) => {
        return generatorObject.return(...args);
      },
      StatusLane: NoneLane,
    };

    generatorObject.next(result);

    return result;
  };
};

const elementWalker = (element, fun) => {
  let cursor = element;
  if (!cursor.child) {
    fun(cursor);
    return;
  }

  while (true) {
    while (cursor.child) {
      cursor = cursor.child;
    }
    while (!cursor.sibling) {
      fun(cursor);
      if (cursor === element) {
        return;
      }
      cursor = cursor.return;
    }
    fun(cursor);
    if (cursor === element) {
      return;
    }
    cursor = cursor.sibling;
  }
};

const renderList = new Set();
const pushRenderElement = (generator) => {
  renderList.add(generator);
};

const getCommonRenderElement = () => {
  const elements = [...renderList.values()].map((gen) => gen.element);
  renderList.clear();

  const parentMap = new Map();
  for (const el of elements) {
    let parent = el;

    while (parent) {
      const count = (parentMap.get(parent) || 0) + 1;
      if (count === elements.length) {
        return parent;
      }
      parentMap.set(parent, count);
      parent = parent.return;
    }
  }
};

const genCursorFix = () => {
  const focusedElement = document.activeElement;
  const start = focusedElement.selectionStart;
  const end = focusedElement.selectionEnd;

  return () => {
    // 重新定位焦点, 恢复选择位置
    focusedElement.focus();
    focusedElement.selectionStart = start;
    focusedElement.selectionEnd = end;
  };
};

const forceRender = () => {
  const cursorFix = genCursorFix();

  const element = getCommonRenderElement();
  const [startComment, endComment] = getCommentRang(element._key);
  // 删除旧的注释节点
  const range = document.createRange();
  range.setStartAfter(startComment);
  range.setEndAfter(endComment);
  range.deleteContents();

  let returnStateNode;
  if (element.return) {
    returnStateNode = element.return.stateNode;
    element.return.stateNode = null;
  }

  const existKeySet = new Set();
  elementWalker(element, (el) => {
    existKeySet.add(el._key);
  });

  innerRender(element, existKeySet);

  if (element.return) {
    element.return.stateNode = returnStateNode;
  }

  startComment.parentNode.insertBefore(element.stateNode, startComment);

  startComment.remove();
  cursorFix();
};

const checkIfSnapshotChanged = ({ value, getSnapshot }) => {
  try {
    return value !== getSnapshot();
  } catch {
    return true;
  }
};

function* withStateFun(func, innerRender) {
  const self = yield;

  let StateIndex = 0;
  const hookQueue = [];
  const isHostElement = Object.values(buildIn).includes(func);

  const useState = (initialState) => {
    const innerIndex = StateIndex++;

    if (hookQueue.length <= innerIndex) {
      if (typeof initialState === "function") {
        initialState = initialState();
      }
      hookQueue[innerIndex] = initialState;
    }

    return [
      hookQueue[innerIndex],
      (newState) => {
        if (typeof newState === "function") {
          const oldState = hookQueue[innerIndex];
          newState = newState(oldState);
        }
        hookQueue[innerIndex] = newState;

        pushRenderElement(self);
        queueMicrotaskOnce(forceRender);
      },
    ];
  };

  const effects = [];
  const cleanEffects = [];
  const useEffect = (effect, deps) => {
    const innerIndex = StateIndex++;
    const oldEffect = hookQueue[innerIndex];
    hookQueue[innerIndex] = [effect, deps];

    if (deps == void 0) {
      return effects.push(effect);
    }

    if (self.StatusLane === MountedLane) {
      effects.push(effect);
      effect.mountDep = !deps.length;
    } else if (deps.length && !shallowEqual(deps, oldEffect[1])) {
      effects.push(effect);
    }
  };

  const useSyncExternalStore = (subscribe, getSnapshot) => {
    const value = getSnapshot();
    const [{ inst }, forceUpdate] = useState({
      inst: { value, getSnapshot },
    });

    useEffect(() => {
      if (checkIfSnapshotChanged(inst)) {
        forceUpdate({ inst });
      }

      return subscribe(function handleStoreChange(_cur, _pre) {
        if (checkIfSnapshotChanged(inst)) {
          forceUpdate({ inst });
        }
      });
    }, [subscribe]);

    return value;
  };

  self.flushEffects = function flushEffects() {
    while (effects.length) {
      const current = effects.shift();
      const clean = current();

      if (typeof clean === "function") {
        clean.mountDep = current.mountDep;
        cleanEffects.push(clean);
      }
    }
    self.StatusLane = UpdatedLane;
  };

  self.flushCleanEffects = function flushCleanEffects(isUnmounted) {
    const temp = [];
    while (cleanEffects.length) {
      const clean = cleanEffects.shift();
      const isUnmountClean = clean.mountDep;

      if (isUnmounted) {
        clean();
      } else {
        if (!isUnmountClean) {
          clean();
        } else {
          temp.push(clean);
        }
      }
    }

    if (isUnmounted) {
      props = void 0;
      effects.length = 0;
      cleanEffects.length = 0;
      hookQueue.length = 0;
    } else {
      cleanEffects.push(...temp);
    }
  };

  const hookMap = {
    useState,
    useEffect,
    useSyncExternalStore,
  };

  let props = void 0;
  let newProps = (yield) || {};
  let result = null;

  while (true) {
    self.flushCleanEffects();

    if (isHostElement) {
      newProps = fixProps(newProps);
    }

    StateIndex = 0;
    result = func.call(hookMap, newProps, props, hookMap);

    props = newProps;

    newProps = yield result;

    hookMap.instance = result;
  }
}

const componentCreator = firstNextWithProps(withStateFun);

const optionsModifierRE = /(?:Once|Passive|Capture)$/;
function parseName(name) {
  let options;
  if (optionsModifierRE.test(name)) {
    options = {};
    let m;
    while ((m = name.match(optionsModifierRE))) {
      name = name.slice(0, name.length - m[0].length);
      options[m[0].toLowerCase()] = true;
    }
  }
  const event = name.slice(2).toLowerCase();
  return [event, options];
}
function onCompositionStart(e) {
  e.target.composing = true;
}
function onCompositionEnd(e) {
  const target = e.target;
  if (target.composing) {
    target.composing = false;
    target.dispatchEvent(new Event("input"));
  }
}

function inputWrap(fun) {
  return function (e) {
    if (!e.target.composing) {
      fun(e);
    }
  };
}

function fixProps(oldProps) {
  const newProps = { ...oldProps };
  if ("onInput" in newProps) {
    newProps["onCompositionstart"] = onCompositionStart;
    newProps["onCompositionend"] = onCompositionEnd;
    newProps["onChange"] = onCompositionEnd;
    newProps["onInput"] = inputWrap(newProps["onInput"]);
  }
  return newProps;
}

const buildIn = {};
const genBuildInFun = function ($tag) {
  const func = function (
    props = {},
    oldProps = {},
    { instance, useState, useEffect }
  ) {
    const [invokers] = useState({});

    // console.log(`${$tag} 重用`, instance);
    const element = instance || document.createElement($tag);
    element.innerHTML = "";
    const deleteMap = { ...oldProps };

    for (const [pKey, pValue] of Object.entries(props)) {
      if (pKey.match(/^on[A-Z]/)) {
        const [eventName, options] = parseName(pKey);

        if (!invokers[pKey]) {
          invokers[pKey] = {
            raw: pValue,
            handler(event) {
              invokers[pKey].raw(event);
            },
          };

          element.addEventListener(eventName, invokers[pKey].handler, options);
        } else {
          invokers[pKey].raw = pValue;
        }

        delete deleteMap[pKey];
        continue;
      }

      delete deleteMap[pKey];
      if ((pKey === "children") | (pKey === "ref") || pKey === "key") {
        continue;
      }
      if (pValue === oldProps[pKey]) {
        continue;
      }

      const isBoolean = isSpecialBooleanAttr(pKey);

      if (pValue == null || (isBoolean && !includeBooleanAttr(pValue))) {
        element.removeAttribute(pKey);
      } else {
        element.setAttribute(pKey, isBoolean ? "" : pValue);
      }
    }

    for (const [pKey, map] of Object.entries(deleteMap)) {
      if (pKey.match(/^on[A-Z]/)) {
        const [eventName, options] = parseName(pKey);
        element.removeEventListener(eventName, map.handler, options);
      } else {
        element.removeAttribute(pKey);
      }
    }

    useEffect(
      () => () => {
        for (const [pKey, map] of Object.entries(invokers)) {
          const [eventName, options] = parseName(pKey);
          element.removeEventListener(eventName, map.handler, options);
        }
        element.remove(element);
      },
      []
    );

    return element;
  };

  Object.defineProperty(func, "name", { value: $tag });
  return func;
};

HTML_TAGS.forEach((tag) => {
  buildIn[tag] = genBuildInFun(tag);
});

buildIn.text = function text(props, oldProps, { instance, useEffect }) {
  const element = instance || document.createTextNode(props.content);
  // console.log(`text 重用`, instance);
  if (!oldProps || props.content !== oldProps.content) {
    element.data = props.content;
  }

  useEffect(
    () => () => {
      element.remove(element);
    },
    []
  );

  return element;
};

buildIn.comment = (props, oldProps) => {
  return document.createComment(props.content);
};

const Fragment = (props) => {
  return document.createDocumentFragment();
};

const getCommentRang = (key) => {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_COMMENT
  );
  const result = [];
  let comment = walker.nextNode();

  while (comment) {
    if (comment.data === "^" + key) {
      result.push(comment);
    }
    if (comment.data === key + "$") {
      result.push(comment);
      break;
    }
    comment = walker.nextNode();
  }
  return result;
};

function jsx(type, props = {}, key = null) {
  return {
    key,
    type,
    props,

    child: null,
    sibling: null,
    return: null,
    index: 0,

    stateNode: null,
    get _key() {
      const typeName =
        typeof this.type === "string" ? this.type : this.type.name;
      const pKey = this.return ? this.return._key : "";
      const cKey = this.key || `${typeName}_${this.index}`;
      return `${pKey}:${cKey}`;
    },
    get generator() {
      if (!GeneratorPool[this._key]) {
        GeneratorPool[this._key] = componentCreator(
          typeof this.type === "string" ? buildIn[this.type] : this.type,
          innerRender
        );
        GeneratorPool[this._key].element = this;
      }
      if (GeneratorPool[this._key].StatusLane & (NoneLane | UnMountedLane)) {
        GeneratorPool[this._key].StatusLane = MountedLane;
      }
      return GeneratorPool[this._key];
    },
  };
}

function beginWork(element) {
  if (!element.stateNode) {
    element.stateNode = document.createDocumentFragment();
  } else {
    console.log('%c 更新的根节点"', "color:#0f0;", element);
  }

  if (typeof element.type === "function" && element.type !== Fragment) {
    element.stateNode.appendChild(
      buildIn.comment({ content: "^" + element._key })
    );
  }
}

function finishedWork(element) {
  console.log("finishedWork", element);
  if (isTextElement(element)) {
    element.stateNode = element.generator.next(element.props).value;
  } else if (isHTMLTag(element.type) || element.type === Fragment) {
    const temp = element.generator.next(element.props).value;
    temp.appendChild(element.stateNode);
    element.stateNode = temp;
  } else {
    element.stateNode.appendChild(
      buildIn.comment({ content: element._key + "$" })
    );
  }

  if (element.type === Fragment && element.props.target) {
    element.props.target.appendChild(element.stateNode);
  } else if (element.return && element.return.stateNode) {
    element.return.stateNode.appendChild(element.stateNode);
  }
}

const toValidElement = (element) => {
  if (element && element.type) {
    return element;
  }
  if (typeof element === "string" || typeof element === "number") {
    return jsx("text", { content: element });
  }
  if (Array.isArray(element)) {
    return jsx(Fragment, { children: element.flat(5) });
  }
  return jsx("text", { content: "" });
};

function* postOrder(element) {
  beginWork(element);

  if (isTextElement(element)) {
    yield element;
  } else if (isHTMLTag(element.type) || element.type === Fragment) {
    let tempChildren = element.props.children;
    if (tempChildren) {
      if (!Array.isArray(tempChildren)) {
        tempChildren = [tempChildren];
      }

      if (tempChildren.length) {
        let index = 0;
        let prevSibling = null;

        for (const tempChild of tempChildren) {
          const child = toValidElement(tempChild);
          child.index = index;
          child.return = element;

          index = index + 1;
          if (!prevSibling) {
            element.child = child;
          } else {
            prevSibling.sibling = child;
          }
          prevSibling = child;
          yield* postOrder(child);
        }
      }
    }

    yield element;
  } else {
    const tempInnerRoot = element.generator.next(element.props).value;
    if (tempInnerRoot != null) {
      const innerRootElement = toValidElement(tempInnerRoot);
      element.child = innerRootElement;
      innerRootElement.return = element;
      innerRootElement.index = 0;

      yield* postOrder(innerRootElement);
    }

    yield element;
  }
}

const GeneratorPool = new Map();
const NoneLane = 0b000001;
const MountedLane = 0b000010;
const UpdatedLane = 0b000100;
const UnMountedLane = 0b001000;

const innerRender = (element, deleteKeySet) => {
  console.clear();
  console.log('%c innerRender"', "color:#0f0;", element);

  for (const item of postOrder(element)) {
    finishedWork(item);
    deleteKeySet.delete(item._key);
    if (item.generator.flushEffects) {
      requestCallback(item.generator.flushEffects);
    }
  }

  for (const item of deleteKeySet.keys()) {
    if (GeneratorPool[item]) {
      GeneratorPool[item].StatusLane = UnMountedLane;
      GeneratorPool[item].flushCleanEffects(true);
    }
  }

  console.log("deleteKeySet", deleteKeySet);
};

function createRoot(container) {
  const key = container.id || (Date.now() + Math.random()).toString(36);

  return {
    render(element) {
      element.key = element.key || key;

      innerRender(element, new Set());

      container.appendChild(element.stateNode);
    },
  };
}

/** 业务代码在下方 */

function Hello(props, oldProps, { useState, useEffect }) {
  const [state, setState] = useState("aimwhy");
  const [state2, setState2] = useState("tt");

  useEffect(() => {
    console.log("%c Hello Mounted", "color:#0f0;");
    return () => {
      console.log("%c Hello UnMounted", "color:#0f0;");
    };
  }, []);

  useEffect(() => {
    console.log("%c Hello Update", "color:#990;");
  });

  useEffect(() => {
    console.log("%c Hello Dep Update", "color:#990;");
  }, [window.a]);

  return jsx("div", {
    children: [
      props.children(),
      state,
      jsx("div", { children: state2 }),
      jsx("input", {
        onInput: (e) => {
          props.parentChange((v) => !v);
          setState(e.target.value);
          setState2((v) => "tt" + e.target.value.slice(-3));
        },
        value: state,
        type: "text",
      }),
    ],
  });
}

function Temp() {
  return null;
}

function World(props, oldProps, { useState, useEffect }) {
  const [state, setState] = useState("点击我");

  useEffect(() => {
    console.log("%c World Mounted", "color:#0f0;");
    return () => {
      console.log("%c World UnMounted", "color:#0f0;");
    };
  }, []);
  useEffect(() => {
    console.log("%c World Update", "color:#990;");
  });

  return jsx("div", {
    onClickOnce: (e) => {
      setState((v) => v + 2);
      e.stopPropagation();
    },
    children: [state],
  });
}

function App(props, oldProps, { useState, useEffect }) {
  const [state, setState] = useState(true);
  const [state2, setState2] = useState(true);

  useEffect(() => {
    console.log("%c App Mounted", "color:#0f0;");
    return () => {
      console.log("%c App UnMounted", "color:#0f0;");
    };
  }, []);
  useEffect(() => {
    console.log("%c App Update", "color:#990;");
  });

  return jsx("div", {
    onClick: () => {
      setState((v) => !v);
    },
    children: [
      !state
        ? jsx(
            Fragment,
            {
              children: ["Portal-aa", "Portal-bb"],
              target: document.body,
            },
            "Portal"
          )
        : "Portal Origin",

      jsx(
        Hello,
        {
          parentChange: setState2,
          id: "hello",
          children: () =>
            jsx("i", {
              children: ["i    ", state2],
            }),
        },
        "hello"
      ),

      state ? jsx(World) : "销毁后的文案",

      ["github!", null, " aimwhy"],
    ],
  });
}

createRoot(document.querySelector("#app")).render(jsx(App));
