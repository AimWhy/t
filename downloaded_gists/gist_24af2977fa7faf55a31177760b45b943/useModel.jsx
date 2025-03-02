import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import isEqual from 'fast-deep-equal';

const Context = React.createContext(null);

class Dispatcher {
  constructor() {
    this.callbacks = {};
    this.data = {};
    this.update = (namespace) => {
      if (this.callbacks[namespace]) {
        this.callbacks[namespace].forEach((cb) => {
          try {
            const data = this.data[namespace];
            cb(data);
          } catch (e) {
            cb(void 0);
          }
        });
      }
    };
  }
}

function Executor(props) {
  const { hook, onUpdate, namespace } = props;
  const updateRef = useRef(onUpdate);
  const initialLoad = useRef(false);
  let data;
  try {
    data = hook();
  } catch (e) {
    console.error(`plugin-model: Invoking '${namespace || 'unknown'}' model failed:`, e);
  }

  // 首次执行时立刻返回初始值
  useMemo(() => {
    updateRef.current(data);
  }, []);

  // React 16.13 后 update 函数用 useEffect 包裹
  useEffect(() => {
    if (initialLoad.current) {
      updateRef.current(data);
    } else {
      initialLoad.current = true;
    }
  });

  return null;
}

const dispatcher = new Dispatcher();
export function Provider(props) {
  return (
    <Context.Provider value={{ dispatcher }}>
      {Object.keys(props.models).map((namespace) => {
        return (
          <Executor
            key={namespace}
            hook={props.models[namespace]}
            namespace={namespace}
            onUpdate={(val) => {
              dispatcher.data[namespace] = val;
              dispatcher.update(namespace);
            }}
          />
        );
      })}
      {props.children}
    </Context.Provider>
  );
}

export function useModel(namespace, selector) {
  const { dispatcher } = useContext(Context);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const [state, setState] = useState(() =>
    selectorRef.current
      ? selectorRef.current(dispatcher.data[namespace])
      : dispatcher.data[namespace]
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const isMount = useRef(false);

  useEffect(() => {
    isMount.current = true;
    return () => {
      isMount.current = false;
    };
  }, []);

  useEffect(() => {
    const handler = (data) => {
      if (!isMount.current) {
        // 如果 handler 执行过程中，组件被卸载了，则强制更新全局 data
        setTimeout(() => {
          dispatcher.data[namespace] = data;
          dispatcher.update(namespace);
        });
      } else {
        const currentState = selectorRef.current ? selectorRef.current(data) : data;
        const previousState = stateRef.current;
        if (!isEqual(currentState, previousState)) {
          // 避免 currentState 拿到的数据是老的，从而导致 isEqual 比对逻辑有问题
          stateRef.current = currentState;
          setState(currentState);
        }
      }
    };
    dispatcher.callbacks[namespace] ||= new Set(); // rawModels 是 umi 动态生成的文件，导致前面 callback[namespace] 的类型无法推导出来，所以用 as any 来忽略掉
    dispatcher.callbacks[namespace].add(handler);
    dispatcher.update(namespace);
    return () => {
      dispatcher.callbacks[namespace].delete(handler);
    };
  }, [namespace]);

  return state;
}
