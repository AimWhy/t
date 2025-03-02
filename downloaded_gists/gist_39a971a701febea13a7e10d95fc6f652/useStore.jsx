import React, { createContext, useCallback, useContext, useRef, useSyncExternalStore } from 'react';

const noop = () => {};

const identity = (x) => x;

const useStoreData = (providerValue) => {
  const store = useRef(providerValue);
  const subscribers = useRef(new Set());

  const set = useCallback((value) => {
    store.current =
      typeof value === 'function' ? value(store.current) : { ...store.current, ...value };
    subscribers.current.forEach((callback) => callback());
  }, []);

  const subscribe = useCallback((callback) => {
    subscribers.current.add(callback);
    return () => subscribers.current.delete(callback);
  }, []);

  return { get: store.current, set, subscribe };
};

export function createMyContext(defaultValue) {
  const StoreContext = createContext(defaultValue);

  const Provider = React.memo(({ children, value }) => {
    const providerValue = useStoreData(value);

    return <StoreContext.Provider value={providerValue}>{children}</StoreContext.Provider>;
  });

  const useSelector = (selector = identity, noReactive) => {
    const store = useContext(StoreContext);

    if (!store) {
      throw new Error('Store not found');
    }

    const state = useSyncExternalStore(noReactive ? noop : store.subscribe, () =>
      selector(store.get())
    );
    const setStore = store.set;

    return [state, setStore];
  };

  return {
    Provider,
    useSelector,
  };
}

/******************************************/

const { Provider, useSelector } = createMyContext();

const TextInput = ({ value }) => {
  console.log(`TextInput:${value}`);

  const [fieldValue, setStore] = useSelector((store) => store[value]);
  return (<div className="field">
    {value}:{" "}
    <input value={fieldValue} onChange={(e) => setStore({ [value]: e.target.value })} />
  </div>);
};

const Display = ({ value }) => {
  console.log(`Display:${value}`);

  const [fieldValue] = useSelector((store) => store[value]);
  return (<div className="value">
    {value}: {fieldValue}
  </div>);
};

const FormContainer = () => {
  console.log('FormContainer');

  return (<div className="container">
    <h5>FormContainer</h5>
    <TextInput value="first" />
    <TextInput value="last" />
  </div>);
};

const DisplayContainer = () => {
  console.log('DisplayContainer');

  return (<div className="container">
    <h5>DisplayContainer</h5>
    <Display value="first" />
    <Display value="last" />
  </div>);
};

const ContentContainer = () => {
  console.log('ContentContainer');

  return (<div className="container">
    <h5>ContentContainer</h5>
    <FormContainer />
    <DisplayContainer />
  </div>);
};

function App() {
  console.log('App');

  return (<Provider value={{ first: '', last: '' }}>
    <div>
      <h5>App</h5>
      <ContentContainer />
      <Provider value={{ first: '', last: '' }}>
        <ContentContainer />
      </Provider>
    </div>
  </Provider>);
}
export default App;
