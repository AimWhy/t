let Tracker = {
  nextId: 1,
  currentComputation: null
};

let pendingComputations = [];
let afterFlushCallbacks = [];
let inCompute = false;
let throwFirstError = false;

function requireFlush() {
  if (!requireFlush.isPending) {
    requireFlush.isPending = true;
    setTimeout(Tracker._runFlush, 0);
  }
}

Tracker.Computation = class Computation {
  constructor(f, parent, onError) {
    if (!Tracker.Computation.isConstructing) {
      throw new Error('Tracker.Computation constructor is private; use Tracker.autoRun');
    }
    Tracker.Computation.isConstructing = false;

    this._id = Tracker.nextId++;
    this.stopped = false;
    this.invalidated = false;
    this.firstRun = true;
    this._onInvalidateCallbacks = [];
    this._onStopCallbacks = [];

    this._parent = parent;
    this._func = f;
    this._onError = onError;
    this._recomputing = false;

    let errored = true;
    try {
      this._compute();
      errored = false;
    } finally {
      this.firstRun = false;
      if (errored) {
        this.stop();
      }
    }
  }

  onInvalidate(f) {
    if (this.invalidated) {
      Tracker.nonreactive(() => f(this));
    } else {
      this._onInvalidateCallbacks.push(f);
    }
  }

  onStop(f) {
    if (this.stopped) {
      Tracker.nonreactive(() => f(this));
    } else {
      this._onStopCallbacks.push(f);
    }
  }

  invalidate() {
    if (!this.invalidated) {
      if (!this._recomputing && !this.stopped) {
        requireFlush();
        pendingComputations.push(this);
      }
      this.invalidated = true;

      for (let i = 0, f; f = this._onInvalidateCallbacks[i]; i++) {
        Tracker.nonreactive(() => f(this));
      }
      this._onInvalidateCallbacks.length = 0;
    }
  }

  stop() {
    if (!this.stopped) {
      this.stopped = true;
      this.invalidate();

      for (let i = 0, f; f = this._onStopCallbacks[i]; i++) {
        Tracker.nonreactive(() => f(this));
      }
      this._onStopCallbacks.length = 0;
    }
  }

  _compute() {
    this.invalidated = false;

    let previous = Tracker.currentComputation;
    Tracker.currentComputation = this;

    let previousInCompute = inCompute;
    inCompute = true;

    try {
      this._func(this);
    } finally {
      Tracker.currentComputation = previous;
      inCompute = previousInCompute;
    }
  }

  _needsRecompute() {
    return this.invalidated && !this.stopped;
  }

  _recompute() {
    this._recomputing = true;
    try {
      if (this._needsRecompute()) {
        try {
          this._compute();
        } catch (e) {
          if (this._onError) {
            this._onError(e);
          } else if (throwFirstError) {
            throw e;
          } else {
            console.error('recompute', e);
          }
        }
      }
    } finally {
      this._recomputing = false;
    }
  }

  flush() {
    if (!this._recomputing) {
      this._recompute();
    }
  }

  run() {
    this.invalidate();
    this.flush();
  }
};

Tracker.Dependency = class Dependency {
  constructor() {
    this._dependentsById = Object.create(null);
  }

  depend(computation = Tracker.currentComputation) {
    if (!computation) {
      return false;
    }
    if (!this._dependentsById[computation._id]) {
      this._dependentsById[computation._id] = computation;
      computation.onInvalidate(() => {
        delete this._dependentsById[computation._id];
      });
      return true;
    }
    return false;
  }

  changed() {
    for (let id in this._dependentsById) {
      this._dependentsById[id].invalidate();
    }
  }

  hasDependents() {
    return !!Object.keys(this._dependentsById).length;
  }

  static new() {
    return new Dependency();
  }
};

Tracker.flush = function (options = {}) {
  Tracker._runFlush({
    finishSynchronously: true,
    throwFirstError: options._throwFirstError
  });
};

Tracker._runFlush = function (options = {}) {
  if (Tracker._runFlush.isRunning) {
    throw new Error('Can\'t call Tracker.flush while flushing');
  }

  if (inCompute) {
    throw new Error('Can\'t flush inside Tracker.autoRun');
  }

  Tracker._runFlush.isRunning = true;
  requireFlush.isPending = true;
  throwFirstError = !!options.throwFirstError;

  let recomputedCount = 0;
  let finishedTry = false;
  try {
    while (pendingComputations.length || afterFlushCallbacks.length) {
      while (pendingComputations.length) {
        let comp = pendingComputations.shift();
        comp._recompute();
        if (comp._needsRecompute()) {
          pendingComputations.unshift(comp);
        }

        if (!options.finishSynchronously && ++recomputedCount > 1000) {
          finishedTry = true;
          return;
        }
      }

      if (afterFlushCallbacks.length) {
        let func = afterFlushCallbacks.shift();
        try {
          func();
        } catch (e) {
          if (throwFirstError) {
            throw e;
          } else {
            console.error('afterFlush', e);
          }
        }
      }
    }
    finishedTry = true;
  } finally {
    if (!finishedTry) {
      Tracker._runFlush.isRunning = false;
      Tracker._runFlush({
        finishSynchronously: options.finishSynchronously,
        throwFirstError: false
      });
    }

    requireFlush.isPending = false;
    Tracker._runFlush.isRunning = false;

    if (pendingComputations.length || afterFlushCallbacks.length) {
      if (options.finishSynchronously) {
        console.error('still have more to do?');
      } else {
        setTimeout(requireFlush, 10);
      }
    }
  }
};

Tracker.autoRun = function (f, options = {}) {
  Tracker.Computation.isConstructing = true;
  let c = new Tracker.Computation(f, Tracker.currentComputation, options.onError);

  if (Tracker.currentComputation) {
    Tracker.onInvalidate(() => c.stop());
  }

  return c;
};

Tracker.nonreactive = function (f) {
  let previous = Tracker.currentComputation;
  Tracker.currentComputation = null;
  try {
    return f();
  } finally {
    Tracker.currentComputation = previous;
  }
};

Tracker.onInvalidate = function (f) {
  if (!Tracker.currentComputation) {
    throw new Error('requires a currentComputation');
  }
  Tracker.currentComputation.onInvalidate(f);
};

Tracker.afterFlush = function (f) {
  afterFlushCallbacks.push(f);
  requireFlush();
};

export {
  Tracker
};