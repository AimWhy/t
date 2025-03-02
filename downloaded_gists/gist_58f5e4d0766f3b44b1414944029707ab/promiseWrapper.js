function promiseWrapper(customPromise, defaultOnRejected) {
  var hasOnFulfilled = false;
  var hasOnRejected = false;

  function chain(promise) {
    var newPromise = new Promise(function (res, rej) {
      return promise.then(res, function (value) {
        if (hasOnRejected) {
          rej(value);
        } else {
          defaultOnRejected(value);
        }
      });
    });
    var originalThen = newPromise.then;

    newPromise.then = function (onfulfilled, onrejected) {
      var result = originalThen.call(newPromise, onfulfilled, onrejected);
      if (typeof onfulfilled === 'function') hasOnFulfilled = true;

      if (typeof onrejected === 'function') {
        hasOnRejected = true;
        return result;
      } else {
        return chain(result);
      }
    };

    return newPromise;
  }

  var result = chain(customPromise);

  result.hasOnFulfilled = function () {
    return hasOnFulfilled;
  };

  return result;
}