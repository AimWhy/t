import { useRef, useState } from 'react';

export function useMutation(mutationFn, options = {}) {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(void 0);
  const [error, setError] = useState(void 0);
  const reset = useRef(false);

  async function doMutate(vars) {
    setStatus('loading');
    await options.onMutate?.(vars);

    try {
      const result = await mutationFn(vars);
      if (reset.current) {
        return;
      }
      options.onSuccess?.(result);
      setData(result);
      setStatus('success');
      return result;
    } catch (err) {
      if (reset.current) {
        return;
      }
      options.onError?.(err);
      setError(err);
      setStatus('error');
    } finally {
      if (!reset.current) {
        options.onSettled?.(data, error);
      }
    }
  }

  function mutate(vars) {
    reset.current = false;
    return doMutate(vars);
  }

  return {
    status,
    data,
    error,
    isError: status === 'error',
    isIdle: status === 'idle',
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    reset() {
      setStatus('idle');
      setData(void 0);
      setError(void 0);
      reset.current = true;
    },
    mutateAsync: mutate,
    mutate(vars) {
      mutate(vars).catch(() => {});
    },
  };
}
