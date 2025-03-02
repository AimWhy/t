import { useEffect, useRef, useReducer } from 'react';

export function clearFrameInterval(timeoutID) {
  cancelAnimationFrame(timeoutID.id);
}

/**
 * SetFrameInterval() is a wrapper around requestAnimationFrame() that calls a callback function with
 * the current timestamp on every frame.
 * @param callback - The function to be called every frame.
 * @returns A function that will be called every frame.
 */

export function setFrameInterval(callback) {
  const timeoutID = {};
  function tick() {
    const timestamp = Date.now();
    callback(timestamp);
    timeoutID.id = requestAnimationFrame(tick);
  }
  timeoutID.id = requestAnimationFrame(tick);

  return timeoutID;
}

let globalTimerQueue = new Map();
let swapGlobalTimerQueue = new Map();

/**
 * 全局的计时器队列，当前时间戳大于 innerTime 时执行
 * item: {innerTime, timeSpace, timeJob}
 */
setFrameInterval(timestamp => {
  const tempSwapGlobalTimerQueue = swapGlobalTimerQueue;
  swapGlobalTimerQueue = new Map();

  for (const [timeJob, item] of tempSwapGlobalTimerQueue.entries()) {
    if (timestamp >= item.innerTime + item.timeSpace) {
      timeJob({ timestamp, setNext: timeJob.setNext });
    } else {
      swapGlobalTimerQueue.set(timeJob, item);
    }
  }

  for (const [timeJob, item] of globalTimerQueue.entries()) {
    if (timestamp >= item.innerTime + item.timeSpace) {
      timeJob({ timestamp, setNext: timeJob.setNext });
    } else {
      swapGlobalTimerQueue.set(timeJob, item);
    }
  }

  globalTimerQueue = swapGlobalTimerQueue;
  swapGlobalTimerQueue = new Map();
});

export function removeGlobalTimerItem(timeJob) {
  globalTimerQueue.delete(timeJob);
  swapGlobalTimerQueue.delete(timeJob);
}

export function findGlobalTimerItem(timeJob) {
  return globalTimerQueue.get(timeJob) || swapGlobalTimerQueue.get(timeJob);
}

export function addGlobalTimerItem(timeJobItem) {
  const timeJob = timeJobItem.timeJob;

  // 控制是否连续执行 及 下次执行间隔的逻辑交还给 timeJob
  timeJob.setNext = val =>
    swapGlobalTimerQueue.set(timeJob, { ...timeJobItem, innerTime: val });

  return swapGlobalTimerQueue.set(timeJob, timeJobItem);
}

export function clearGlobalTimer() {
  globalTimerQueue.clear();
  swapGlobalTimerQueue.clear();
}

/**
 * It returns a count and a timestamp, and the count is incremented every time the timestamp changes
 * @param [timeSpace=1000] - The time interval between each call, in milliseconds.
 * @param immediate - Whether to execute the callback immediately after the first render.
 */

export function useInterval(timeSpace = 1000, immediate) {
  const [innerTimeObj, setInnerTime] = useReducer(
    (state, { timestamp, setNext }) => {
      setNext(timestamp);
      return { innerTime: timestamp, count: state.count + 1 };
    },
    { innerTime: immediate ? 0 : Date.now(), count: 0 }
  );

  const hitTimeTask = findGlobalTimerItem(setInnerTime);

  if (!hitTimeTask) {
    addGlobalTimerItem({
      timeSpace,
      innerTime: innerTimeObj.innerTime,
      timeJob: setInnerTime
    });
  }

  const cleanUp = () => removeGlobalTimerItem(setInnerTime);

  useEffect(() => cleanUp, []);

  return [innerTimeObj.count, innerTimeObj.innerTime, cleanUp];
}

/**
 * 不触发组件重新渲染，纯逻辑
 * @param {*} timeSpace 时间间隔
 * @param {*} task
 */

export const useTimedTask = (timeSpace, task) => {
  const { current } = useRef({
    task,
    taskRef: null,
    isFirst: true,
    count: 0,
    cleanUp: null
  });

  current.task = task;

  if (!current.taskRef) {
    current.taskRef = ({ timestamp, setNext }) => {
      current.count += 1;
      current.task({ timestamp, setNext, count: current.count });
    };
  }

  if (current.isFirst) {
    addGlobalTimerItem({
      timeSpace,
      innerTime: Date.now(),
      timeJob: current.taskRef
    });
    current.isFirst = false;
  }

  current.cleanUp = () => removeGlobalTimerItem(current.taskRef);

  useEffect(() => current.cleanUp, []);

  return current.cleanUp;
};
