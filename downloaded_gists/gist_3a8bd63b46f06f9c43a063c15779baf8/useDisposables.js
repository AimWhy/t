import { useCallback, useEffect, useReducer, useState } from 'react';

function microTask(cb) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(cb);
  } else {
    Promise.resolve()
      .then(cb)
      .catch((e) =>
        setTimeout(() => {
          throw e;
        })
      );
  }
}

function disposables() {
  const waitDisposables = [];
  const queue = [];
  const api = {
    enqueue(fn) {
      queue.push(fn);
    },
    addEventListener(element, name, listener, options) {
      element.addEventListener(name, listener, options);
      return api.add(() => element.removeEventListener(name, listener, options));
    },
    requestAnimationFrame(...args) {
      const raf = requestAnimationFrame(...args);
      return api.add(() => cancelAnimationFrame(raf));
    },
    nextFrame(...args) {
      return api.requestAnimationFrame(() => {
        return api.requestAnimationFrame(...args);
      });
    },
    setTimeout(...args) {
      const timer = setTimeout(...args);
      return api.add(() => clearTimeout(timer));
    },
    microTask(...args) {
      const task = { current: true };
      microTask(() => {
        if (task.current) {
          args[0]();
        }
      });
      return api.add(() => {
        task.current = false;
      });
    },
    add(cb) {
      waitDisposables.push(cb);
      return () => {
        const idx = waitDisposables.indexOf(cb);
        if (idx >= 0) {
          const [dispose] = waitDisposables.splice(idx, 1);
          dispose();
        }
      };
    },
    dispose() {
      for (const dispose of waitDisposables.splice(0)) {
        dispose();
      }
    },
    async workQueue() {
      for (const handle of queue.splice(0)) {
        await handle();
      }
    },
    useState(initialState) {
      const [state, unsafeSetState] = useState(initialState);
      const setState = useCallback((currentState) => {
        if (!api.isUnMounted) {
          unsafeSetState(currentState);
        }
      }, []);

      return [state, setState];
    },
    useReducer(...args) {
      const [state, unsafeDispatch] = useReducer(...args);

      const dispatch = useCallback((...args2) => {
        if (!api.isUnMounted) {
          unsafeDispatch(...args2);
        }
      }, []);

      return [state, dispatch];
    },
  };
  return api;
}

export function useDisposables() {
  // Using useState instead of useRef so that we can use the initializer function.
  const [api] = useState(disposables);
  useEffect(() => {
    api.isUnMounted = false;
    return () => {
      api.isUnMounted = true;
      api.dispose();
    };
  }, [api]);
  return api;
}