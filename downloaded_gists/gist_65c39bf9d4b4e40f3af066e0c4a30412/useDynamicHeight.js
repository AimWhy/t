import { useState, useLayoutEffect, useCallback } from 'react';

export function useWindowHeight() {
  const [height, setHeight] = useState(() => window.innerHeight || 0);

  const resizeHandler = useCallback((e) => {
    setHeight(e.currentTarget.innerHeight);
  }, []);

  useLayoutEffect(() => {
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
  }, [resizeHandler]);

  return height;
}


import useWindowHeight from './use-window-height';

export function useDynamicHeight(customHeightSetter = (val) => val, def = 500) {
  // min-height value
  const [dynamicHeight, setDynamicHeight] = useState(() => customHeightSetter(def));
  const height = useWindowHeight();

  const dynamicHeightRef = useCallback(
    (node) => {
      if (node !== null) {
        const newValue = height - node.getBoundingClientRect().top;
        setDynamicHeight(customHeightSetter(newValue));
      }
    },
    [height, customHeightSetter],
  );

  return { dynamicHeight, dynamicHeightRef };
}