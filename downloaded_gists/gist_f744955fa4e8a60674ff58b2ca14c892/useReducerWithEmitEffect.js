const {useCallback, useEffect, useReducer, useRef} = require('react');

let effectCapture = null;

exports.useReducerWithEmitEffect = function(reducer, initialArg, init) {
  let updateCounter = useRef(0);
  let wrappedReducer = useCallback(function(oldWrappedState, action) {
    effectCapture = [];
    try {
      let newState = reducer(oldWrappedState.state, action.action);
      let lastAppliedContiguousUpdate = oldWrappedState.lastAppliedContiguousUpdate;
      let effects = oldWrappedState.effects || [];
      if (lastAppliedContiguousUpdate + 1 === action.updateCount) {
        lastAppliedContiguousUpdate++;
        effects.push(...effectCapture);
      }
      return {
        state: newState,
        lastAppliedContiguousUpdate,
        effects,
      };
    } finally {
      effectCapture = null;
    }
  }, [reducer]);
  let [wrappedState, rawDispatch] = useReducer(wrappedReducer, undefined, function() {
    let initialState;
    if (init !== undefined) {
      initialState = init(initialArg);
    } else {
      initialState = initialArg;
    }
    return {
      state: initialState,
      lastAppliedContiguousUpdate: 0,
      effects: null,
    };
  });
  let dispatch = useCallback(function(action) {
    updateCounter.current++;
    rawDispatch({updateCount: updateCounter.current, action});
  }, []);
  useEffect(function() {
    if (wrappedState.effects) {
      wrappedState.effects.forEach(function(eff) {
        eff();
      });
    }
    wrappedState.effects = null;
  });
  return [wrappedState.state, dispatch];
};

exports.emitEffect = function(fn) {
  if (!effectCapture) {
    throw new Error('emitEffect can only be called from a useReducerWithEmitEffect reducer');
  }
  effectCapture.push(fn);
};
