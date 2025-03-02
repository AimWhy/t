import React, { useContext, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';

export function useSubscription({ getCurrentValue, subscribe }) {
  const [state, setState] = useState(() => ({
    getCurrentValue,
    subscribe,
    value: getCurrentValue(),
  }));

  let valueToReturn = state.value;
  if (state.getCurrentValue !== getCurrentValue || state.subscribe !== subscribe) {
    valueToReturn = getCurrentValue();
    setState({
      getCurrentValue,
      subscribe,
      value: valueToReturn,
    });
  }

  useEffect(() => {
    let didUnsubscribe = false;
    const checkForUpdates = () => {
      if (didUnsubscribe) {
        return;
      }
      setState((prevState) => {
        if (prevState.getCurrentValue !== getCurrentValue || prevState.subscribe !== subscribe) {
          return prevState;
        }
        const value = getCurrentValue();
        if (prevState.value === value) {
          return prevState;
        }
        return { ...prevState, value };
      });
    };
    const unsubscribe = subscribe(checkForUpdates);
    checkForUpdates();
    return () => {
      didUnsubscribe = true;
      unsubscribe();
    };
  }, [getCurrentValue, subscribe]);

  return valueToReturn;
}

class InternalConvexClient {
  localQueryResult() {
    return;
  }
  subscribe() {
    return function unsubscribe() {};
  }
}

function createMutation(name, getSync, update = null) {
  function mutation(...args) {
    return getSync().mutate(name, args, update);
  }
  mutation.withOptimisticUpdate = function withOptimisticUpdate(optimisticUpdate) {
    if (update !== null) {
      throw new Error(`Already specified optimistic update for mutation ${name}`);
    }
    return createMutation(name, getSync, optimisticUpdate);
  };
  return mutation;
}
const DEFAULT_OPTIONS = {
  unsavedChangesWarning: true,
};

export class ConvexReactClient {
  constructor(clientConfig, options) {
    this.clientConfig = clientConfig;
    this.listeners = new Map();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get sync() {
    if (this.cachedSync) {
      return this.cachedSync;
    }
    this.cachedSync = new InternalConvexClient(
      this.clientConfig,
      (updatedQueries) => this.transition(updatedQueries),
      this.options
    );

    return this.cachedSync;
  }

  watchQuery(name, ...args) {
    return {
      onUpdate: (callback) => {
        const { queryToken, unsubscribe } = this.sync.subscribe(name, args);
        const currentListeners = this.listeners.get(queryToken);
        if (currentListeners !== void 0) {
          currentListeners.add(callback);
        } else {
          this.listeners.set(queryToken, new Set([callback]));
        }

        return () => {
          const currentListeners2 = this.listeners.get(queryToken);
          currentListeners2.delete(callback);
          if (currentListeners2.size === 0) {
            this.listeners.delete(queryToken);
          }
          unsubscribe();
        };
      },
      localQueryResult: () => {
        return this.sync.localQueryResult(name, args);
      },
    };
  }

  mutation(name) {
    return createMutation(name, () => this.sync);
  }

  transition(updatedQueries) {
    ReactDOM.unstable_batchedUpdates(() => {
      for (const queryToken of updatedQueries) {
        const callbacks = this.listeners.get(queryToken);
        if (callbacks) {
          for (const callback of callbacks) {
            callback();
          }
        }
      }
    });
  }
}

const ConvexContext = React.createContext(void 0);

export function useConvexGeneric() {
  return useContext(ConvexContext);
}

export const ConvexProvider = ({ client, children }) => {
  return React.createElement(ConvexContext.Provider, { value: client }, children);
};

export function useQueryGeneric(name, ...args) {
  const convex = useContext(ConvexContext);
  if (convex === void 0) {
    throw new Error('tree under `ConvexProvider`. Did you forget it? ');
  }
  const subscription = useMemo(() => {
    const watch = convex.watchQuery(name, ...args);
    return {
      getCurrentValue: () => watch.localQueryResult(),
      subscribe: (callback) => watch.onUpdate(callback),
    };
  }, [name, convex, JSON.stringify(args)]);
  const queryResult = useSubscription(subscription);
  return queryResult;
}

export function useMutationGeneric(name) {
  const convex = useContext(ConvexContext);
  if (convex === void 0) {
    throw new Error('tree under `ConvexProvider`. Did you forget it? ');
  }
  return useMemo(() => convex.mutation(name), [convex, name]);
}
