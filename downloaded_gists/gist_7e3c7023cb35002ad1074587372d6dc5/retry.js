export default function memoize(fn, timeout = Infinity) {
  const cache = {};

  return (arg) => {
    if (cache[arg] === void 0 || cache[arg].timeStamp > Date.now()) {
      cache[arg] = {
        result: fn(arg),
        timeStamp: Date.now() + timeout,
      };
    }

    return cache[arg].result;
  };
}

export const withRetry = (task, retriesLeft = 3, interval = 1000) => {
  return (...args) => {
    const retry = async (fn, timesLeft, wait, argsArr) => {
      try {
        return await fn(...argsArr);
      } catch (error) {
        console.log(`Above command failed, retrying ${timesLeft} more times`);
        if (timesLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, wait));
          return await retry(fn, timesLeft - 1, wait, argsArr);
        } else {
          throw error;
        }
      }
    };

    return retry(task, retriesLeft, interval, args);
  };
};