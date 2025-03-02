import React from 'react';
/**
 * Hook of persistent methods
 */
export default function useMethods(methods) {
    const { current } = React.useRef({
        methods,
        func: undefined,
    });
  
    current.methods = methods;
  
    if (!current.func) {
        const func = Object.create(null);
        Object.keys(methods).forEach(key => {
            func[key] = (...args) => current.methods[key].call(current.methods, ...args);
        });
        current.func = func;
    }
  
    return current.func;
}

export function useFunction(fn) {
    const { current } = React.useRef({ fn, result: undefined });
    
    current.fn = fn;
    
    if (!current.result) {
        current.result = ((...args) => current.fn.call(null, ...args));
    }
    
    return current.result;
}
