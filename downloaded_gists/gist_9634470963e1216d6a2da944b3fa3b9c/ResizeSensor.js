export class ResizeSensor {
    static attach(element, callback) {
        const lifecycle = ResizeSensor.debounce(callback);
        const resizeSensor = document.createElement("div");
        resizeSensor.className = 'resize-sensor';
        resizeSensor.style.cssText = ResizeSensor.RESIZE_SENSOR_STYLE;
        resizeSensor.innerHTML = ResizeSensor.RESIZE_SENSOR_HTML;
        element.appendChild(resizeSensor);
        if (getComputedStyle(element, null).getPropertyValue("position") === "static") {
            element.style.position = "relative";
        }
        const expand = resizeSensor.childNodes[0];
        const expandChild = expand.childNodes[0];
        const shrink = resizeSensor.childNodes[1];
        const reset = () => {
            expandChild.style.width = "100000px";
            expandChild.style.height = "100000px";
            expand.scrollLeft = 100000;
            expand.scrollTop = 100000;
            shrink.scrollLeft = 100000;
            shrink.scrollTop = 100000;
        };
        reset();
        let lastWidth;
        let lastHeight;
        const onScroll = () => {
            if (element == null) {
                return;
            }
            const currentWidth = element.offsetWidth;
            const currentHeight = element.offsetHeight;
            if (currentWidth !== lastWidth || currentHeight !== lastHeight) {
                lastWidth = currentWidth;
                lastHeight = currentHeight;
                lifecycle.trigger();
            }
            reset();
        };
        expand.addEventListener("scroll", onScroll);
        shrink.addEventListener("scroll", onScroll);
        return () => {
            element.removeChild(resizeSensor);
            lifecycle.cancelled = true;
        };
    }
    static { this.RESIZE_SENSOR_STYLE = "position: absolute; left: 0; top: 0; right: 0; " +
        "bottom: 0; overflow: hidden; z-index: -1; visibility: hidden;"; }
    static { this.RESIZE_SENSOR_HTML = `<div class="resize-sensor-expand"
        style="${ResizeSensor.RESIZE_SENSOR_STYLE}"><div style="position: absolute; left: 0; top: 0; transition: 0s;"
        ></div></div><div class="resize-sensor-shrink" style="${ResizeSensor.RESIZE_SENSOR_STYLE}"
        ><div style="position: absolute; left: 0; top: 0; transition: 0s; width: 200%; height: 200%;"></div></div>`; }
    static debounce(callback) {
        const scope = {
            cancelled: false,
            trigger: () => {
                if (scope.triggered || scope.cancelled) {
                    return;
                }
                scope.triggered = true;
                requestAnimationFrame(() => {
                    scope.triggered = false;
                    if (!scope.cancelled) {
                        callback();
                    }
                });
            },
            triggered: false,
        };
        return scope;
    }
}