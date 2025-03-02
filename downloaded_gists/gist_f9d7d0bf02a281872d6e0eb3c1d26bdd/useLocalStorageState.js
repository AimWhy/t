import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

function parseJSON(value) {
  return value === "undefined" ? void 0 : JSON.parse(value);
}

function goodTry(tryFn) {
  try {
    return tryFn();
  } catch {
    return void 0;
  }
}

const callbacks = new Set();
function triggerCallbacks(key) {
  for (const callback of [...callbacks]) {
    callback(key);
  }
}

export default function useLocalStorageState(key, options) {
  if (useSyncExternalStore === void 0) {
    throw new TypeError(
      `You are using React 17 or below. Install with "npm install use-local-storage-state@17".`
    );
  }
  const [defaultValue] = useState(options?.defaultValue);
  const serializer = options?.serializer;

  return useBrowserLocalStorageState(
    key,
    defaultValue,
    options?.storageSync,
    serializer?.parse,
    serializer?.stringify
  );
}

export const inMemoryData = new Map();
function useBrowserLocalStorageState(
  key,
  defaultValue,
  storageSync = true,
  parse = parseJSON,
  stringify = JSON.stringify
) {
  if (
    !inMemoryData.has(key) &&
    defaultValue !== void 0 &&
    goodTry(() => localStorage.getItem(key)) === null
  ) {
    goodTry(() => localStorage.setItem(key, stringify(defaultValue)));
  }

  const storageValue = useRef({
    item: null,
    parsed: defaultValue,
  });

  const value = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        const onChange = (localKey) => {
          if (key === localKey) {
            onStoreChange();
          }
        };
        callbacks.add(onChange);
        return () => {
          callbacks.delete(onChange);
        };
      },
      [key]
    ),

    () => {
      const item = goodTry(() => localStorage.getItem(key)) ?? null;

      if (inMemoryData.has(key)) {
        storageValue.current = {
          item,
          parsed: inMemoryData.get(key),
        };
      } else if (item !== storageValue.current.item) {
        let parsed;
        try {
          parsed = item === null ? defaultValue : parse(item);
        } catch {
          parsed = defaultValue;
        }
        storageValue.current = {
          item,
          parsed,
        };
      }
      return storageValue.current.parsed;
    },
    () => defaultValue
  );

  const setState = useCallback(
    (newValue) => {
      const value =
        newValue instanceof Function
          ? newValue(storageValue.current.parsed)
          : newValue;
      try {
        localStorage.setItem(key, stringify(value));
        inMemoryData.delete(key);
      } catch {
        inMemoryData.set(key, value);
      }
      triggerCallbacks(key);
    },
    [key, stringify]
  );

  useEffect(() => {
    if (!storageSync) {
      return void 0;
    }
    const onStorage = (e) => {
      if (e.storageArea === goodTry(() => localStorage) && e.key === key) {
        triggerCallbacks(key);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, storageSync]);

  return useMemo(
    () => [
      value,
      setState,
      {
        isPersistent: value === defaultValue || !inMemoryData.has(key),
        removeItem() {
          goodTry(() => localStorage.removeItem(key));
          inMemoryData.delete(key);
          triggerCallbacks(key);
        },
      },
    ],
    [key, setState, value, defaultValue]
  );
}
