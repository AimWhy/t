export const retry = (fn, times = 3) => {
  return (...args) => {
    const result = new Promise((resolve, reject) => {
      (function attempt(n) {
        fn(...args)
          .then(resolve)
          .catch((err) => {
            if (n >= times) {
              return reject(err);
            }
            attempt(n + 1);
          });
      })(1);
    });
    return result;
  };
};
