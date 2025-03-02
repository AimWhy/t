import { useCallback, useLayoutEffect, useReducer, useRef } from 'react';

function useIsMounted() {
  const isMounted = useRef(false);
  useLayoutEffect(function () {
    isMounted.current = true;
    return () => (isMounted.current = false);
  }, []);
  return isMounted;
}

function useSafeCallback(callback) {
  let isMounted = useIsMounted();
  return useCallback(
    function (...args) {
      return isMounted.current ? callback(...args) : void 0;
    },
    [callback]
  );
}

function noop() {}
function useGetLatest(value) {
  const ref = useRef(value);
  ref.current = value;
  return useCallback(() => ref.current, []);
}

export default function useMutation(
  mutationFn,
  {
    onMutate = () => noop,
    onSuccess = noop,
    onFailure = noop,
    onSettled = noop,
    throwOnFailure = false,
    useErrorBoundary = false,
  } = {}
) {
  const [{ status, data, error }, unsafeDispatch] = useReducer(
    function reducer(_, action) {
      if (action.type === 'RESET') {
        return { status: 'idle' };
      }
      if (action.type === 'MUTATE') {
        return { status: 'running' };
      }
      if (action.type === 'SUCCESS') {
        return { status: 'success', data: action.data };
      }
      if (action.type === 'FAILURE') {
        return { status: 'failure', error: action.error };
      }
      throw Error('Invalid action');
    },
    { status: 'idle' }
  );
  const getMutationFn = useGetLatest(mutationFn);
  const latestMutation = useRef(0);
  const safeDispatch = useSafeCallback(unsafeDispatch);

  const mutate = useCallback(async function mutate(input, config = {}) {
    const mutation = Date.now();
    latestMutation.current = mutation;
    safeDispatch({ type: 'MUTATE' });
    const rollback = (await onMutate({ input })) ?? noop;
    try {
      const data = await getMutationFn()(input);
      if (latestMutation.current === mutation) {
        safeDispatch({ type: 'SUCCESS', data });
      }
      await onSuccess({ data, input });
      await (config.onSuccess ?? noop)({ data, input });
      await onSettled({ status: 'success', data, input });
      await (config.onSettled ?? noop)({ status: 'success', data, input });
      return data;
    } catch (error) {
      await onFailure({ error, rollback, input });
      await (config.onFailure ?? noop)({ error, rollback, input });
      await onSettled({ status: 'failure', error, input, rollback });
      await (config.onSettled ?? noop)({
        status: 'failure',
        error,
        input,
        rollback,
      });
      if (latestMutation.current === mutation) {
        safeDispatch({ type: 'FAILURE', error });
      }
      if (config.throwOnFailure ?? throwOnFailure) {
        throw error;
      }
      return;
    }
  }, []);

  const reset = useCallback(function reset() {
    safeDispatch({ type: 'RESET' });
  }, []);

  if (useErrorBoundary && error) {
    throw error;
  }
  return [mutate, { status, data, error, reset }];
}
