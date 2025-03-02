import * as React from 'react';

export function useConst(initialValue) {
  const ref = React.useRef();
  if (ref.current === void 0) {
    ref.current = {
      value: typeof initialValue === 'function' ? initialValue() : initialValue,
    };
  }
  return ref.current.value;
}

export function useControllableValue(controlledValue, defaultUncontrolledValue, onChange) {
  const [value, setValue] = React.useState(defaultUncontrolledValue);
  const isControlled = useConst(controlledValue !== void 0);
  const currentValue = isControlled ? controlledValue : value;

  const valueRef = React.useRef(currentValue);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    valueRef.current = currentValue;
    onChangeRef.current = onChange;
  });

  const setValueOrCallOnChange = useConst(() => (update, ev) => {
    const newValue = typeof update === 'function' ? update(valueRef.current) : update;
    if (onChangeRef.current) {
      onChangeRef.current(ev, newValue);
    }
    if (!isControlled) {
      setValue(newValue);
    }
  });
  return [currentValue, setValueOrCallOnChange];
}
