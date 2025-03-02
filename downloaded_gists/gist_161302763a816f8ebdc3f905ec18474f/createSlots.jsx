import React, { useLayoutEffect } from 'react';

import { useForceUpdate } from './use-force-update';

const createSlots = (slotNames) => {
  const SlotsContext = React.createContext({
    registerSlot: () => null,
    unregisterSlot: () => null,
    context: {},
  });

  const defaultContext = Object.freeze({});

  const Slots = ({ context = defaultContext, children }) => {
    const slotsDefinition = {};
    slotNames.map((name) => (slotsDefinition[name] = null));
    const slotsRef = React.useRef(slotsDefinition);
    const rerenderWithSlots = useForceUpdate();
    const [isMounted, setIsMounted] = React.useState(false);

    useLayoutEffect(() => {
      rerenderWithSlots();
      setIsMounted(true);
    }, [rerenderWithSlots]);

    const registerSlot = React.useCallback(
      (name, contents) => {
        slotsRef.current[name] = contents;
        if (isMounted) {
          rerenderWithSlots();
        }
      },
      [isMounted, rerenderWithSlots]
    );

    const unregisterSlot = React.useCallback(
      (name) => {
        slotsRef.current[name] = null;
        rerenderWithSlots();
      },
      [rerenderWithSlots]
    );

    const slots = slotsRef.current;
    return (
      <SlotsContext.Provider value={{ registerSlot, unregisterSlot, context }}>
        {children(slots)}
      </SlotsContext.Provider>
    );
  };

  function Slot(props) {
    const { name, children } = props;
    const { registerSlot, unregisterSlot, context } = React.useContext(SlotsContext);

    useLayoutEffect(() => {
      registerSlot(name, typeof children === 'function' ? children(context) : children);
      return () => unregisterSlot(name);
    }, [name, children, registerSlot, unregisterSlot, context]);

    return null;
  }
  return { Slots, Slot };
};
export default createSlots;
