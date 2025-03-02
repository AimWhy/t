import React, { useLayoutEffect } from 'react';
import {
  unstable_NormalPriority as NormalPriority,
  unstable_runWithPriority as runWithPriority,
} from 'scheduler';

export function runWithNormalPriority(thunk) {
  return runWithPriority(NormalPriority, thunk);
}

const createProvider = (Original) => {
  const Provider = (props) => {
    const valueRef = React.useRef(props.value);
    const versionRef = React.useRef(0);
    const contextValue = React.useRef();

    if (!contextValue.current) {
      contextValue.current = {
        value: valueRef,
        version: versionRef,
        listeners: [],
      };
    }

    useLayoutEffect(() => {
      valueRef.current = props.value;
      versionRef.current += 1;
      runWithNormalPriority(() => {
        contextValue.current.listeners.forEach((listener) => {
          listener({ version: versionRef.current, value: props.value });
        });
      });
    }, [props.value]);

    return React.createElement(
      Original,
      { value: contextValue.current },
      props.children
    );
  };
  return Provider;
};

// We don't support Consumer API
export const createContext = (defaultValue) => {
  const context = React.createContext({
    value: { current: defaultValue },
    version: { current: -1 },
    listeners: [],
  });
  context.Provider = createProvider(context.Provider);
  delete context.Consumer;
  return context;
};

/**
 * This hook returns context selected value by selector.
 * It will only accept context created by `createContext`.
 * It will trigger re-render if only the selected value is referencially changed.
 */
export const useContextSelector = (context, selector) => {
  const contextValue = React.useContext(context);
  const {
    value: { current: value },
    version: { current: version },
    listeners,
  } = contextValue;
  const selected = selector(value);

  const [state, dispatch] = React.useReducer(
    (prevState, payload) => {
      if (!payload) {
        // 在渲染期间调度时提前救助
        return [value, selected];
      }
      if (payload.version <= version) {
        if (Object.is(prevState[1], selected)) {
          return prevState; // bail out
        }
        return [value, selected];
      }
      try {
        if (Object.is(prevState[0], payload.value)) {
          return prevState; // do not update
        }
        const nextSelected = selector(payload.value);
        if (Object.is(prevState[1], nextSelected)) {
          return prevState; // do not update
        }
        return [payload.value, nextSelected];
      } catch (e) {
        // ignored (stale props or some other reason)
      }
      return [...prevState]; // schedule update
    },
    [value, selected]
  );
  if (!Object.is(state[1], selected)) {
    // schedule re-render
    // this is safe because it's self contained
    dispatch(undefined);
  }

  useLayoutEffect(() => {
    listeners.push(dispatch);
    return () => {
      const index = listeners.indexOf(dispatch);
      listeners.splice(index, 1);
    };
  }, [listeners]);
  return state[1];
};

export const useContextSelectors = (context, selectors) => {
  const contextValue = React.useContext(context);
  const {
    value: { current: value },
    version: { current: version },
    listeners,
  } = contextValue;

  const selected = {};
  Object.keys(selectors).forEach((key) => {
    selected[key] = selectors[key](value);
  });

  const [state, dispatch] = React.useReducer(
    (prevState, payload) => {
      if (!payload) {
        return [value, selected];
      }
      if (payload.version <= version) {
        const stateHasNotChanged = Object.keys(selectors).every((key) =>
          Object.is(prevState[1][key], selected[key])
        );
        if (stateHasNotChanged) {
          return prevState;
        }
        return [value, selected];
      }
      try {
        const statePayloadHasChanged = Object.keys(prevState[0]).some((key) => {
          return !Object.is(prevState[0][key], payload.value[key]);
        });
        if (!statePayloadHasChanged) {
          return prevState;
        }
        const nextSelected = {};
        Object.keys(selectors).forEach((key) => {
          nextSelected[key] = selectors[key](payload.value);
        });
        const selectedHasNotChanged = Object.keys(selectors).every((key) => {
          return Object.is(
            prevState[1][key] /* previous { [key]: selector(value) } */,
            nextSelected[key]
          );
        });
        if (selectedHasNotChanged) {
          return prevState;
        }
        return [payload.value, nextSelected];
      } catch (e) {
        // ignored (stale props or some other reason)
      }
      return [...prevState]; // schedule update
    },
    [value, selected]
  );

  // schedule re-render when selected context is updated
  const hasSelectedValuesUpdates = Object.keys(selectors).find(
    (key) => !Object.is(state[1][key], selected[key])
  );
  if (hasSelectedValuesUpdates !== undefined) {
    dispatch(undefined);
  }

  useLayoutEffect(() => {
    listeners.push(dispatch);
    return () => {
      const index = listeners.indexOf(dispatch);
      listeners.splice(index, 1);
    };
  }, [listeners]);
  return state[1];
};
