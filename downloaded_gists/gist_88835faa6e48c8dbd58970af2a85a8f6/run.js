function isPromise(obj) {
  return (
    Boolean(obj) &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function' &&
    typeof obj.catch === 'function'
  );
}

function run(fn, args = [], { raceStampKey = 'raceStamp', timestamp } = {}) {
  if (typeof fn !== 'function') {
    throw new Error('first Argument must be a function');
  }

  const successFn = (value) => {
    let error = null;

    if (timestamp === void 0) {
      return [error, value];
    }

    if (timestamp < fn[raceStampKey]) {
      error = new Error('RaceError');
      error.isRace = true;
    }

    return [error, value];
  };

  const errorFn = (err) => {
    let error = err;

    if (timestamp === void 0) {
      return [error, null];
    }

    if (timestamp < fn[raceStampKey]) {
      error = new Error(err.message);
      error.stack = err.stack;
      error.isRace = true;
    }

    return [error, null];
  };

  try {
    const result = fn(...args);
    const isAsync = isPromise(result);

    if (!isAsync) {
      return [null, result];
    }

    if (timestamp !== void 0) {
      timestamp = typeof timestamp === 'number' ? timestamp : performance.now();
      fn[raceStampKey] = Math.max(fn[raceStampKey] || 0, timestamp);
    }

    return result.then(successFn, errorFn);
  } catch (err) {
    return [err, null];
  }
}

run.sequence = function (config = {}) {
  config.raceStampKey = config.raceStampKey || 'raceStamp';
  config.timestamp = typeof config.timestamp === 'number' ? config.timestamp : performance.now();

  return (fn, args = []) => run(fn, args, config);
};

let delay = (ms, value) => new Promise((res) => window.setTimeout(res, ms, value));
let delay2 = delay.bind(null);

async function test(ms1, ms2) {
  let run2 = run.sequence();

  let [err, val] = await run2(delay, [ms1, 'first:' + ms1]);
  if (err && err.isRace) {
    return console.warn('已被抛弃处理1:' + ms1);
  }
  console.log(val);

  await delay(ms2);

  let [err2, val2] = await run2(delay2, [ms2, 'second:' + ms2]);
  if (err2 && err2.isRace) {
    return console.warn('已被抛弃处理2:' + ms2);
  }
  console.log(val2);

  let [err3, val3] = await run2(delay, [Math.random() * 4000, 'second2:' + ms2]);
  if (err3 && err3.isRace) {
    return console.warn('已被抛弃处理3:' + ms2);
  }
  console.log(val3);
}

test(3000, 2000);
setTimeout(() => test(20, 400), 2800);
setTimeout(() => test(440, 1400), 3020);
