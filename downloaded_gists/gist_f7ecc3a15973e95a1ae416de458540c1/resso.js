let isInMethod = false;
let run = (fn) => { fn(); };

const resso = (data) => {
  const state = {};
  const methods = {};
  Object.keys(data).forEach((key) => {
    const initVal = data[key];
    if (initVal instanceof Function) {
      methods[key] = (...args) => {
        isInMethod = true;
        const res = initVal(...args);
        isInMethod = false;
        return res;
      };
      return;
    }
    const listeners = new Set();
    state[key] = {
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      getSnapshot: () => data[key],
      setSnapshot: (val) => {
        if (val !== data[key]) {
          data[key] = val;
          run(() => listeners.forEach((listener) => listener()));
        }
      },
      useSnapshot: () => {
        return useSyncExternalStore(state[key].subscribe, state[key].getSnapshot, state[key].getSnapshot);
      },
    };
  });
  const setState = (key, val) => {
    if (key in data) {
      if (key in state) {
        const newVal = val instanceof Function ? val(data[key]) : val;
        state[key].setSnapshot(newVal);
      }
    }
  };
  return new Proxy((() => undefined), {
    get: (_, key) => {
      if (key in methods) {
        return methods[key];
      }
      if (isInMethod) {
        return data[key];
      }
      try {
        return state[key].useSnapshot();
      }
      catch (err) {
        return data[key];
      }
    },
    set: (_, key, val) => {
      setState(key, val);
      return true;
    },
    apply: (_, __, [key, updater]) => {
      if (typeof updater === 'function') {
        setState(key, updater);
      }
    },
  });
};
resso.config = ({ batch }) => { run = batch; };
export default resso;