interface HookProps<F extends (...args: any[]) => any> {
  hook: F;
  options?: Parameters<F>;
  getValue?: (value: ReturnType<F>) => void;
  children?: React.ReactNode | ((value: ReturnType<F>) => React.ReactNode);
}

const Hook = <F extends (...args: any[]) => any>({
  hook: useHook,
  options,
  getValue,
  children = null,
}: HookProps<F>) => {
  const value = useHook(...(options || []));
  useEffect(() => {
    if (getValue) {
      getValue(value);
    }
  }, [getValue, value]);
  return useMemo(
    () =>
      typeof children === "function" ? (
        children(value)
      ) : (
        <Fragment>{children}</Fragment>
      ),
    [children, value]
  );
};

class CounterClassExample extends Component {
  render() {
    return (
      <Fragment>
        <h2>Using a state hook inside a class component</h2>
        <Hook hook={useState} options={[0]} getValue={console.log}>
          {([count, setCount]) => (
            <button onClick={() => setCount(count + 1)}>
              bump this counter: {count}
            </button>
          )}
        </Hook>
        {Date.now()}
      </Fragment>
    );
  }
}
        
const useInterval = (callback, delay) => {
  const intervalRef = useRef(null);
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    const tick = () => savedCallback.current();
    if (typeof delay === 'number') {
      intervalRef.current = window.setInterval(tick, delay);
      return () => window.clearInterval(intervalRef.current);
    }
  }, [delay]);
  return intervalRef;
}

const ConditionalHookExample = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <Fragment>
      <h2>Conditional hook</h2>
      {isEnabled ? (
        <Hook
          hook={useInterval}
          options={[() => setCount(prev => prev + 1), 1000]}
        />
      ) : null}
      <button onClick={() => setIsEnabled(prev => !prev)}>
        {isEnabled ? 'stop' : count ? 'restart' : 'start'} the interval hook
      </button>
      <p>Current value: {count}</p>
    </Fragment>
  );
}

const app = (
  <Fragment>
    <h1><a href="https://kizu.dev/hook-component/" target="_blank">Hook</a> examples</h1>
    <CounterClassExample />
    <ConditionalHookExample />
  </Fragment>
);

