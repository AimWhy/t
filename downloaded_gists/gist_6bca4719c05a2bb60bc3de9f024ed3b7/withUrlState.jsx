import React, { useReducer, useRef, useMemo } from 'react';
import { withRouter } from 'dva/router';
import { parse, stringify } from 'query-string';

export function useMemoizedFn(fn) {
  const fnRef = useRef(fn);
  // why not write `fnRef.current = fn`?
  // https://github.com/alibaba/hooks/issues/728
  fnRef.current = useMemo(() => fn, [fn]);

  const memoizedFn = useRef();
  if (!memoizedFn.current) {
    memoizedFn.current = function (...args) {
      return fnRef.current.apply(this, args);
    };
  }
  return memoizedFn.current;
}

const baseParseConfig = {
  parseNumbers: false,
  parseBooleans: false,
};
const baseStringifyConfig = {
  skipNull: false,
  skipEmptyString: false,
};

export const withUrlState = (Component, initialState, options) => withRouter(props => {
  const { location, history } = props;
  const { navigateMode = 'push', parseOptions, stringifyOptions } = options || {};
  const mergedParseOptions = { ...baseParseConfig, ...parseOptions };
  const mergedStringifyOptions = { ...baseStringifyConfig, ...stringifyOptions };
  const initialStateRef = useRef(typeof initialState === 'function' ? initialState() : initialState || {});

  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

  const queryFromUrl = useMemo(() => {
    return parse(location.search, mergedParseOptions);
  }, [location.search]);

  const queryData = useMemo(() => ({
    ...initialStateRef.current,
    ...queryFromUrl,
  }), [queryFromUrl]);

  const setState = (s) => {
    const newQuery = typeof s === 'function' ? s(queryData) : s;
    // 1. 如果 setState 后，search 没变化，就需要 update 来触发一次更新。比如 demo1 直接点击 clear，就需要 update 来触发更新。
    // 2. update 和 history 的更新会合并，不会造成多次更新
    console.log(ignored);
    forceUpdate();
    history[navigateMode]({
      hash: location.hash,
      search: stringify({ ...queryFromUrl, ...newQuery }, mergedStringifyOptions) || '?',
    });
  };

  const setQueryData = useMemoizedFn(setState);

  return <Component
    queryData={queryData}
    setQueryData={setQueryData}
    {...props}
  />;
});
