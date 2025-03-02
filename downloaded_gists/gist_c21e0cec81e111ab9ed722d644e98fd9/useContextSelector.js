/* eslint-disable camelcase */
import {
  createElement,
  createContext as createContextOrig,
  useContext as useContextOrig,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  unstable_NormalPriority as NormalPriority,
  unstable_runWithPriority as runWithPriority,
} from 'scheduler';

export { unstable_batchedUpdates as batchedUpdates } from 'react-dom';

const CONTEXT_VALUE = Symbol('CONTEXT_VALUE');
const ORIGINAL_PROVIDER = Symbol('ORIGINAL_PROVIDER');

const runWithNormalPriority = runWithPriority
  ? (thunk) => runWithPriority(NormalPriority, thunk)
  : (thunk) => thunk();

const createProvider = (ProviderOrig) => {
  return function ContextProvider({ value, children }) {
    const valueRef = useRef(value);
    const versionRef = useRef(0);
    const [resolve, setResolve] = useState(null);
    const contextValue = useRef();

    if (resolve) {
      resolve(value);
      setResolve(null);
    }

    if (!contextValue.current) {
      const listeners = new Set();
      const update = (thunk, { suspense = false } = {}) => {
        batchedUpdates(() => {
          versionRef.current += 1;
          const action = { n: versionRef.current };

          // this is intentional to make it temporary version
          if (suspense) {
            action.n *= -1;
            action.promise = new Promise((r) => {
              // 设置 suspense 的完成函数、在执行 useContextUpdate 的返回函数【会触发组件重新渲染】
              setResolve(() => (v) => {
                action.v = v;
                delete action.promise;
                r(v);
              });
            });
          }
          listeners.forEach((listener) => listener(action));
          thunk();
        });
      };

      contextValue.current = {
        [CONTEXT_VALUE]: {
          v: valueRef,
          n: versionRef,
          l: listeners,
          u: update,
        },
      };
    }

    useLayoutEffect(() => {
      valueRef.current = value;
      versionRef.current += 1;

      runWithNormalPriority(() => {
        contextValue.current[CONTEXT_VALUE].l.forEach((listener) => {
          listener({ n: versionRef.current, v: value });
        });
      });
    }, [value]);

    return createElement(
      ProviderOrig,
      { value: contextValue.current },
      children
    );
  };
};

export function createContext(defaultValue) {
  const context = createContextOrig({
    [CONTEXT_VALUE]: {
      v: { current: defaultValue },
      n: { current: -1 },
      l: new Set(),
      u: (f) => f(),
    },
  });
  context[ORIGINAL_PROVIDER] = context.Provider;
  context.Provider = createProvider(context.Provider);
  delete context.Consumer;
  return context;
}

export function useContextSelector(context, selector) {
  const contextValue = useContextOrig(context)[CONTEXT_VALUE];

  const {
    v: { current: value },
    n: { current: version },
    l: listeners,
  } = contextValue;

  const selected = selector(value);

  const [state, dispatch] = useReducer(
    (prev, action) => {
      if (!action) {
        return [value, selected];
      }
      if (action.promise) {
        throw action.promise;
      }
      if (action.n === version) {
        if (Object.is(prev[1], selected)) {
          return prev; // bail out
        }
        return [value, selected];
      }
      try {
        if ('v' in action) {
          if (Object.is(prev[0], action.v)) {
            return prev; // do not update
          }
          const nextSelected = selector(action.v);
          if (Object.is(prev[1], nextSelected)) {
            return prev; // do not update
          }
          return [action.v, nextSelected];
        }
      } catch (e) {
      }
      return [...prev]; // schedule update
    },
    [value, selected]
  );

  if (!Object.is(state[1], selected)) {
    dispatch();
  }

  useLayoutEffect(() => {
    listeners.add(dispatch);
    return () => listeners.delete(dispatch);
  }, [listeners]);

  return state[1];
}

const identity = (x) => x;
export function useContext(context) {
  return useContextSelector(context, identity);
}

export function useContextUpdate(context) {
  const contextValue = useContextOrig(context)[CONTEXT_VALUE];
  const { u: update } = contextValue;
  return update;
}

export const BridgeProvider = ({ context, value, children }) => {
  const { [ORIGINAL_PROVIDER]: ProviderOrig } = context;
  return createElement(ProviderOrig, { value }, children);
};

export const useBridgeValue = (context) => {
  const bridgeValue = useContextOrig(context);
  return bridgeValue;
};
