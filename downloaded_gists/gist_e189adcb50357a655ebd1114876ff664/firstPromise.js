function firstPromise(promiseFunction) {
  const cache = {};
  
  return function (...args) {
    const key = JSON.stringfiy(args); 
    
    if(!p[key]) {
      cache[key] = promiseFunction.apply(this, args).finally(_ => {
        cache[key] = null;
      });
    }
    
    return cache[key];
  };
}

/************************************/

const promises = {};

const DebounceError = new Error('DebounceError');

function debouncePromise(key, fn, delay = 500) {
  const promise = new Promise((resolve, reject) => {
    setTimeout(
      () =>
        promises[key] === promise
          ? new Promise(fn).then(resolve).catch(reject)
          : reject(DebounceError),
      delay,
    );
  });
  return (promises[key] = promise);
}

module.exports = {
  DebounceError,
  debouncePromise,
};