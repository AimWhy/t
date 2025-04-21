// 基础类型定义
interface Dependency {
  subs: Link | undefined;
  subsTail: Link | undefined;
}

interface Subscriber {
  flags: number;
  deps: Link | undefined;
  depsTail: Link | undefined;
  compute?: () => boolean
}

interface Link {
  dep: Dependency;
  sub: Subscriber;
  prevSub: Link | undefined;
  nextSub: Link | undefined;
  nextDep: Link | undefined;
}

// 标记位
const enum Flags {
  DIRTY = 1,
  COMPUTED = 2,
  PENDING = 4,
}

// 全局状态
let activeSubscriber: Subscriber | undefined;
let batchQueue: Set<Link> | undefined;
let updateComputed;
let notifyEffect;

// 创建信号
function signal<T>(initialValue: T) {
  const dep: Dependency = {
    subs: undefined,
    subsTail: undefined,
  };

  let value = initialValue;

  return function signal(...args: [T?]): T {
    if (args.length > 0) {
      if (value !== args[0]) {
        value = args[0]!;
        propagate(dep);
      }
      return value;
    }

    if (activeSubscriber) {
      link(dep, activeSubscriber);
    }
    return value;
  };
}

// 创建计算属性
function computed<T>(getter: () => T) {
  const dep: Dependency & Subscriber = {
    subs: undefined,
    subsTail: undefined,
    flags: Flags.COMPUTED,
    deps: undefined,
    depsTail: undefined,
  };

  dep.compute = () => {
    const prevSub = activeSubscriber;
    activeSubscriber = dep;
    try {
      const newValue = getter();
      if (value !== newValue) {
        value = newValue;
        return true;
      }
      return false;
    } finally {
      activeSubscriber = prevSub;
    }
  };

  let value: T;

  const signal = () => {
    if (dep.flags & (Flags.DIRTY | Flags.PENDING)) {
      updateComputed(dep, getter);
    }
    if (activeSubscriber) {
      link(dep, activeSubscriber);
    }
    return value;
  };

  return signal;
}

// 创建副作用
function effect(fn: () => void) {
  const sub: Subscriber = {
    flags: 0,
    deps: undefined,
    depsTail: undefined,
  };

  const run = () => {
    const prevSub = activeSubscriber;
    activeSubscriber = sub;
    cleanup(sub);
    try {
      fn();
    } finally {
      activeSubscriber = prevSub;
    }
  };

  run();
  return () => cleanup(sub);
}

// 依赖链接
function link(dep: Dependency, sub: Subscriber) {
  const link: Link = {
    dep,
    sub,
    prevSub: undefined,
    nextSub: undefined,
    nextDep: undefined,
  };

  // 连接依赖链表
  if (dep.subsTail) {
    dep.subsTail.nextSub = link;
    link.prevSub = dep.subsTail;
  } else {
    dep.subs = link;
  }
  dep.subsTail = link;

  // 连接订阅者链表
  if (sub.depsTail) {
    link.nextDep = sub.deps;
    sub.depsTail.nextDep = link;
  } else {
    sub.deps = link;
  }
  sub.depsTail = link;
}

// 更新传播
function propagate(dep: Dependency) {
  if (!batchQueue) {
    batchQueue = new Set();
  }

  let link = dep.subs;
  while (link) {
    const sub = link.sub;
    if (sub.flags & Flags.COMPUTED) {
      sub.flags |= Flags.DIRTY;
      propagate(sub as unknown as Dependency);
    } else {
      batchQueue.add(link);
    }
    link = link.nextSub;
  }

  if (batchQueue && !activeSubscriber) {
    const queue = batchQueue;
    batchQueue = undefined;
    queue.forEach((link) => {
      if (link.sub.compute) {
        link.sub.compute();
      }
    });
  }
}

// 清理订阅
function cleanup(sub: Subscriber) {
  let link = sub.deps;
  while (link) {
    const nextDep = link.nextDep;
    const dep = link.dep;

    if (link.prevSub) {
      link.prevSub.nextSub = link.nextSub;
    } else {
      dep.subs = link.nextSub;
    }

    if (link.nextSub) {
      link.nextSub.prevSub = link.prevSub;
    } else {
      dep.subsTail = link.prevSub;
    }

    link = nextDep;
  }
  sub.deps = sub.depsTail = undefined;
}

export { signal, computed, effect };