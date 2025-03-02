import React, { createContext, useContext } from 'react';
import { Input } from 'sensd';

export const defaultComposeOptions = {
  className: "",
  displayName: "",
  render: (props, ref, options) => options.origRender(props, ref, options),
  origRender: (props, ref, { Component }) => <Component {...props} ref={ref} />,
  state: (props) => props,
};

export function compose(input, options = {}) {
  const inputOptions = { ...defaultComposeOptions, ...options };

  const Component = React.forwardRef((props, ref) => inputOptions.render(props, ref, {
    ...inputOptions,
    state: inputOptions.state(props, ref, inputOptions),
    Component: input,
  }));

  Component.displayName = inputOptions.displayName || input.displayName;

  if (input.defaultProps) {
    Component.defaultProps = input.defaultProps;
  }

  Component.composeOptions = inputOptions;

  return Component;
}

export const FormModeEnum = {
  Detail: 'Detail',
  Create: 'Create',
  Edit: 'Edit',
}

export const FormModeContext = createContext(FormModeEnum.Create);

export function useModeContext() {
  return useContext(FormModeContext);
}

export const InputMode = compose(Input, {
  render: (props, ref, options) => {
    const formModel = useModeContext()
    
    if (formModel !== FormModeEnum.Detail) {
      return options.origRender(props, ref, options)
    }
    return <div>{ props.value || '空' }</div>  }
});


export const TextArea = compose(Input.TextArea, {
  render: (props, ref, options) => {
    const formModel = useModeContext()
    
    if (formModel !== FormModeEnum.Detail) {
      return options.origRender(props, ref, options)
    }
    return <div>{ props.value || '空' }</div>
  }
});