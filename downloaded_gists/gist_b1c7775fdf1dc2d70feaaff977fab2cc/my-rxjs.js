function toPipe(genFun) {
  genFun.pipe = function (...operations) {
    return operations.reduce((prev, fn) => fn(prev), this);
  };
  return genFun;
}

function map(fn) {
  return (pre) =>
    toPipe(async function* next() {
      for await (let v of pre()) {
        yield fn(v);
      }
    });
}

function filter(fn) {
  return (pre) =>
    toPipe(async function* next() {
      for await (let v of pre()) {
        if (fn(v)) {
          yield v;
        }
      }
    });
}

async function* foo() {
  yield 1;
  yield 2;
  yield 3;
  yield 4;
  yield 5;
  return;
}

function AsyncQueue() {
  var that = this;
  that.promise = new Promise(function (resolve) {
    that.resolve = resolve;
  });
}

AsyncQueue.prototype.put = function put(v) {
  var resolveNext = null;

  var nextPromise = new Promise(function (resolve) {
    resolveNext = resolve;
  });

  this.resolve({
    value: Promise.resolve(v),
    nextPromise,
  });

  this.resolve = resolveNext;
};

AsyncQueue.prototype.get = function get() {
  var actualPromise = this.promise;

  var _promiseVal = actualPromise.then(function (result) {
    return result.value;
  });

  this.promise = _promiseVal
    .then(function () {
      return actualPromise;
    })
    .then(function (result) {
      return result.nextPromise;
    });

  return _promiseVal;
};

window.pendingQueue = new AsyncQueue();

async function* foo2() {
  while (true) {
    yield await pendingQueue.get();
    debugger
  }
}

let x = toPipe(foo2).pipe(
  map((x) => x * 2),
  filter((y) => y > 6)
);

for await (let v of x()) {
  console.log(v);
}
