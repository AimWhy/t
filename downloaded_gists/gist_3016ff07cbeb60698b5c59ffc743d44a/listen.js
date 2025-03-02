
export function clear(object) {
  for (const property in object) {
    delete object[property];
  }
}

export function listen(target, type, listener, thisArg, once) {
  if (thisArg && thisArg !== target) {
    listener = listener.bind(thisArg);
  }
  if (once) {
    const originalListener = listener;
    listener = function () {
      target.removeEventListener(type, listener);
      originalListener.apply(this, arguments);
    };
  }
  const eventsKey = {
    target: target,
    type: type,
    listener: listener,
  };
  target.addEventListener(type, listener);
  return eventsKey;
}


export function listenOnce(target, type, listener, thisArg) {
  return listen(target, type, listener, thisArg, true);
}


export function unListenByKey(key) {
  if (key && key.target) {
    key.target.removeEventListener(key.type, key.listener);
    clear(key);
  }
}