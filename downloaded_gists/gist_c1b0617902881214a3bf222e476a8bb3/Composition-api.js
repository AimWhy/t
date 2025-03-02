export function createContext() {
    let currentInstance = null;
    
    return {
        use: () => currentInstance,
        call: (instance, cb) => {
            if (currentInstance && currentInstance !== instance) {
                throw new Error('Context conflict');
            }
            currentInstance = instance;
            const res = cb();
            currentInstance = null;
            return res;
        }
    };
}

export function createNamespace() {
    const contexts = {};
    return {
        get(key) {
            if (!contexts[key]) {
                contexts[key] = createContext();
            }
            return contexts[key];
        }
    };
}

const _globalThis = window;
const globalKey = '__unctx__';
export const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
export const getContext = (key) => defaultNamespace.get(key);
export const useContext = (key) => getContext(key).use;