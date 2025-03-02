import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, } from 'react';

export function useDynamicCallback(callback) {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  return useCallback((...args) => ref.current(...args), []);
}

export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function useScrollControllerContextValue() {
  const scrollEventsEnabledRef = useRef(true);
  return useMemo(() => ({
    scrollEventsEnabledRef,
    enableScrollEvents: () => {
      scrollEventsEnabledRef.current = true;
    },
    disableScrollEvents: () => {
      scrollEventsEnabledRef.current = false;
    },
  }), []);
}

const ScrollMonitorContext = React.createContext(undefined);
export function ScrollControllerProvider({ children, }) {
  const value = useScrollControllerContextValue();
  return (<ScrollMonitorContext.Provider value={value}>
    {children}
  </ScrollMonitorContext.Provider>);
}

export function useScrollController() {
  const context = useContext(ScrollMonitorContext);
  if (context == null) {
    throw new Error('ScrollControllerProvider');
  }
  return context;
}

const getScrollPosition = () => ({
  scrollX: window.pageXOffset,
  scrollY: window.pageYOffset,
});

export function useScrollPosition(effect, deps = []) {
  const { scrollEventsEnabledRef } = useScrollController();
  const lastPositionRef = useRef(getScrollPosition());
  const dynamicEffect = useDynamicCallback(effect);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollEventsEnabledRef.current) {
        return;
      }
      const currentPosition = getScrollPosition();
      if (dynamicEffect) {
        dynamicEffect(currentPosition, lastPositionRef.current);
      }
      lastPositionRef.current = currentPosition;
    };
    const opts = {
      passive: true,
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, opts);
    return () => window.removeEventListener('scroll', handleScroll, opts);
  }, [dynamicEffect, scrollEventsEnabledRef, ...deps]);
}

function useScrollPositionSaver() {
  const lastElementRef = useRef({ elem: null, top: 0 });
  const save = useCallback((elem) => {
    lastElementRef.current = { elem, top: elem.getBoundingClientRect().top };
  }, []);

  const restore = useCallback(() => {
    const { current: { elem, top }, } = lastElementRef;
    if (!elem) {
      return { restored: false };
    }
    const newTop = elem.getBoundingClientRect().top;
    const heightDiff = newTop - top;
    if (heightDiff) {
      window.scrollBy({ left: 0, top: heightDiff });
    }
    lastElementRef.current = { elem: null, top: 0 };
    return { restored: heightDiff !== 0 };
  }, []);
  return useMemo(() => ({ save, restore }), [restore, save]);
}
/**
 * This hook permits to "block" the scroll position of a DOM element.
 * The idea is that we should be able to update DOM content above this element
 * but the screen position of this element should not change.
 *
 * Feature motivated by the Tabs groups: clicking on a tab may affect tabs of
 * the same group upper in the tree, yet to avoid a bad UX, the clicked tab must
 * remain under the user mouse.
 *
 * @see https://github.com/facebook/docusaurus/pull/5618
 */
export function useScrollPositionBlocker() {
  const scrollController = useScrollController();
  const scrollPositionSaver = useScrollPositionSaver();
  const nextLayoutEffectCallbackRef = useRef(undefined);
  const blockElementScrollPositionUntilNextRender = useCallback((el) => {
    scrollPositionSaver.save(el);
    scrollController.disableScrollEvents();
    nextLayoutEffectCallbackRef.current = () => {
      const { restored } = scrollPositionSaver.restore();
      nextLayoutEffectCallbackRef.current = undefined;
      // Restoring the former scroll position will trigger a scroll event. We
      // need to wait for next scroll event to happen before enabling the
      // scrollController events again.
      if (restored) {
        const handleScrollRestoreEvent = () => {
          scrollController.enableScrollEvents();
          window.removeEventListener('scroll', handleScrollRestoreEvent);
        };
        window.addEventListener('scroll', handleScrollRestoreEvent);
      }
      else {
        scrollController.enableScrollEvents();
      }
    };
  }, [scrollController, scrollPositionSaver]);
  useLayoutEffect(() => {
    nextLayoutEffectCallbackRef.current?.();
  });
  return {
    blockElementScrollPositionUntilNextRender,
  };
}
function smoothScrollNative(top) {
  window.scrollTo({ top, behavior: 'smooth' });
  return () => {
    // Nothing to cancel, it's natively cancelled if user tries to scroll down
  };
}
function smoothScrollPolyfill(top) {
  let raf = null;
  const isUpScroll = document.documentElement.scrollTop > top;
  function rafRecursion() {
    const currentScroll = document.documentElement.scrollTop;
    if ((isUpScroll && currentScroll > top) ||
      (!isUpScroll && currentScroll < top)) {
      raf = requestAnimationFrame(rafRecursion);
      window.scrollTo(0, Math.floor((currentScroll - top) * 0.85) + top);
    }
  }
  rafRecursion();

  return () => raf && cancelAnimationFrame(raf);
}

export function useSmoothScrollTo() {
  const cancelRef = useRef(null);
  // Not all have support for smooth scrolling (particularly Safari mobile iOS)
  // TODO proper detection is currently unreliable!
  // see https://github.com/wessberg/scroll-behavior-polyfill/issues/16
  // For now, we only use native scroll behavior if smooth is already set,
  // because otherwise the polyfill produces a weird UX when both CSS and JS try
  // to scroll a page, and they cancel each other.
  const supportsNativeSmoothScrolling = getComputedStyle(document.documentElement).scrollBehavior === 'smooth';
  return {
    startScroll: (top) => {
      cancelRef.current = supportsNativeSmoothScrolling
        ? smoothScrollNative(top)
        : smoothScrollPolyfill(top);
    },
    cancelScroll: () => cancelRef.current?.(),
  };
}