"use strict";
function useExternalRenderer(renderCallback, inputs) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        if (!ref.current)
            return;
        const root = renderCallback();
        ref.current.append(root);
        return () => {
            if (ref.current?.contains(root))
                ref.current.removeChild(root);
        };
    }, inputs);
    return ref;
}
