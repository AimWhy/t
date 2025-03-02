import React, { createContext, useEffect, useRef } from 'react'

const createContextCleaner = (...contexts) => {
  return ({ children }) => {
    return contexts.reduce((buf, ctx) => {
      return React.createElement(ctx.Provider, { value: undefined }, buf)
    }, children)
  }
}

export const FormContext = createContext(null)
export const FieldContext = createContext(null)
export const SchemaMarkupContext = createContext(null)
export const SchemaContext = createContext(null)
export const SchemaExpressionScopeContext = createContext(null)
export const SchemaOptionsContext = createContext(null)

export const ContextCleaner = createContextCleaner(
  FieldContext,
  SchemaMarkupContext,
  SchemaContext,
  SchemaExpressionScopeContext,
  SchemaOptionsContext
)

export const useAttach = (target) => {
    const oldTargetRef = useRef(null);
    useEffect(() => {
        if (oldTargetRef.current && target !== oldTargetRef.current) {
            oldTargetRef.current.onUnmount();
        }
        oldTargetRef.current = target;
        target.onMount();
        return () => {
            target.onUnmount();
        };
    }, [target]);
    return target;
};

export const FormProvider = (props) => {
    const form = useAttach(props.form);
    return (<ContextCleaner>
      <FormContext.Provider value={form}>{props.children}</FormContext.Provider>
    </ContextCleaner>);
};
FormProvider.displayName = 'FormProvider';