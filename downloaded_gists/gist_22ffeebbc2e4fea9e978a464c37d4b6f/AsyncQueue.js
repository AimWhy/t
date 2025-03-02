  var AsyncQueue = function AsyncQueue() {
    var that = this;
    that.promise = new Promise(function (resolve) {
      that.resolve = resolve;
    });
  };

  AsyncQueue.prototype.put = function put(v) {
    var resolveNext = null;

    var nextPromise = new Promise(function (resolve) {
      resolveNext = resolve;
    });

    this.resolve({
      value: Promise.resolve(v),
      nextPromise
    });

    this.resolve = resolveNext;
  };

  AsyncQueue.prototype.get = function get() {
    var actualPromise = this.promise;

    var _promiseVal = actualPromise.then(function (result) {
      return result.value;
    });

    this.promise = _promiseVal.then(function () {
      return actualPromise;
    }).then(function (result) {
      return result.nextPromise;
    });

    return _promiseVal;
  };

/*****************************************************/

var pendingQueue = new AsyncQueue();

(function loopGet(lastValue) {
  var currentPending = pendingQueue.get().then(function (currentValue) {
    var result = typeof currentValue === 'function'
      ? currentValue(lastValue)
      : currentValue;

    return result;
  });

  window.currentPending = currentPending;

  currentPending.then(loopGet);
})();
pendingQueue.put(Promise.resolve(333));
pendingQueue.put(function (lastVal) {
  console.log(lastVal);
  return lastVal + 1;
});
pendingQueue.put(function (lastVal) {
  console.log(lastVal);
  return lastVal * 2;
});
