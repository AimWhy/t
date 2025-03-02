export function createState(initialValue) {
  return {
    listeners: [],
    state: initialValue,
  };
}

export function useGlobalState(config) {
  const [state, _setState] = useState(config.state);
  const setState = useCallback(stateOrSetter => {
    let next = stateOrSetter;
    if (typeof stateOrSetter === 'function') {
      next = stateOrSetter(config.state);
    }
    config.listeners.forEach(l => l(next));
    config.state = next;
  }, []);

  useEffect(() => {
    // Register the observer
    const listener = state => _setState(state);
    config.listeners.push(listener);

    // Cleanup when unmounting
    return () => {
      const index = config.listeners.indexOf(listener);
      config.listeners.splice(index, 1);
    };
  }, [])

  return [state, setState];
}

export function useGlobalState2(config) {
  const setState = useCallback(stateOrSetter => {
    let next = stateOrSetter;
    if (typeof stateOrSetter === 'function') {
      next = stateOrSetter(config.state);
    }
    config.state = next;
    config.listeners.forEach(l => l());
  }, []);

  const state = useSyncExternalStore(
    (listener) => {
      // Register the observer
      config.listeners.push(listener);

      // Cleanup when unmounting
      return () => config.listeners.filter(l => l !== listener);
    },
    () => config.state,
  );
  return [state, setState];
}
