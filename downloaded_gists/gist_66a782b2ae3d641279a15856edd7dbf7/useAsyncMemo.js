import * as React from "react";

// Recalculates the value when dependencies change.
export function useAsyncMemo(fn, deps, initialValue, resetValue) {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    let canceled = false;
    if (resetValue !== undefined) {
      setValue(resetValue);
    }

    fn().then((value) => {
      if (!canceled) {
        setValue(value);
      }
    });

    return () => {
      canceled = true;
    };
  }, deps);

  return value;
}

// Tracks the element size and returns it's contentRect (always has x=0, y=0).
export function useMeasure() {
  const ref = React.useRef(null);
  const [measure, setMeasure] = React.useState(new DOMRect(0, 0, 10, 10));

  React.useLayoutEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry && entry.contentRect) {
        setMeasure(entry.contentRect);
      }
    });
    resizeObserver.observe(target);

    return () => resizeObserver.unobserve(target);
  }, [ref]);

  return [measure, ref];
}
