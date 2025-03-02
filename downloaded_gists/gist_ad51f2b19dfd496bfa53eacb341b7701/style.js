// https://wicg.github.io/construct-stylesheets
const supportsConstructedSheet = (() => {
    // TODO: re-enable this try block once Chrome fixes the performance of
    // rule insertion in really big stylesheets
    // try {
    //   new CSSStyleSheet()
    //   return true
    // } catch (e) {}
    return false;
})();
const sheetsMap = new Map();
export function updateStyle(id, content) {
    let style = sheetsMap.get(id);
    if (supportsConstructedSheet && !content.includes('@import')) {
        if (style && !(style instanceof CSSStyleSheet)) {
            removeStyle(id);
            style = undefined;
        }
        if (!style) {
            style = new CSSStyleSheet();
            style.replaceSync(content);
            // @ts-expect-error: using experimental API
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];
        }
        else {
            style.replaceSync(content);
        }
    }
    else {
        if (style && !(style instanceof HTMLStyleElement)) {
            removeStyle(id);
            style = undefined;
        }
        if (!style) {
            style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.innerHTML = content;
            document.head.appendChild(style);
        }
        else {
            style.innerHTML = content;
        }
    }
    sheetsMap.set(id, style);
}
export function removeStyle(id) {
    const style = sheetsMap.get(id);
    if (style) {
        if (style instanceof CSSStyleSheet) {
            // @ts-expect-error: using experimental API
            document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== style);
        }
        else {
            document.head.removeChild(style);
        }
        sheetsMap.delete(id);
    }
}
