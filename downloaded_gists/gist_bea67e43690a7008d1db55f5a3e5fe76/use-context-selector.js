import {
    createElement,
    createContext as createContextOrig,
    useContext as useContextOrig,
    useLayoutEffect,
    useReducer,
    useRef
} from 'react';

import {
    unstable_batchedUpdates as batchedUpdates
} from 'react-dom';

import {
    unstable_NormalPriority as NormalPriority,
    unstable_runWithPriority as runWithPriority
} from 'scheduler';

const CONTEXT_VALUE = Symbol();
const ORIGINAL_PROVIDER = Symbol();
const identity = x => x;

const createProvider = (ProviderOrig) => ({ value, children }) => {
    const valueRef = useRef(value);
    const versionRef = useRef(0);
    const contextValue = useRef();

    if (!contextValue.current) {
        const listeners = new Set();
        const update = (thunk = identity) => {
            batchedUpdates(() => {
                versionRef.current += 1;
                listeners.forEach(listener => listener([versionRef.current]));
                thunk();
            });
        };

        contextValue.current = {
            [CONTEXT_VALUE]: {
                /* "v"alue     */ v: valueRef,
                /* versio"n"   */ n: versionRef,
                /* "l"isteners */ l: listeners,
                /* "u"pdate    */ u: update,
            },
        };
    }

    useLayoutEffect(() => {
        valueRef.current = value;
        versionRef.current += 1;

        runWithPriority(NormalPriority, () => {
            contextValue.current[CONTEXT_VALUE].l.forEach(listener => listener([versionRef.current, value]));
        });
    }, [value]);

    return createElement(ProviderOrig, { value: contextValue.current }, children);
};

export function createContext(defaultValue) {
    const context = createContextOrig({
        [CONTEXT_VALUE]: {
            /* "v"alue     */ v: { current: defaultValue },
            /* versio"n"   */ n: { current: -1 },
            /* "l"isteners */ l: new Set(),
            /* "u"pdate    */ u: f => f(),
        },
    });
    context[ORIGINAL_PROVIDER] = context.Provider;
    context.Provider = createProvider(context.Provider);
    delete context.Consumer; // no support for Consumer
    return context;
}

export function useContextSelector(context, selector) {
    const contextValue = useContextOrig(context)[CONTEXT_VALUE];

    if (!contextValue) {
        throw new Error('useContextSelector requires special context');
    }

    const {
    /* "v"alue     */ v: { current: value },
    /* versio"n"   */ n: { current: version },
    /* "l"isteners */ l: listeners
    } = contextValue;

    const selected = selector(value);
    const [state, dispatch] = useReducer((prev, action) => {
        if (version < action[0]) {
            try {
                if (action.length === 2 && (Object.is(prev.value, action[1]) || Object.is(prev.selected, selector(action[1])))) {
                    return prev; // do not update
                }
            }
            catch (e) {
                // ignored (stale props or some other reason)
            }
            return Object.assign({}, prev); // schedule update
        }

        if (Object.is(prev.value, value) || Object.is(prev.selected, selected)) {
            return prev; // bail out
        }
        return { value, selected };
    }, { value, selected });

    useLayoutEffect(() => {
        listeners.add(dispatch);
        return () => {
            listeners.delete(dispatch);
        };
    }, [listeners]);

    return state.selected;
}

export function useContext(context) {
    return useContextSelector(context, identity);
}

export function useContextUpdate(context) {
    const contextValue = useContextOrig(context)[CONTEXT_VALUE];

    if (!contextValue) {
        throw new Error('useContextUpdate requires special context');
    }

    return contextValue.u; /* "u"pdate    */
}

export const BridgeProvider = ({ context, value, children }) => {
    const { [ORIGINAL_PROVIDER]: ProviderOrig } = context;

    if (!ProviderOrig) {
        throw new Error('BridgeProvider requires special context');
    }

    return createElement(ProviderOrig, { value }, children);
};

export const useBridgeValue = (context) => {
    const bridgeValue = useContextOrig(context);

    if (!bridgeValue[CONTEXT_VALUE]) {
        throw new Error('useBridgeValue requires special context');
    }

    return bridgeValue;
};
