interface Job extends Function {
  wait?: boolean;
  fail?: (e: any) => void;
}

function nextTick(fn) {
  Promise.resolve().then(fn);
}

function timeout(n) {
  return (next) => setTimeout(next, n);
}

export const waitForUpdate = (initialCb: Job) => {
  let end;
  const queue: Job[] = initialCb ? [initialCb] : [];

  function shift() {
    const job = queue.shift();
    if (queue.length) {
      let hasError = false;
      try {
        if (job?.wait) {
          job?.(shift);
        } else {
          job?.();
        }
      } catch (e) {
        hasError = true;
        const done = queue[queue.length - 1];
        if (done && done.fail) {
          done.fail(e);
        }
      }

      if (!hasError && !job?.wait) {
        if (queue.length) {
          nextTick(shift);
        }
      }
    } else if (job && (job.fail || job === end)) {
      job(); // done
    }
  }

  nextTick(() => {
    if (!queue.length || (!end && !queue[queue.length - 1]?.fail)) {
      throw new Error('waitForUpdate chain is missing .then(done)');
    }
    shift();
  });

  const chainer = {
    then: (nextCb) => {
      queue.push(nextCb);
      return chainer;
    },
    thenWaitFor: (wait) => {
      if (typeof wait === 'number') {
        wait = timeout(wait);
      }
      wait.wait = true;
      queue.push(wait);
      return chainer;
    },
    end: (endFn) => {
      queue.push(endFn);
      end = endFn;
    },
  };

  return chainer;
};