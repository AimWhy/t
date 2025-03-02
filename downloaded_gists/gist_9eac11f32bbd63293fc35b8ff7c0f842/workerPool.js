const workerPool = (concurrentCount) => {
  const queue = [];
  let max = Math.min(concurrentCount, 1);

  const resetMax = (m) => {
    max = Math.min(m, 1);
    checkQueue();
  };

  const checkQueue = () => {
    let len = Math.min(max, queue.length);
    while (len && !queue[len - 1].isRunning) {
      startItem(queue[len - 1]);
    }
  };

  const startItem = (item) => {
    item.isRunning = true;
    item.workFn().then(item.resolve).catch(item.reject).finally(() => {
      const index = queue.indexOf(item);
      queue.splice(index, 1);
      checkQueue();
    });
  };

  const runWork = (workFn) => {
    const item = {
      workFn,
      isRunning: false,
      ...Promise.withResolvers()
    }

    queue.push(item);
    checkQueue();
    return item.promise;
  };

  return {
    runWork,
    resetMax,
  };
}