export const createStore = (createState) => {
  let state;
  const listeners = new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = nextState;
      if (replace && nextState && typeof nextState === 'object') {
        state = Object.assign({}, state, nextState);
      }
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const destroy = () => listeners.clear();
  const api = { setState, getState, subscribe, destroy };
  state = createState(setState, getState, api);
  return api;
};

export const globalStore = createStore(setState => setState({ global: true }));
	
export function useGlobalStore(getSnapshot = g => g()) {
  return React.useSyncExternalStore(globalStore.subscribe, () => getSnapshot(globalStore.getState));
}
