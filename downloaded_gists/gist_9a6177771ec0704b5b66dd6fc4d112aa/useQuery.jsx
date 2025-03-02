/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

export const DEFAULT_QUERY_OPTIONS = {
  cacheTime: 5 * 60 * 1000,
  staleTime: 100,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchInterval: false,
  refetchIntervalInBackground: false,
  refetchOnReconnect: false,
};

export const PageContext = createContext(void 0);
export function usePageContext() {
  return useContext(PageContext);
}

/** Access the query client that manages the cache used by useQuery */
export function useQueryClient() {
  const ctx = useContext(PageContext);
  return ctx.queryClient;
}

const queryCache = Object.create(null);

export const defaultCache = {
  has(key) {
    return key in queryCache;
  },
  get(key) {
    return queryCache[key];
  },
  set(key, valueOrPromise, cacheTime = DEFAULT_QUERY_OPTIONS.cacheTime) {
    if (valueOrPromise instanceof Promise) {
      queryCache[key] ||= {
        date: Date.now(),
        subscribers: new Set(),
        cacheTime,
      };
      queryCache[key] = {
        ...queryCache[key],
        promise: valueOrPromise,
        cacheTime: Math.max(queryCache[key].cacheTime, cacheTime),
      };

      delete queryCache[key].invalid;

      valueOrPromise.then(
        (value) => {
          queryCache[key] = { ...queryCache[key], value, date: Date.now() };
          delete queryCache[key].promise;
          queryCache[key].subscribers.forEach((subscriber) => subscriber());
        },
        (error) => {
          delete queryCache[key].promise;
          queryCache[key].error = error;
          throw error;
        }
      );
    } else {
      queryCache[key] ||= {
        date: Date.now(),
        subscribers: new Set(),
        cacheTime,
      };
      queryCache[key] = {
        ...queryCache[key],
        value: valueOrPromise,
        date: Date.now(),
      };
      delete queryCache[key].invalid;
      delete queryCache[key].promise;
    }
    queryCache[key].subscribers.forEach((subscriber) => subscriber());
  },
  subscribe(key, fn) {
    queryCache[key] ||= {
      subscribers: new Set(),
      date: Date.now(),
      cacheTime: DEFAULT_QUERY_OPTIONS.cacheTime,
    };
    queryCache[key].subscribers.add(fn);

    if (queryCache[key].evictionTimeout !== void 0) {
      clearTimeout(queryCache[key].evictionTimeout);
      delete queryCache[key].evictionTimeout;
    }

    return () => {
      if (!queryCache[key]) {
        return;
      }
      queryCache[key].subscribers.delete(fn);
      if (queryCache[key].subscribers.size !== 0) {
        return;
      }
      delete queryCache[key].error;
      if (queryCache[key].cacheTime === 0) {
        delete queryCache[key];
      } else if (isFinite(queryCache[key].cacheTime)) {
        queryCache[key].evictionTimeout = setTimeout(() => {
          delete queryCache[key];
        }, queryCache[key].cacheTime);
      }
    };
  },
  enumerate() {
    return Object.keys(queryCache);
  },
  invalidate(key) {
    if (queryCache[key]) {
      queryCache[key] = { ...queryCache[key], invalid: true };
      queryCache[key].subscribers.forEach((subscriber) => subscriber());
    }
  },
};

export function Wrapper({ children }) {
  return <QueryCacheContext.Provider value={defaultCache}>{children}</QueryCacheContext.Provider>;
}

export const QueryCacheContext = createContext(void 0);

/************** 分隔符 **************/

function useQueryBase(key, fn, options) {
  const { cacheTime, staleTime, refetchOnMount } = options;
  const ctx = usePageContext();
  const cache = useContext(QueryCacheContext);
  const item = useSyncExternalStore(
    (onStoreChange) => {
      if (key !== void 0) {
        return cache.subscribe(key, () => onStoreChange());
      }
      return (_) => _;
    },
    () => (key === void 0 ? void 0 : cache.get(key))
  );

  useEffect(() => {
    const cacheItem = key ? cache.get(key) : void 0;
    if (cacheItem === void 0) {
      return;
    }
    if (
      !cacheItem.promise &&
      (cacheItem.invalid ||
        refetchOnMount === 'always' ||
        (refetchOnMount && (!cacheItem.date || staleTime <= Date.now() - cacheItem.date)))
    ) {
      const promiseOrValue = fn(ctx);
      cache.set(key, promiseOrValue, cacheTime);
    }
  }, [key, item?.invalid]);

  if (key === void 0) {
    return;
  }

  if (item && 'error' in item) {
    const error = item.error;
    throw error;
  }

  function refetch() {
    const _item = cache.get(key);
    if (!_item?.promise) {
      cache.set(key, fn(ctx), cacheTime);
    }
  }

  if (item && 'value' in item) {
    return {
      data: item.value,
      isRefetching: !!item.promise,
      refetch,
      dataUpdatedAt: item.date,
    };
  }

  if (item?.promise) {
    throw item.promise;
  }

  const result = fn(ctx);
  cache.set(key, result, cacheTime);
  if (result instanceof Promise) {
    throw result;
  }

  return {
    data: result,
    refetch,
    isRefetching: false,
    dataUpdatedAt: item?.date ?? Date.now(),
  };
}

function useRefetch(queryResult, options) {
  const {
    refetchOnWindowFocus,
    refetchInterval,
    refetchIntervalInBackground,
    staleTime,
    refetchOnReconnect,
  } = options;

  // Refetch on window focus
  useEffect(() => {
    if (!queryResult || !refetchOnWindowFocus) {
      return;
    }
    function handleVisibilityChange() {
      if (
        document.visibilityState === 'visible' &&
        (refetchOnWindowFocus === 'always' ||
          !queryResult.dataUpdatedAt ||
          staleTime <= Date.now() - queryResult.dataUpdatedAt)
      ) {
        queryResult.refetch();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [refetchOnWindowFocus, queryResult, staleTime]);

  // Refetch on interval
  useEffect(() => {
    if (!refetchInterval || !queryResult) {
      return;
    }
    const id = setInterval(() => {
      if (refetchIntervalInBackground || document.visibilityState === 'visible') {
        queryResult.refetch();
      }
    }, refetchInterval);
    return () => {
      clearInterval(id);
    };
  }, [refetchInterval, refetchIntervalInBackground, queryResult]);

  // Refetch on reconnect
  useEffect(() => {
    if (!refetchOnReconnect || !queryResult) {
      return;
    }
    function handleReconnect() {
      queryResult.refetch();
    }
    window.addEventListener('online', handleReconnect);
    return () => {
      window.removeEventListener('online', handleReconnect);
    };
  }, [refetchOnReconnect, queryResult]);
}

export function useQuery(key, fn, options = {}) {
  const fullOptions = { ...DEFAULT_QUERY_OPTIONS, ...options };
  const result = useQueryBase(key, fn, fullOptions);
  useRefetch(result, fullOptions);
  return result;
}

export function createQueryClient(cache) {
  return {
    getQueryData(key) {
      return cache.get(key)?.value;
    },
    setQueryData(key, data) {
      if (data instanceof Promise) {
        throw new TypeError('data must be synchronous');
      }
      cache.set(key, data);
    },
    prefetchQuery(key, data) {
      cache.set(key, data);
    },
    invalidateQueries(keys) {
      if (typeof keys === 'string') {
        cache.invalidate(keys);
        return;
      } else if (Array.isArray(keys)) {
        keys.forEach((key) => cache.invalidate(key));
        return;
      }

      for (const key of cache.enumerate()) {
        const shouldInvalidate = keys === void 0 || keys(key);
        if (shouldInvalidate) {
          cache.invalidate(key);
        }
      }
    },
  };
}
