function isArrayLike(x) {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof x.length === 'number' &&
    (x.length === 0 ||
      (x.length > 0 && Object.prototype.hasOwnProperty.call(x, x.length - 1)))
  );
}
function resolveCacheHits(batch) {
  for (let i = 0; i < batch.cacheHits.length; i++) {
    batch.cacheHits[i]();
  }
}

function failedDispatch(loader, batch, error) {
  resolveCacheHits(batch);

  for (let i = 0; i < batch.keys.length; i++) {
    loader.clear(batch.keys[i]);
    batch.callbacks[i].reject(error);
  }
}

function dispatchBatch(loader, batch) {
  batch.hasDispatched = true;
  if (!batch.keys.length) {
    return resolveCacheHits(batch);
  }

  let batchPromise = loader._batchLoadFn(batch.keys);
  if (!batchPromise || typeof batchPromise.then !== 'function') {
    return failedDispatch(loader, batch, new TypeError(''));
  }

  batchPromise
    .then(values => {
      if (!isArrayLike(values)) {
        throw new TypeError('');
      }
      if (values.length !== batch.keys.length) {
        throw new TypeError('');
      }

      resolveCacheHits(batch);

      for (let i = 0; i < batch.callbacks.length; i++) {
        let value = values[i];

        if (value instanceof Error) {
          batch.callbacks[i].reject(value);
        } else {
          batch.callbacks[i].resolve(value);
        }
      }
    })
    .catch(error => {
      failedDispatch(loader, batch, error);
    });
}

function getCurrentBatch(loader) {
  let existingBatch = loader._batch;

  if (
    existingBatch &&
    !existingBatch.hasDispatched &&
    existingBatch.keys.length < loader._maxBatchSize &&
    existingBatch.cacheHits.length < loader._maxBatchSize
  ) {
    return existingBatch;
  }

  let newBatch = {
    hasDispatched: false,
    keys: [],
    callbacks: [],
    cacheHits: [],
  };

  loader._batch = newBatch;
  loader._batchScheduleFn(() => dispatchBatch(loader, newBatch));

  return newBatch;
}

function DataLoader(
  batchLoadFn,
  {
    batch,
    maxBatchSize,
    cacheMap = new Map(),
    cacheKeyFn = k => k,
    batchScheduleFn = setTimeout,
  },
) {
  if (typeof batchLoadFn !== 'function') {
    throw new TypeError('');
  }

  this._batchLoadFn = batchLoadFn;
  this._maxBatchSize = batch ? maxBatchSize : 1;
  this._batchScheduleFn = batchScheduleFn;
  this._cacheKeyFn = cacheKeyFn;
  this._cacheMap = cacheMap;
  this._batch = null;
}

DataLoader.prototype.load = function load(key) {
  if (key === null || key === void 0) {
    throw new TypeError('');
  }

  let batch = getCurrentBatch(this);
  let cacheMap = this._cacheMap;
  let cacheKey = this._cacheKeyFn(key);
  let cachedPromise = cacheMap.get(cacheKey);

  if (cachedPromise) {
    return new Promise(resolve => {
      batch.cacheHits.push(() => {
        resolve(cachedPromise);
      });
    });
  }

  batch.keys.push(key);
  let promise = new Promise((resolve, reject) => {
    batch.callbacks.push({ resolve, reject });
  });

  cacheMap.set(cacheKey, promise);
  return promise;
};

DataLoader.prototype.loadMany = function loadMany(keyArr) {
  if (!isArrayLike(keyArr)) {
    throw new TypeError('');
  }

  let loadPromises = [];
  for (let i = 0; i < keyArr.length; i++) {
    const p = this.load(keyArr[i]).catch(error => error);
    loadPromises.push(p);
  }
  return Promise.all(loadPromises);
};

DataLoader.prototype.clear = function clear(key) {
  let cacheKey = this._cacheKeyFn(key);
  this._cacheMap?.delete(cacheKey);
  return this;
};

DataLoader.prototype.clearAll = function clearAll() {
  this._cacheMap?.clear();
  return this;
};

DataLoader.prototype.prime = function prime(key, value) {
  if (!this._cacheMap) {
    return this;
  }

  let cacheKey = this._cacheKeyFn(key);
  if (this._cacheMap.get(cacheKey) === void 0) {
    let promise =
      value instanceof Error
        ? Promise.reject(value).catch(() => void 0)
        : Promise.resolve(value);
    this._cacheMap.set(cacheKey, promise);
  }
  return this;
};
