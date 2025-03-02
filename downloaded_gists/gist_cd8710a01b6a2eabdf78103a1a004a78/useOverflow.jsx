import * as React from 'react';

export const observeResize = (target, onResize) => {
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(onResize);
    if (Array.isArray(target)) {
      target.forEach((t) => observer.observe(t));
    } else {
      observer.observe(target);
    }
    return () => observer.disconnect();
  }

  const onResizeWrapper = () => onResize(void 0);

  // 监听第一个动画帧，这将在布局完成后发生
  const animationFrameId = window.requestAnimationFrame(onResizeWrapper);
  window.addEventListener('resize', onResizeWrapper, false);
  return () => {
    window.cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', onResizeWrapper, false);
  };
};

export function useRefEffect(callback, initial = null) {
  const data = React.useRef({
    ref: (() => {
      const refCallback = (value) => {
        if (data.ref.current !== value) {
          if (data.cleanup) {
            data.cleanup();
            data.cleanup = void 0;
          }
          data.ref.current = value;
          if (value !== null) {
            data.cleanup = data.callback(value);
          }
        }
      };
      refCallback.current = initial;
      return refCallback;
    })(),
    callback,
  }).current;

  data.callback = callback;
  return data.ref;
}

/**
 * Track whether any items don't fit within their container, and move them to the overflow menu.
 * Items are moved into the overflow menu from back to front, excluding pinned items.
 *
 * The overflow menu button must be the last sibling of all of the items that can be put into the overflow, and it
 * must be hooked up to the `setMenuButtonRef` setter function that's returned by `useOverflow`:
 * ```ts
 * const overflow = useOverflow(...);
 * ```
 *
 * ```jsx
 * <Container>
 *  <Item /> // Index 0
 *  <Item /> // Index 1
 *  ...
 *  <Button ref={overflow.setMenuButtonRef} /> // Can be any React.Component or HTMLElement
 * </Container>
 * ```
 */
export const useOverflow = ({ onOverflowItemsChanged, rtl, pinnedIndex }) => {
  const updateOverflowRef = React.useRef();
  const containerWidthRef = React.useRef();

  // Attach a resize observer to the container
  const containerRef = useRefEffect((container) => {
    const cleanupObserver = observeResize(container, (entries) => {
      containerWidthRef.current = entries ? entries[0].contentRect.width : container.clientWidth;
      if (updateOverflowRef.current) {
        updateOverflowRef.current();
      }
    });
    return () => {
      cleanupObserver();
      containerWidthRef.current = void 0;
    };
  });

  const menuButtonRef = useRefEffect((menuButton) => {
    containerRef(menuButton.parentElement);
    return () => containerRef(null);
  });

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const menuButton = menuButtonRef.current;

    if (!container || !menuButton) {
      return;
    }

    // items contains the container's children, excluding the overflow menu button itself
    const items = [];
    for (let i = 0; i < container.children.length; i++) {
      const item = container.children[i];
      if (item instanceof HTMLElement && item !== menuButton) {
        items.push(item);
      }
    }

    // Keep track of the minimum width of the container to fit each child index.
    // This cache is an integral part of the algorithm and not just a performance optimization: it allows us to
    // recalculate the overflowIndex on subsequent resizes even if some items are already inside the overflow.
    const minContainerWidth = [];
    let extraWidth = 0; // The accumulated width of items that don't move into the overflow
    updateOverflowRef.current = () => {
      const containerWidth = containerWidthRef.current;
      if (containerWidth === void 0) {
        return;
      }
      // Iterate the items in reverse order until we find one that fits within the bounds of the container
      for (let i = items.length - 1; i >= 0; i--) {
        // Calculate the min container width for this item if we haven't done so yet
        if (minContainerWidth[i] === void 0) {
          const itemOffsetEnd = rtl
            ? containerWidth - items[i].offsetLeft
            : items[i].offsetLeft + items[i].offsetWidth;
          // If the item after this one is pinned, reserve space for it
          if (i + 1 < items.length && i + 1 === pinnedIndex) {
            // Use distance between the end of the previous item and this one (rather than the
            // pinned item's offsetWidth), to account for any margin between the items.
            extraWidth = minContainerWidth[i + 1] - itemOffsetEnd;
          }
          // Reserve space for the menu button after the first item was added to the overflow
          if (i === items.length - 2) {
            extraWidth += menuButton.offsetWidth;
          }
          minContainerWidth[i] = itemOffsetEnd + extraWidth;
        }
        if (containerWidth > minContainerWidth[i]) {
          setOverflowIndex(i + 1);
          return;
        }
      }
      // If we got here, nothing fits outside the overflow
      setOverflowIndex(0);
    };

    let prevOverflowIndex = items.length;
    const setOverflowIndex = (overflowIndex) => {
      if (prevOverflowIndex !== overflowIndex) {
        prevOverflowIndex = overflowIndex;
        onOverflowItemsChanged(
          overflowIndex,
          items.map((ele, index) => ({
            ele,
            isOverflowing: index >= overflowIndex && index !== pinnedIndex,
          }))
        );
      }
    };
    let cancelAnimationFrame;
    // If the container width is already known from a previous render, update the overflow with its width.
    // Do this in an animation frame to avoid forcing layout to happen early.
    if (containerWidthRef.current !== void 0) {
      const animationFrameId = window.requestAnimationFrame(updateOverflowRef.current);
      cancelAnimationFrame = () => window.cancelAnimationFrame(animationFrameId);
    }
    return () => {
      if (cancelAnimationFrame) {
        cancelAnimationFrame();
      }
      // On cleanup, need to remove all items from the overflow
      // so they don't have stale properties on the next render
      setOverflowIndex(items.length);
      updateOverflowRef.current = void 0;
    };
  });

  return { menuButtonRef };
};
