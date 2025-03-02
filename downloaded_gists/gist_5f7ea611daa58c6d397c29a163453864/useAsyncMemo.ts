import * as React from 'react';

// Recalculates the value when dependencies change.
export function useAsyncMemo<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList,
  initialValue: T,
  resetValue?: T
) {
  const [value, setValue] = React.useState<T>(initialValue);
  React.useEffect(() => {
    let canceled = false;
    if (resetValue !== void 0) {
      setValue(resetValue);
    }

    fn().then((result) => {
      if (!canceled) {
        setValue(result);
      }
    });

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}

// Tracks the element size and returns it's contentRect (always has x=0, y=0).
export function useMeasure<T extends Element>() {
  const ref = React.useRef<T | null>(null);
  const [measure, setMeasure] = React.useState(new DOMRect(0, 0, 10, 10));

  React.useLayoutEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries: any) => {
      const entry = entries[entries.length - 1];
      if (entry && entry.contentRect) {
        setMeasure(entry.contentRect);
      }
    });
    resizeObserver.observe(target);

    return () => resizeObserver.unobserve(target);
  }, [ref]);

  return [measure, ref] as const;
}
