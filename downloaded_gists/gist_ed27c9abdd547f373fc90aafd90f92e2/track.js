function shallowEqual(objA, objB) {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (typeof objA !== 'object' || typeof objB !== 'object'
    || typeof objA === 'null' || typeof objB === 'null'
  ) {
    return false;
  }

  var objKeysA = Object.keys(objA)
  var objKeysB = Object.keys(objB)

  if (objKeysA.length !== objKeysB.length) {
    return false;
  }

  for (let i = 0; i < objKeysA.length; i++) {
    if (!objB.hasOwnProperty(objKeysA[i]) || !Object.is(objA[objKeysB[i]], objB[objKeysB[i]])) {
      return false;
    }
  }
  return true;
}

const track = (fn, memo) => {
  const wrapFn = (...args) => {
    if (memo && shallowEqual(wrapFn.memoInput[0], args)) {
      return wrapFn.memoInput[1];
    }
    return wrapFn.force(...args);
  }
  wrapFn.force = (...args) => {
    if (!args.length) {
      args = wrapFn.memoInput[0] || [];
    }
    const preTrackCurrent = track.current;
    const trackCurrent = track.current = wrapFn;
    trackCurrent.memoizedIndex = -1;
    try {
      trackCurrent.unSubscribers.forEach(unSubscribe => unSubscribe());
      const result = fn(...args);
      trackCurrent.memoInput = [args, result];
      return result;
    } finally {
      track.trackCurrent = preTrackCurrent;
    }
  }
  wrapFn.memoInput = []
  wrapFn.unSubscribers = new Set();
  wrapFn.memoizedState = [];
  wrapFn.memoizedIndex = -1;
  return wrapFn;
}
track.ScopeStack = [];
track.ScopeIndex = -1;

const useState = (defaultValue) => {
  const trackCurrent = track.current;
  const memoizedIndex = ++trackCurrent.memoizedIndex;

  if (trackCurrent.memoizedState.length - 1 < memoizedIndex) {
    trackCurrent.memoizedState[memoizedIndex] = defaultValue;
  }

  return [trackCurrent.memoizedState[memoizedIndex], (val) => {
    trackCurrent.memoizedState[memoizedIndex] = val;

    if (!trackCurrent.effectCount) {
      trackCurrent.effectCount = 1;
      requestAnimationFrame(() => {
        trackCurrent.effectCount = 0;
        trackCurrent.force();
      });
    }
  }];
}

const runWithScope = (fun, scope, isRoot) => {
  try {
    track.ScopeStack.push(scope);
    track.ScopeIndex++;
    if (fun.memoizedState && fun.unSubscribers) {
      fun();
    } else {
      track(fun)();
    }
  } finally {
    if (!isRoot) {
      track.ScopeIndex--;
      track.ScopeStack.pop();
    }
  }
}

const useScope = (() => {
  const subscribers = new Set();
  const subscribe = (callback) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };

  return (selector) => {
    const scopeIndex = track.ScopeIndex;
    const trackCurrent = track.current;
    const scopeData = track.ScopeStack[scopeIndex];
    const result = selector(scopeData);

    return [result, (value) => {
      const unSubscribe = subscribe(trackCurrent.force);
      trackCurrent.unSubscribers.add(unSubscribe);

      track.ScopeStack[scopeIndex] = {
        ...track.ScopeStack[scopeIndex],
        ...value
      };
      requestAnimationFrame(() => {
        subscribers.forEach(subscribe => subscribe());
      })
    }];
  }
})();

let times = 0;
let outerSetData = null;

const x = track((props) => {
  const [c, setC] = useState(100);
  console.log('xxx-ccccc');
  const [data, setData] = useScope(z => z.a);

  outerSetData = setData;
  console.log(c, data)
})

const y = track((props) => {
  const [d, setD] = useState(200);
  console.log('yyy-dddd');
  const [data, setData] = useScope(z => z.b);

  if (times < 4) {
    times++;
    setTimeout(() => { setD(Date.now()) }, 2000);
  }

  console.log(d, data)
}, true)

runWithScope(() => {
  const [b, setB] = useState(2);
  console.log('bbbbbb');

  x();
  y();

  console.log(b)
  setTimeout(() => {
    setB('bbbbb:' + Date.now())
  }, 15000);

}, { a: 'z-a', b: 'z-b' }, true)

// setTimeout(() => {
//   outerSetData({ a: 'z22-a' })
// }, 10000);

// setTimeout(() => {
//   outerSetData({ a: 'z22-aaaa' })
// }, 14000);