const HTML_TAGS =
  "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot".split(
    ","
  );
const VOID_TAGS =
  "area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr".split(
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
const isVoidTag = makeMap(VOID_TAGS);
const isSpecialBooleanAttr = makeMap(specialBooleanAttrs);
const includeBooleanAttr = (value) => !!value || value === "";

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
let scheduledCallbackQueue = [];
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
    };

    generatorObject.next(result);

    return result;
  };
};

function* withStateFun(func) {
  const memoizedState = new Map();

  const generator = yield;

  const useState = (key, val) => {
    if (!memoizedState.has(key)) {
      memoizedState.set(key, val);
    }

    return [
      memoizedState.get(key),
      (newVal) => {
        if (typeof newVal === "function") {
          const oldVal = memoizedState.get(key);
          memoizedState.set(key, newVal(oldVal));
        } else {
          memoizedState.set(key, newVal);
        }

        queueMicrotaskOnce(generator.next);
      },
    ];
  };

  const effects = [];
  const cleanEffects = [];
  const useEffect = (effect) => {
    effects.push(effect);
  };

  const flushEffects = () => {
    while (effects.length) {
      const current = effects.shift();
      const clean = current();

      if (typeof clean === "function") {
        cleanEffects.push(clean);
      }
    }
  };

  const flushCleanEffects = () => {
    while (cleanEffects.length) {
      const clean = cleanEffects.shift();
      clean();
    }
  };

  const hookMap = {
    useState,
    useEffect,
  };

  // first next cursor
  let props = (yield) || {};

  while (true) {
    flushCleanEffects();

    const result = func.call(hookMap, props, hookMap);

    requestCallback(flushEffects);

    const newProps = yield result;

    if (newProps != void 0) {
      props = newProps;
    }
  }
}

const componentCreator = firstNextWithProps(withStateFun);

const buildIn = {};
const genBuildInFun = function ($tag) {
  return function (props = {}) {
    const element = document.createElement($tag);

    for (let key in props) {
      const value = props[key];
      const isBoolean = isSpecialBooleanAttr(key);

      if (value == null || (isBoolean && !includeBooleanAttr(value))) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, isBoolean ? "" : value);
      }
    }

    return element;
  };
};
HTML_TAGS.forEach((tag) => {
  buildIn[tag] = genBuildInFun(tag);
});

window.abc = componentCreator(function ABC(props, { useState, useEffect }) {
  const [state1, setState1] = useState("key1", "1");
  const [state2, setState2] = useState("key2", "2");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setState1((old) => old + "1");
      setState2((old) => old + "2");
    }, 1000);

    return () => {
      window.clearTimeout(id);
    };
  });

  const result = `${props} | ${state1} -> ${state2}`;
  console.log(result);
  return result;
});

window.xyz = componentCreator(function XYZ(props, { useState, useEffect }) {
  const [state1, setState1] = useState("key1", "x");
  const [state2, setState2] = useState("key2", "y");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setState1((old) => old + "x");
      setState2((old) => old + "y");
    }, 1000);

    return () => {
      window.clearTimeout(id);
    };
  });

  const result = `${props} | ${state1} -> ${state2}`;
  console.log(result);
  return result;
});

window.p = componentCreator(buildIn.p);

window.abc.next("Props");

window.xyz.next("XYZ");

p.next({ class: "www" });

<p>
  <ABC>
    <i></i>
    <XYZ></XYZ>
  </ABC>
  <div></div>
</p>;

function* postOrder(element) {
  if (Array.isArray(element.props.children)) {
    for (let child of element.props.children) {
      yield* postOrder(child);
    }
  }

  yield element;
}
for (let el of postOrder(root)) {
  console.log(el);
}
