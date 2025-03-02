export function genDeferred() {
  var resolver, rejector;
  var promise = new Promise(function(resolve, reject) {
    resolver = resolve;
    rejector = reject;
  });
  var deferred = {
    resolve: resolver,
    reject: rejector,
    then: function(a, b) { promise = promise.then(a, b); return deferred; },
    pipe: function(a, b) { promise = promise.then(a, b); return deferred; },
    done: function(a) { promise = promise.then(a); return deferred; },
    fail: function(a) { promise = promise.catch(a); return deferred; },
    always: function(a) { promise = promise.finally(a); return deferred; },
    promise: function() { return deferred; }
  };
  return deferred;
}