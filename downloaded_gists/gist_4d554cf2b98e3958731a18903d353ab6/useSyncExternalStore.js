import * as React from 'react';

function checkIfSnapshotChanged({ value, getSnapshot }) {
  try {
    return value !== getSnapshot();
  } catch {
    return true;
  }
}

export const useSyncExternalStore = (subscribe, getSnapshot) => {
  const value = getSnapshot();
  const [{ inst }, forceUpdate] = React.useState({ inst: { value, getSnapshot } });

  React.useLayoutEffect(() => {
    Object.assign(inst, { value, getSnapshot });
    if (checkIfSnapshotChanged(inst)) {
      forceUpdate({ inst });
    }
  }, [subscribe, value, getSnapshot]);

  React.useEffect(() => {
    if (checkIfSnapshotChanged(inst)) {
      forceUpdate({ inst });
    }

    return subscribe(function handleStoreChange(_cur, _pre) {
      if (checkIfSnapshotChanged(inst)) {
        forceUpdate({ inst });
      }
    });
  }, [subscribe]);

  return value;
};

export function useMediaQueryNew(query, defaultMatches, matchMedia) {
  const getDefaultSnapshot = React.useCallback(() => defaultMatches, [defaultMatches]);

  const [getSnapshot, subscribe] = React.useMemo(() => {
    if (matchMedia === null) {
      return [getDefaultSnapshot, () => () => {}];
    }

    const mediaQueryList = matchMedia(query);
    
    return [
      () => mediaQueryList.matches,
      (notify) => {
        mediaQueryList.addListener(notify);
        
        return () => {
          mediaQueryList.removeListener(notify);
        };
      },
    ];
  }, [getDefaultSnapshot, matchMedia, query]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
