import React, { useImperativeHandle, useLayoutEffect, useRef, } from "react";

/**
 * Creates a named context, provider, and hook.
 *
 * @param options create context options
 */
export function createContext(options = {}) {
  const { strict = true, errorMessage = "useContext: `context` is undefined. Seems you forgot to wrap component within the Provider", name, } = options;
  const Context = React.createContext(undefined);
  Context.displayName = name;
  
  function useContext() {
      const context = React.useContext(Context);
      if (!context && strict) {
          const error = new Error(errorMessage);
          error.name = "ContextError";
          Error.captureStackTrace?.(error, useContext);
          throw error;
      }
      return context;
  }
  return [Context.Provider, useContext, Context];
}

export function canUseDOM() {
    return !!(typeof window !== "undefined" && window.document && window.document.createElement);
}
export const isBrowser = canUseDOM();

function getUserAgentBrowser(navigator) {
    const { userAgent: ua, vendor } = navigator;
    const android = /(android)/i.test(ua);
    switch (true) {
        case /CriOS/.test(ua):
            return "Chrome for iOS";
        case /Edg\//.test(ua):
            return "Edge";
        case android && /Silk\//.test(ua):
            return "Silk";
        case /Chrome/.test(ua) && /Google Inc/.test(vendor):
            return "Chrome";
        case /Firefox\/\d+\.\d+$/.test(ua):
            return "Firefox";
        case android:
            return "AOSP";
        case /MSIE|Trident/.test(ua):
            return "IE";
        case /Safari/.test(navigator.userAgent) && /Apple Computer/.test(ua):
            return "Safari";
        case /AppleWebKit/.test(ua):
            return "WebKit";
        default:
            return null;
    }
}
function getUserAgentOS(navigator) {
    const { userAgent: ua, platform } = navigator;
    switch (true) {
        case /Android/.test(ua):
            return "Android";
        case /iPhone|iPad|iPod/.test(platform):
            return "iOS";
        case /Win/.test(platform):
            return "Windows";
        case /Mac/.test(platform):
            return "Mac";
        case /CrOS/.test(ua):
            return "Chrome OS";
        case /Firefox/.test(ua):
            return "Firefox OS";
        default:
            return null;
    }
}
export function detectDeviceType(navigator) {
    const { userAgent: ua } = navigator;
    if (/(tablet)|(iPad)|(Nexus 9)/i.test(ua))
        return "tablet";
    if (/(mobi)/i.test(ua))
        return "phone";
    return "desktop";
}
export function detectOS(os) {
    if (!isBrowser)
        return false;
    return getUserAgentOS(window.navigator) === os;
}
export function detectBrowser(browser) {
    if (!isBrowser)
        return false;
    return getUserAgentBrowser(window.navigator) === browser;
}
export function detectTouch() {
    if (!isBrowser)
        return false;
    return window.ontouchstart === null && window.ontouchmove === null && window.ontouchend === null;
}
export function createDOMRef(ref) {
    return {
        UNSAFE_getDOMNode() {
            return ref.current;
        },
    };
}
export function createFocusableRef(domRef, focusableRef = domRef) {
    return {
        ...createDOMRef(domRef),
        focus() {
            if (focusableRef.current) {
                focusableRef.current.focus();
            }
        },
    };
}
export function useDOMRef(ref) {
    const domRef = useRef(null);
    useImperativeHandle(ref, () => domRef.current);
    return domRef;
}
export function useFocusableRef(ref, focusableRef) {
    const domRef = useRef(null);
    useImperativeHandle(ref, () => createFocusableRef(domRef, focusableRef));
    return domRef;
}
// Syncs ref from context with ref passed to hook
export function useSyncRef(context, ref) {
    useLayoutEffect(() => {
        if (context && context.ref && ref && ref.current) {
            context.ref.current = ref.current;
            return () => {
                if (context.ref?.current) {
                    context.ref.current = null;
                }
            };
        }
    }, [context, ref]);
}

function useSynchronousEffect(func, values) {
  const key = React.useRef([]);
  let output;

  // Store "generation" key. Just returns a new object every time
  const currentKey = React.useMemo(() => ({}), values); 

  // "the first render", or "memo dropped the value"
  if (key.current !== currentKey) {
    key.current = currentKey;
    output = func();
  }

  React.useEffect(
    () => () => {
      if (output) {
        output();
      }
    },
    [currentKey]
  );
}