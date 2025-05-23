import { KEYBORG_FOCUSIN, createKeyborg, disposeKeyborg } from "keyborg";

const FOCUS_WITHIN_ATTR = 'focus-within'
/**
 * A ponyfill that allows `:focus-within` to support visibility based on keyboard/mouse navigation
 * like `:focus-visible` https://github.com/WICG/focus-visible/issues/151
 * @returns ref to the element that uses `:focus-within` styles
 */
export function applyFocusWithinPolyfill(element, win) {
  const keyborg = createKeyborg(win);
  // When navigation mode changes to mouse, remove the focus-within selector
  keyborg.subscribe((isNavigatingWithKeyboard) => {
    if (!isNavigatingWithKeyboard) {
      removeFocusWithinClass(element);
    }
  });
  // Keyborg's focusin event is delegated so it's only registered once on the window
  // and contains metadata about the focus event
  const keyborgListener = (e) => {
    if (keyborg.isNavigatingWithKeyboard() && isHTMLElement(e.target)) {
      // Griffel can't create chained global styles so use the parent element for now
      applyFocusWithinClass(element);
    }
  };
  // Make sure that when focus leaves the scope, the focus within class is removed
  const blurListener = (e) => {
    if (
      !e.relatedTarget ||
      (isHTMLElement(e.relatedTarget) && !element.contains(e.relatedTarget))
    ) {
      removeFocusWithinClass(element);
    }
  };
  element.addEventListener(KEYBORG_FOCUSIN, keyborgListener);
  element.addEventListener("focusout", blurListener);
  // Return disposer
  return () => {
    element.removeEventListener(KEYBORG_FOCUSIN, keyborgListener);
    element.removeEventListener("focusout", blurListener);
    disposeKeyborg(keyborg);
  };
}
function applyFocusWithinClass(el) {
  el.setAttribute(FOCUS_WITHIN_ATTR, "");
}
function removeFocusWithinClass(el) {
  el.removeAttribute(FOCUS_WITHIN_ATTR);
}
function isHTMLElement(target) {
  if (!target) {
    return false;
  }
  return Boolean(
    target &&
      typeof target === "object" &&
      "classList" in target &&
      "contains" in target
  );
}
