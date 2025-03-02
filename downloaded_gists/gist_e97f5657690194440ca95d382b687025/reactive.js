const Undef = void 0;
const RUNNING = 1 << 0; // Effect 执行、读 signal
const NOTIFIED = 1 << 1; // 写 signal、执行 Effect
const OUTDATED = 1 << 2; // 计算属性状态否是已过时
const DISPOSED = 1 << 3; // Effect 已销毁
const HAVE_ERR = 1 << 4; // 已产生了错误
const TRACKING = 1 << 5; // 是否是追踪状态, 默认 true
const cycleDetected = () => { throw new Error("Cycle detected"); }

function startBatch() {
  batchDepth++;
}
function endBatch() {
  if (batchDepth > 1) {
    return batchDepth--;
  }

  let error;
  while (batchedEffect) {
    let effect = batchedEffect;
    batchedEffect = Undef;
    batchIteration += 1;
    while (effect) {
      const next = effect._nextBatchedEffect;
      effect._nextBatchedEffect = Undef;
      effect._flags &= ~NOTIFIED;
      if (!(effect._flags & DISPOSED) && needsToRecompute(effect)) {
        try {
          effect._callback();
        } catch (err) {
          error = error || err;
        }
      }
      effect = next;
    }
  }
  batchIteration = 0;
  batchDepth--;

  if (error) {
    throw error;
  }
}

function batch(callback) {
  if (batchDepth > 0) {
    return callback();
  }
  try {
    startBatch();
    return callback();
  } finally {
    endBatch();
  }
}
let evalContext = Undef;
let batchedEffect = Undef;
let batchDepth = 0;
let batchIteration = 0;
let globalVersion = 0;

function addDependency(signal) {
  if (evalContext === Undef) {
    return;
  }
  let node = signal._node;
  if (node === Undef || node._target !== evalContext) {
    /**
     * `signal`是一个新的依赖项。创建一个新的依赖节点，并将其设置为当前上下文依赖列表的尾部
     *
     * { A <-> B       }
     *         ↑     ↑
     *        tail  node (new)
     *               ↓
     * { A <-> B <-> C }
     *               ↑
     *              tail (evalContext._sources)
     */
    node = {
      _version: 0,
      _rollbackNode: node,               // 上次的 Node

      _source: signal,                   // Signal
      _prevSource: evalContext._sources, // Node
      _nextSource: Undef,                // Node

      _target: evalContext,              // Computed | Effect
      _prevTarget: Undef,                // Node
      _nextTarget: Undef,                // Node
    };
    if (evalContext._sources) {
      evalContext._sources._nextSource = node;
    }
    evalContext._sources = node;         // 指向尾部
    signal._node = node;                 // signal 的 _rollbackNode 存放之前上下文的 node

    if (evalContext._flags & TRACKING) {
      signal._subscribe(node);
    }
    return node;
  } else if (node._version === -1) {
    // "signal" 是之前 evaluation 中存在的依赖项。则重用它
    node._version = 0;
    /**
     * 如果 `node` 不是依赖列表的当前尾部（即列表中有下一个节点），
     * 则将 `node` 设为新的尾部。例如：
     *
     * { A <-> B <-> C <-> D }
     *         ↑           ↑
     *        node   ┌─── tail (evalContext._sources)
     *         └─────│─────┐
     *               ↓     ↓
     * { A <-> C <-> D <-> B }
     *                     ↑
     *                    tail (evalContext._sources)
     */
    if (node._nextSource) {
      node._nextSource._prevSource = node._prevSource;
      if (node._prevSource) {
        node._prevSource._nextSource = node._nextSource;
      }
      node._prevSource = evalContext._sources;
      node._nextSource = Undef;
      evalContext._sources._nextSource = node;
      evalContext._sources = node;
    }
    // 我们可以假设当前的 evaluated/computed 已经订阅了`signal`的更改通知（如果需要）
    return node;
  }
}

function Signal(value) {
  this._value = value;
  this._version = 0;
  this._node = Undef;
  this._targets = Undef; // 指向头节点
}

Signal.prototype._refreshOk = () => true;
Signal.prototype._subscribe = function (node) {
  // 头部插入、成为新头节点
  if (this._targets !== node && node._prevTarget === Undef) {
    node._nextTarget = this._targets;
    if (this._targets) {
      this._targets._prevTarget = node;
    }
    this._targets = node;
  }
};
Signal.prototype._unsubscribe = function (node) {
  // 只有在信号起初有任何订阅者的情况下才运行取消订阅步骤， 移除 node
  if (this._targets) {
    const prev = node._prevTarget;
    const next = node._nextTarget;
    if (prev) {
      prev._nextTarget = next;
      node._prevTarget = Undef;
    }
    if (next) {
      next._prevTarget = prev;
      node._nextTarget = Undef;
    }
    if (node === this._targets) {
      this._targets = next;
    }
  }
};
Signal.prototype.subscribe = function (fn) {
  const signal = this;
  return effect(function () {
    const value = signal.value;
    const flag = this._flags & TRACKING;
    this._flags &= ~TRACKING;
    try {
      fn(value);
    } finally {
      this._flags |= flag;
    }
  });
};
Signal.prototype.valueOf = function () {
  return this.value;
};
Signal.prototype.toString = function () {
  return String(this.value);
};
Signal.prototype.peek = function () {
  return this._value;
};
Object.defineProperty(Signal.prototype, "value", {
  get() {
    const node = addDependency(this);
    if (node) {
      node._version = this._version;
    }
    return this._value;
  },
  set(value) {
    if (value !== this._value) {
      if (batchIteration > 100) {
        cycleDetected();
      }
      this._value = value;
      this._version += 1;
      globalVersion += 1;
      startBatch();
      try {
        for (let node = this._targets; node; node = node._nextTarget) {
          node._target._notify();
        }
      } finally {
        endBatch();
      }
    }
  },
});
function signal(value) {
  return new Signal(value);
}
function needsToRecompute(target) {
  //  依赖项列表已按使用顺序排列，如果多个依赖项的值已更改，则在此时只重新评估第一个使用的依赖项
  for (let node = target._sources; node; node = node._nextSource) {
    // 如果在刷新之前或之后有一个新版本的依赖项，
    // 或者该依赖项有一些阻止其完全刷新的东西（例如依赖项循环），
    // 那么我们需要重新计算。
    if (node._source._version !== node._version) {
      return true;
    }
    if (!node._source._refreshOk() || node._source._version !== node._version) {
      return true;
    }
  }
  // 如果自上次重新计算以来，所有的依赖项的值都没有发生变化，则无需重新计算
  return false;
}
function prepareSources(target) {
  /**
   * 1. 将所有当前的资源标记为可重用节点（版本：-1）
   * 2. 如果当前节点正在不同的上下文中使用，则设置回滚节点
   * 3. 将 'target._sources' 指向双向链表的尾部，例如：
   *
   *        { Undef <- A <-> B <-> C -> Undef }
   *                   ↑           ↑
   *                   │           └──────┐
   * target._sources = A; (node is head)  │
   *                   ↓                  │
   * target._sources = C; (node is tail) ─┘
   */
  for (let node = target._sources; node; node = node._nextSource) {
    if (node._source._node) {
      node._rollbackNode = node._source._node;
    }
    node._source._node = node;
    node._version = -1;
    if (node._nextSource === Undef) {
      target._sources = node;
      break;
    }
  }
}
function cleanupSources(target) {
  let node = target._sources;
  let head = Undef;
  /**
   * 此时，'target._sources' 指向双向链表的尾部。
   * 它包含所有现有源和按使用顺序排列的新源。
   * 向后迭代，直到找到头节点并删除旧依赖项。
   */
  while (node) {
    const prev = node._prevSource;
    /**
     * 该节点是非重用节点，取消订阅其更改通知并将其从双向链表中删除。例如：
     *
     * { A <-> B <-> C }
     *         ↓
     *    { A <-> C }
     */
    if (node._version === -1) {
      node._source._unsubscribe(node);
      if (prev) {
        prev._nextSource = node._nextSource;
      }
      if (node._nextSource) {
        node._nextSource._prevSource = prev;
      }
    } else {
      /**
       * 新的头部是双向链表中最后一个未被删除/取消订阅的节点。例如：
       *
       * { A <-> B <-> C }
       *   ↑     ↑     ↑
       *   │     │     └ head = node
       *   │     └ head = node
       *   └ head = node
       */
      head = node;
    }
    node._source._node = node._rollbackNode;
    if (node._rollbackNode) {
      node._rollbackNode = Undef;
    }
    node = prev;
  }
  target._sources = head;
}
function Computed(compute) {
  Signal.call(this, Undef);
  this._compute = compute;

  this._sources = Undef; // 运行中指向尾节点, 结束后指向头节点
  this._globalVersion = globalVersion - 1;
  this._flags = OUTDATED;
}
Computed.prototype = new Signal();
Computed.prototype._refreshOk = function () {
  this._flags &= ~NOTIFIED;
  if (this._flags & RUNNING) {
    return false;
  }
  // 如果这个计算信号已经订阅了其依赖项的更新（TRACKING flag set），
  // 并且它们中没有任何一个通知有关更改（OUTDATED flag not set），那么计算值就不可能发生变化。
  if ((this._flags & (OUTDATED | TRACKING)) === TRACKING) {
    return true;
  }
  this._flags &= ~OUTDATED;
  if (this._globalVersion === globalVersion) {
    return true;
  }
  this._globalVersion = globalVersion;

  // 在检查值的更改依赖关系之前标记此计算信号正在运行，以便可以使用RUNNING标志来注意循环依赖关系。
  this._flags |= RUNNING;
  if (this._version > 0 && !needsToRecompute(this)) {
    this._flags &= ~RUNNING;
    return true;
  }

  const prevContext = evalContext;
  try {
    prepareSources(this);
    evalContext = this;
    const value = this._compute();
    if (this._flags & HAVE_ERR || this._value !== value || this._version === 0) {
      this._value = value;
      this._flags &= ~HAVE_ERR;
      this._version += 1;
    }
  } catch (err) {
    this._value = err;
    this._flags |= HAVE_ERR;
    this._version += 1;
  }
  evalContext = prevContext;
  cleanupSources(this);
  this._flags &= ~RUNNING;
  return true;
};
Computed.prototype._subscribe = function (node) {
  if (this._targets === Undef) {
    this._flags |= OUTDATED | TRACKING;
    // 当计算信号第一次被订阅时，它会惰性地订阅其依赖项。
    for (let node = this._sources; node; node = node._nextSource) {
      node._source._subscribe(node);
    }
  }
  Signal.prototype._subscribe.call(this, node);
};
Computed.prototype._unsubscribe = function (node) {
  // 仅在计算出的信号有任何订阅者时运行取消订阅步骤。
  if (this._targets) {
    Signal.prototype._unsubscribe.call(this, node);
    // 当计算信号失去最后一个订阅者时，它会取消订阅其依赖项。
    // 这使得可以对计算信号的未引用 subgraphs 进行垃圾回收。
    if (this._targets === Undef) {
      this._flags &= ~TRACKING;
      for (let node = this._sources; node; node = node._nextSource) {
        node._source._unsubscribe(node);
      }
    }
  }
};
Computed.prototype._notify = function () {
  if (!(this._flags & NOTIFIED)) {
    this._flags |= OUTDATED | NOTIFIED;
    for (let node = this._targets; node; node = node._nextTarget) {
      node._target._notify();
    }
  }
};
Computed.prototype.peek = function () {
  if (!this._refreshOk()) {
    cycleDetected();
  }
  if (this._flags & HAVE_ERR) {
    throw this._value;
  }
  return this._value;
};
Object.defineProperty(Computed.prototype, "value", {
  get() {
    if (this._flags & RUNNING) {
      cycleDetected();
    }
    const node = addDependency(this);
    this._refreshOk();
    if (node) {
      node._version = this._version;
    }
    if (this._flags & HAVE_ERR) {
      throw this._value;
    }
    return this._value;
  },
});
function computed(compute) {
  return new Computed(compute);
}

function cleanupEffect(effect) {
  const cleanup = effect._cleanup;
  effect._cleanup = Undef;
  if (typeof cleanup === "function") {
    startBatch();
    const prevContext = evalContext;
    evalContext = Undef;
    try {
      cleanup();
    } catch (err) {
      effect._flags &= ~RUNNING;
      effect._flags |= DISPOSED;
      disposeEffect(effect);
      throw err;
    } finally {
      evalContext = prevContext;
      endBatch();
    }
  }
}
function disposeEffect(effect) {
  for (let node = effect._sources; node; node = node._nextSource) {
    node._source._unsubscribe(node);
  }
  effect._compute = Undef;
  effect._sources = Undef;
  cleanupEffect(effect);
}
function endEffect(prevContext) {
  if (evalContext !== this) {
    throw new Error("Out-of-order effect");
  }
  cleanupSources(this);
  evalContext = prevContext;
  this._flags &= ~RUNNING;
  if (this._flags & DISPOSED) {
    disposeEffect(this);
  }
  endBatch();
}

function Effect(compute) {
  this._compute = compute;
  this._cleanup = Undef;

  this._sources = Undef;  // 运行中指向尾节点，结束后恢复指向头节点
  this._nextBatchedEffect = Undef; // 保存上一个 batchedEffect、用于回溯
  this._flags = TRACKING;
}
Effect.prototype._callback = function () {
  const finish = this._start();
  try {
    if (this._flags & DISPOSED) {
      return;
    }
    if (this._compute === void 0) {
      return;
    }
    const cleanup = this._compute();
    if (typeof cleanup === "function") {
      this._cleanup = cleanup;
    }
  } finally {
    finish();
  }
};
Effect.prototype._start = function () {
  if (this._flags & RUNNING) {
    cycleDetected();
  }
  this._flags |= RUNNING;
  this._flags &= ~DISPOSED;
  cleanupEffect(this);
  prepareSources(this);
  startBatch();
  const prevContext = evalContext;
  evalContext = this;
  return endEffect.bind(this, prevContext);
};
Effect.prototype._notify = function () {
  if (!(this._flags & NOTIFIED)) {
    this._flags |= NOTIFIED;
    this._nextBatchedEffect = batchedEffect;
    batchedEffect = this;
  }
};
Effect.prototype._dispose = function () {
  this._flags |= DISPOSED;
  if (!(this._flags & RUNNING)) {
    disposeEffect(this);
  }
};
function effect(compute) {
  const effect = new Effect(compute);
  try {
    effect._callback();
  } catch (err) {
    effect._dispose();
    throw err;
  }
  return effect._dispose.bind(effect);
}
window.reactive = { signal, computed, effect, batch, Signal };