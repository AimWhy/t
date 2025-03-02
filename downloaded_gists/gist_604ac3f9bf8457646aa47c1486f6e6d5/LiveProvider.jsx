import React, { useEffect, useState } from 'react';

export const LiveContext = React.createContext({
    code: '',
    onCodeChange: () => { },
    element: void 0,
    errorMessage: void 0
});

export class ErrorBoundary extends React.Component {
    componentDidCatch(error) {
        this.props.onError(error);
    }
    render() {
        return this.props.children;
    }
}

function evalCode(code, scope) {
    const scopeKeys = Object.keys(scope);
    const scopeValues = Object.values(scope);
    const func = new Function('React', ...scopeKeys, code);
    return func(React, ...scopeValues);
}

export async function renderElementAsync(code, scope, onError) {
    return new Promise((resolve, reject) => {
        function render(element) {
            if (!element)
                reject(new Error('`render` must be called with valid JSX.'));
            resolve(<ErrorBoundary onError={onError}>{element}</ErrorBoundary>);
        }

        if (!/render\s*\(/.test(code)) {
            throw new Error('You must call `render`.');
        }

        evalCode(code, { ...scope, render });
    });
}

export function LiveProvider({ defaultCode, scope, transformCode, children }) {
    const [errorMessage, setErrorMessage] = useState();
    const [element, setElement] = useState();
    const [code, setCode] = useState(defaultCode);

    useEffect(() => {
        async function effectAsync() {
            function onError(e) {
                setErrorMessage(e.toString());
                setElement(void 0);
            }

            try {
                const transformedCode = await transformCode(code);
                setErrorMessage(void 0);
                const element = await renderElementAsync(transformedCode, scope, onError);
                setElement(element);
            } catch (e) {
                onError(e);
            }
        }

        effectAsync();
    }, [code, scope, transformCode]);

    return (<LiveContext.Provider value={{ code, setCode, errorMessage, element }}>
        {children}
    </LiveContext.Provider>);
}
