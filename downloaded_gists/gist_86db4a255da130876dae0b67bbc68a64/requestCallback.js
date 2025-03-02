let taskIdCounter = 1;
let isCallbackScheduled = false;
let isPerformingWork = false;
let currentTask = null;
let shouldYieldToHost = null;
let deadline = 0;
let yieldInterval = 5;
let maxYieldInterval = 300;
let scheduleCallback = null;
let scheduledCallback = null;

const taskQueue = [];
const maxSigned31BitInt = 1073741823;

function setupScheduler() {
  const channel = new MessageChannel();
  const port = channel.port2;

  scheduleCallback = () => port.postMessage(null);

  channel.port1.onmessage = () => {
    if (scheduledCallback !== null) {
      const hasTimeRemaining = true;
      const currentTime = performance.now();
      deadline = currentTime + yieldInterval;

      try {
        const hasMoreWork = scheduledCallback(hasTimeRemaining, currentTime);
        if (!hasMoreWork) {
          scheduledCallback = null;
        } else {
          scheduleCallback();
        }
      } catch (error) {
        // 如果一个调度 task 抛错，则退出当前浏览器任务，以便可以观察到错误。
        scheduleCallback();
        throw error;
      }
    }
  };

  if (navigator && navigator.scheduling && navigator.scheduling.isInputPending) {
    const scheduling = navigator.scheduling;

    // 应当让给宿主环境么
    shouldYieldToHost = () => {
      const currentTime = performance.now();
      if (currentTime >= deadline) {
        // There's no time left. We may want to yield control of the main
        // thread, so the browser can perform high priority tasks. The main ones
        // are painting and user input. If there's a pending paint or a pending
        // input, then we should yield. But if there's neither, then we can
        // yield less often while remaining responsive. We'll eventually yield
        // regardless, since there could be a pending paint that wasn't
        // accompanied by a call to `requestPaint`, or other main thread tasks
        // like network events.
        if (scheduling.isInputPending()) {
          return true;
        }
        // There's no pending input. Only yield if we've reached the max yield interval.
        return currentTime >= maxYieldInterval;
      }

      return false;
    };
  } else {
    // `isInputPending` is not available. Since we have no way of knowing if
    // there's pending input, always yield at the end of the frame.
    shouldYieldToHost = () => performance.now() >= deadline;
  }
}

// 快速查找位置并插入
function enqueue(taskQueue, task) {
  function findIndex() {
    let m = 0;
    let n = taskQueue.length - 1;
    while (m <= n) {
      const k = (n + m) >> 1;
      const cmp = task.expirationTime - taskQueue[k].expirationTime;
      if (cmp > 0) {
        m = k + 1;
      } else if (cmp < 0) {
        n = k - 1;
      } else {
        return k;
      }
    }
    return m;
  }
  taskQueue.splice(findIndex(), 0, task);
}

function flushWork(hasTimeRemaining, initialTime) {
  // We'll need a host callback the next time work is scheduled.
  isCallbackScheduled = false;
  isPerformingWork = true;

  try {
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    isPerformingWork = false;
  }
}

function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  currentTask = taskQueue[0] || null;

  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost())) {
      // 当前 currentTask 没有过期，但我们时间已经不够了
      break;
    }

    const callback = currentTask.fn;

    if (callback !== null) {
      currentTask.fn = null;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      callback(didUserCallbackTimeout);

      currentTime = performance.now();
    }

    taskQueue.shift();
    currentTask = taskQueue[0] || null;
  }

  // 返回是否有额外的工作
  return currentTask !== null;
}

export const requestCallback = (fn, { timeout = maxSigned31BitInt } = {}) => {
  if (!scheduleCallback) {
    setupScheduler();
  }

  const startTime = performance.now();
  const newTask = {
    id: taskIdCounter++,
    fn,
    startTime,
    expirationTime: startTime + timeout
  };

  enqueue(taskQueue, newTask);

  // 没有开启调度 且 不是在执行中
  if (!isCallbackScheduled && !isPerformingWork) {
    isCallbackScheduled = true;
    scheduledCallback = flushWork;
    scheduleCallback();
  }

  return newTask;
}

export const cancelCallback = task => task.fn = null;
