import { useEffect, useReducer, useRef } from 'react';

export const useConstant = (compute) => {
  const ref = useRef(null);
  if (ref.current === null) {
    ref.current = compute();
  }
  return ref.current;
};

const createInitialState = (definition) => {
  const nextEvents = Object.keys({
    ...(definition.states[definition.initial].on ?? {}),
    ...(definition.on ?? {})
  });

  return {
    value: definition.initial,
    context: definition.context,
    event: { type: '$$initial' },
    nextEvents,
  };
};

const createReducer = (definition) => {
  return (machineState, internalEvent) => {
    switch (internalEvent.type) {
      case 'SET_CONTEXT':
        const nextContext = internalEvent.updater(machineState.context);
        return { ...machineState, context: nextContext };

      case 'SEND':
        const sendable = internalEvent.sendable;
        const event = typeof sendable === 'string' ? { type: sendable } : sendable;
        const context = machineState.context;
        const stateNode = definition.states[machineState.value];
        const resolvedTransition = (stateNode.on ?? {})[event.type] ?? (definition.on ?? {})[event.type];

        if (!resolvedTransition) {
          return machineState;
        }

        const [nextStateValue, didGuardDeny = false] = (() => {
          if (typeof resolvedTransition === 'string') {
            return [resolvedTransition];
          }
          if (resolvedTransition.guard === void 0) {
            return [resolvedTransition.target];
          }
          if (resolvedTransition.guard({ context, event })) {
            return [resolvedTransition.target];
          }
          return [resolvedTransition.target, true];
        })();

        if (didGuardDeny) {
          return machineState;
        }

        const resolvedStateNode = definition.states[nextStateValue];
        const nextEvents = Object.keys({
          ...(resolvedStateNode.on ?? {}),
          ...(definition.on ?? {})
        });

        return {
          value: nextStateValue,
          context,
          event,
          nextEvents,
        };

      default: throw new Error('不可抵达之');
    }
  };
};

export const useStateMachine = (definition) => {
  const [state, dispatch] = useReducer(
    createReducer(definition),
    createInitialState(definition)
  );

  const send = useConstant(() => (sendable) => dispatch({ type: 'SEND', sendable }));

  const setContext = (updater) => {
    dispatch({ type: 'SET_CONTEXT', updater });
    return { send };
  };

  useEffect(() => {
    const entry = definition.states[state.value].effect;
    const exit = entry?.({ send, setContext, event: state.event, context: state.context });

    return typeof exit === 'function'
      ? () => exit?.({ send, setContext, event: state.event, context: state.context })
      : void 0;
  }, [state.value, state.event]);

  return [state, send];
};