import { useId } from "react";
import { parse } from "@brillout/json-serializer/parse";
import { stringify } from "@brillout/json-serializer/stringify";

function getGlobalVariable(key, defaultValue) {
  globalThis.__react_streaming = globalThis.__react_streaming || {};
  globalThis.__react_streaming[key] = globalThis.__react_streaming[key] || defaultValue;
  return globalThis.__react_streaming[key];
}

let count;
function bugCatcher() {
  if (count === void 0) {
    count = 0;
    setTimeout(() => {
      count = void 0;
    }, 30 * 1000);
  }

  if (++count > 1000) {
    throw new Error("Infinite loop detected.");
  }
}

const isCallable = (thing) => thing instanceof Function || typeof thing === "function";

const isPromise = (val) => typeof val === "object" && val !== null && "then" in val && isCallable(val.then);

const getSuspenseId = (key, elementId) => `${key}_${elementId}`;
const workaroundCache = getGlobalVariable("workaroundCache", {});
export function useSuspense({
  key,
  elementId,
  suspenses,
  resolver,
  resolverSync,
  needsWorkaround
}) {
  const suspenseId = getSuspenseId(key, elementId);
  let suspense = suspenses[suspenseId];

  if (!suspense && resolverSync) {
    const resolved = resolverSync();
    if (resolved !== null) {
      suspense = suspenses[suspenseId] = { state: "done", value: resolved };
      return suspense.value;
    }
  }

  if (!suspense && needsWorkaround) {
    const found = workaroundCache[key];
    if (found) {
      suspense = found.suspense;

      if (suspense.state === "done") {
        suspenses[suspenseId] = suspense;
        if (found.cacheTimeout === null) {
          found.cacheTimeout = setTimeout(() => {
            found.cacheTimeout = null;
            delete workaroundCache[key];
          }, 1000);
        }
        return suspense.value;
      }
    }
  }

  if (suspense) {
    if (suspense.state === "pending") {
      bugCatcher();
      throw suspense.promise;
    }

    if (suspense.state === "error") {
      delete suspenses[suspenseId];
      console.error(suspense.err);
      throw suspense.err;
    }

    return suspense.value;
  }

  const updateSuspenseAsync = (s) => {
    suspense = s;
    if (!needsWorkaround) {
      suspenses[suspenseId] = suspense;
      return;
    }

    const found = workaroundCache[key];
    if (found === null || found === void 0 ? void 0 : found.cacheTimeout) {
      clearTimeout(found.cacheTimeout);
    }

    workaroundCache[key] = { suspense, cacheTimeout: null };
  };

  try {
    const ret = resolver();
    if (!isPromise(ret)) {
      suspense = suspenses[suspenseId] = { state: "done", value: ret };
    } else {
      const promise = ret
        .then((value) => {
          updateSuspenseAsync({ state: "done", value });
        })
        .catch((err) => {
          updateSuspenseAsync({ state: "error", err });
        });

      updateSuspenseAsync({ state: "pending", promise });
    }
  } catch (err) {
    updateSuspenseAsync({ state: "error", err });
  }
}

const initDataHtmlClass = "react-streaming_initData";
function getInitData(key, elementId) {
  const elements = Array.from(window.document.querySelectorAll(`.${initDataHtmlClass}`));
  for (const elem of elements) {
    const initData = parse(elem.textContent);
    if (initData.key === key && initData.elementId === elementId) {
      return initData;
    }
  }
  return null;
}

const suspenses = getGlobalVariable("suspenses", {});
export function useAsync(keyValue, asyncFn, needsWorkaround = true) {
  const key = stringify(keyValue, { sortObjectKeys: true });
  const elementId = useId();

  const resolver = async () => await asyncFn();

  const resolverSync = () => {
    const initData = getInitData(key, elementId);
    return initData ? initData.value : null;
  };

  return useSuspense({ suspenses, resolver, resolverSync, key, elementId, needsWorkaround });
}
