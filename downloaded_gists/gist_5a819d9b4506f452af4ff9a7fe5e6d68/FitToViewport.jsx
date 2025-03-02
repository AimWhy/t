
import React, {useLayoutEffect} from 'react';
const scaleProp = '--rftv-scale';

export function FitToViewport({ children, width, height, minZoom = 0, maxZoom = 1, T = 'div', autoRotateAt, style, ...props }) {
    return React.createElement(T, {
        ...props,
        style: {
            width,
            height,
            minWidth: width,
            minHeight: height,
            transform: `scale(var(${scaleProp}))`,
            ...style,
        },
    }, 
    React.createElement(GenerateScaleVar, { width, height, minZoom, maxZoom, autoRotateAt }), 
    React.createElement(AutoRotateStyle, { breakpoint: autoRotateAt }), 
    children);
}

function AutoRotateStyle({ breakpoint }) {
    return breakpoint ? (React.createElement("style", { 
        children: `
            @media ${rotateMediaQuery(breakpoint)} {
                html {
                    transform: rotate(-90deg);
                    transform-origin: left top;
                    width: 100vh;
                    height: 100vw;
                    overflow-x: hidden;
                    position: absolute;
                    top: 100%;
                    left: 0;
                }
            }` 
    })) : null;
}

function GenerateScaleVar({ width, height, minZoom = 0, maxZoom = 1, autoRotateAt }) {
    const js = `
        (function() {
            var setScaleProp = ${setScaleProp.toString()}
            setScaleProp(
                ${width},
                ${height},
                ${minZoom},
                ${maxZoom},
                ${autoRotateAt},
                "${rotateMediaQuery(autoRotateAt)}",
                "${scaleProp}"
            )  
        })()`;

    useLayoutEffect(() => {
        function resetScale() {
            setScaleProp(width, height, minZoom, maxZoom, autoRotateAt, rotateMediaQuery(autoRotateAt), scaleProp);
        }
        resetScale();
        window.addEventListener('resize', resetScale);
        return () => {
            window.removeEventListener('resize', resetScale);
        };
    }, [width, height, minZoom, maxZoom, autoRotateAt]);
    return React.createElement("script", { dangerouslySetInnerHTML: { __html: js } });
}

function setScaleProp(width, height, minZoom, maxZoom, autoRotateAt, mediaQuery, scaleProp) {
    var root = document.documentElement;
    var rotate = autoRotateAt && window.matchMedia(mediaQuery).matches;
    var vw = rotate ? root.clientHeight : root.clientWidth;
    var vh = rotate ? root.clientWidth : root.clientHeight;
    var scale = Math.max(minZoom, Math.min(maxZoom, vw / width, vh / height));
    root.style.setProperty(scaleProp, scale.toString());
}

function rotateMediaQuery(breakpoint) {
    return `screen and (max-width: ${breakpoint}px) and (orientation: portrait)`;
}