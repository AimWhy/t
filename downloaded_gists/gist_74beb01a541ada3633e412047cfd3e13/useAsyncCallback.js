import { useCallback, useEffect, useLayoutEffect, useRef, useState, } from 'react';

const useGetter = (t) => {
  const ref = useRef(t);
  useLayoutEffect(() => {
    ref.current = t;
  });
  return useCallback(() => ref.current, [ref]);
};

const InitialAsyncState = {
  status: 'not-requested',
  loading: false,
  result: undefined,
  error: undefined,
};

const InitialAsyncLoadingState = {
  status: 'loading',
  loading: true,
  result: undefined,
  error: undefined,
};

const defaultSetLoading = () => InitialAsyncLoadingState;

const defaultSetResult = (result) => ({
  status: 'success',
  loading: false,
  result,
  error: undefined,
});

const defaultSetError = (error) => ({
  status: 'error',
  loading: false,
  result: undefined,
  error,
});

const noop = () => { };

const DefaultOptions = {
  initialState: options => options?.executeOnMount ? InitialAsyncLoadingState : InitialAsyncState,
  executeOnMount: true,
  executeOnUpdate: true,
  setLoading: defaultSetLoading,
  setResult: defaultSetResult,
  setError: defaultSetError,
  onSuccess: noop,
  onError: noop,
};

const normalizeOptions = (options) => ({
  ...DefaultOptions,
  ...options,
});

const useAsyncState = (options) => {
  const [value, setValue] = useState(() => options.initialState(options));
  const reset = useCallback(() => setValue(options.initialState(options)), [options]);
  const setLoading = useCallback(() => setValue(options.setLoading(value)), [value]);
  const setResult = useCallback((result) => setValue(options.setResult(result, value)), [value]);
  const setError = useCallback((error) => setValue(options.setError(error, value)), [value]);
  const merge = useCallback((state) => setValue({ ...value, ...state }), [value]);

  return {
    value,
    set: setValue,
    merge,
    reset,
    setLoading,
    setResult,
    setError,
  };
};

const useIsMounted = () => {
  const ref = useRef(false);
  useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);
  return () => ref.current;
};

const useCurrentPromise = () => {
  const ref = useRef(null);
  return {
    set: promise => { ref.current = promise },
    get: () => ref.current,
    is: promise => ref.current === promise,
  };
};

// Relaxed interface which accept both async and sync functions
// Accepting sync function is convenient for useAsyncCallback
const useAsyncInternal = (asyncFunction, params = [], options) => {
  // Fallback missing params, only for JS users forgetting the deps array, to prevent infinite loops
  // https://github.com/slorber/react-async-hook/issues/27

  const normalizedOptions = normalizeOptions(options);
  const [currentParams, setCurrentParams] = useState(null);
  const AsyncState = useAsyncState(normalizedOptions);
  const isMounted = useIsMounted();
  const CurrentPromise = useCurrentPromise();
  // We only want to handle the promise result/error
  // if it is the last operation and the comp is still mounted
  const shouldHandlePromise = (p) => isMounted() && CurrentPromise.is(p);
  const executeAsyncOperation = (...args) => {
    // async ensures errors thrown synchronously are caught (ie, bug when formatting api payloads)
    // async ensures promise-like and synchronous functions are handled correctly too
    // see https://github.com/slorber/react-async-hook/issues/24
    const promise = (async () => asyncFunction(...args))();
    setCurrentParams(args);
    CurrentPromise.set(promise);
    AsyncState.setLoading();
    promise.then(result => {
      if (shouldHandlePromise(promise)) {
        AsyncState.setResult(result);
      }
      normalizedOptions.onSuccess(result, {
        isCurrent: () => CurrentPromise.is(promise),
      });
    }, error => {
      if (shouldHandlePromise(promise)) {
        AsyncState.setError(error);
      }
      normalizedOptions.onError(error, {
        isCurrent: () => CurrentPromise.is(promise),
      });
    });
    return promise;
  };
  const getLatestExecuteAsyncOperation = useGetter(executeAsyncOperation);
  const executeAsyncOperationMemo = useCallback((...args) => getLatestExecuteAsyncOperation()(...args), [getLatestExecuteAsyncOperation]);
  // Keep this outside useEffect, because inside isMounted()
  // will be true as the component is already mounted when it's run
  const isMounting = !isMounted();

  useEffect(() => {
    const execute = () => getLatestExecuteAsyncOperation()(...params);
    if (isMounting) {
      if (normalizedOptions.executeOnMount) {
        execute();
      }
    } else if (normalizedOptions.executeOnUpdate) {
      execute();
    }
  }, params);

  return {
    ...AsyncState.value,
    set: AsyncState.set,
    merge: AsyncState.merge,
    reset: AsyncState.reset,
    execute: executeAsyncOperationMemo,
    currentPromise: CurrentPromise.get(),
    currentParams,
  };
};

export function useAsync(asyncFunction, params, options) {
  return useAsyncInternal(asyncFunction, params, options);
}

export const useAsyncAbortable = (asyncFunction, params, options) => {
  const abortControllerRef = useRef();
  // Wrap the original async function and enhance it with abortion login
  const asyncFunctionWrapper = async (...p) => {
    // Cancel previous async call
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Create/store new abort controller for next async call
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    try {
      return await asyncFunction(abortController.signal, ...p);
    } finally {
      // Unset abortController ref if response is already there,
      // as it's not needed anymore to try to abort it (would it be no-op?)
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = undefined;
      }
    }
  };
  return useAsync(asyncFunctionWrapper, params, options);
};

// Hacky but in such case we don't need the params,
// because async function is only executed manually
export const useAsyncCallback = (asyncFunction, options) => useAsyncInternal(asyncFunction, [], {
  ...options,
  executeOnMount: false,
  executeOnUpdate: false,
});