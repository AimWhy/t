const throwFatalError = () => {
  throw new Error('Something went wrong.');
};

export function dataLoader(batchLoader) {
  let pendingItems = null;
  let dispatchTimer = null;

  const destroyTimerAndPendingItems = () => {
    clearTimeout(dispatchTimer);
    dispatchTimer = null;
    pendingItems = null;
  };

  const groupItems = (items) => {
    const groupedItems = {};

    for (let item of items) {
      if (item.aborted) {
        item.reject(new Error('Aborted'));
      } else {
        const groupKey = batchLoader.getGroupKey(item.obj);
        groupedItems[groupKey] = groupedItems[groupKey] || [];
        groupedItems[groupKey].push(item);
      }
    }

    return groupedItems;
  };

  const dispatch = () => {
    const groupedItems = groupItems(pendingItems);
    destroyTimerAndPendingItems();

    for (const items of Object.values(groupedItems)) {
      const batch = { items, cancel: throwFatalError };
      for (const item of items) {
        item.batch = batch;
      }

      const params = batch.items.map((_item) => batchLoader.genParam(_item.obj));
      const { promise, cancel } = batchLoader.fetch(params);
      batch.cancel = cancel;

      promise
        .then((result) => {
          for (let i = 0; i < result.length; i++) {
            const item = batch.items[i];
            item.resolve(result[i]);
            item.batch = null;
          }
        })
        .catch((cause) => {
          for (const item of batch.items) {
            item.reject(cause);
            item.batch = null;
          }
        });
    }
  };

  return function load(obj) {
    const item = {
      obj,
      batch: null,
      aborted: false,
      resolve: throwFatalError,
      reject: throwFatalError,
    };

    const promise = new Promise((resolve, reject) => {
      item.reject = reject;
      item.resolve = resolve;
      if (!pendingItems) {
        pendingItems = [];
      }
      pendingItems.push(item);
    });

    if (!dispatchTimer) {
      dispatchTimer = setTimeout(dispatch);
    }

    const cancel = () => {
      item.aborted = true;
      if (item.batch?.items.every((_item) => _item.aborted)) {
        item.batch.cancel();
        item.batch = null;
      }
    };

    return { promise, cancel };
  };
}
