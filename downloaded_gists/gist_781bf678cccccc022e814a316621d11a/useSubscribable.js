import useRefWrapper from 'hooks/useRefWrapper';
import { useState, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
function getInitValue(subscribable, selector, initValue) {
    if (initValue !== undefined) {
        return initValue;
    }
    if (subscribable instanceof BehaviorSubject) {
        return selector(subscribable._value);
    }
    return undefined;
}
export default function useSubscribable(subscribable, selectorOrInitValue, initValue) {
    const innerInitValue = typeof selectorOrInitValue === 'function' ? initValue : selectorOrInitValue;
    const innerSelector = typeof selectorOrInitValue === 'function'
        ? selectorOrInitValue
        : (x) => x;
    const innerSelectorRef = useRefWrapper(innerSelector);
    const [state, setState] = useState(() => getInitValue(subscribable, innerSelector, innerInitValue));
    useEffect(() => {
        const subscription = subscribable.subscribe((x) => setState(innerSelectorRef.current(x)));
        return () => subscription.unsubscribe();
    }, [innerSelectorRef, subscribable]);
    return state;
}