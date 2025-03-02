import { useState, useEffect, useRef } from 'react';

const hasNativePerformanceNow = typeof performance === 'object' && typeof performance.now === 'function';
const getNow = hasNativePerformanceNow ? () => performance.now() : () => Date.now();

export function clearFrameInterval(timeoutID) {
  cancelAnimationFrame(timeoutID.id);
}

export function setFrameInterval(callback) {
  function tick() {
    const timestamp = getNow();
    callback(timestamp);
    timeoutID.id = requestAnimationFrame(tick);
  }

  return { id: requestAnimationFrame(tick) };
}

const globalTimerQueue = [];

setFrameInterval(function globalTimerCheck(timestamp) {
  globalTimerQueue.forEach((item) => {
    if (timestamp - item.innerTime >= item.timeSpace) {
      item.innerTime = timestamp;
      item.setTime(timestamp);
    }
  });
});

export function removeGlobalTimer(t) {
  const index = globalTimerQueue.findIndex((item) => item.setTime === t);
  index > -1 && globalTimerQueue.splice(index, 1);
}

export function clearGlobalTimer() {
  globalTimerQueue.length = 0;
}

/**
 * 全局定时器
 * @param {timeSpace} 时间间隔默认1s更新一次
 * @return number 时间戳
 */
export const useInterval = function (timeSpace = 1000, setOuterTime) {
  const [innerTime, setInnerTime] = useState(getNow());
  const setTime = setOuterTime || setInnerTime;

  if (!queue.some((item) => item.setTime === setTime)) {
    globalTimerQueue.push({
      timeSpace,
      innerTime,
      setTime,
    });
  }

  useEffect(() => () => removeGlobalTimer(setTime), [setTime]);
  return [innerTime, () => removeGlobalTimer(setTime)];
};

/**
 * 倒计时方法
 * @param {deadlineTime, task, isRelative}
 *  deadlineTime: 倒计时截止时间(时间戳 ms)
 *  task 倒计时结束执行的回调函数
 *  isRelative: deadlineTime 是否时相对时间(相对于当前时间)
 * @return [bool, dff]
 *  bool: 倒计时是否结束，diff：距离截止时间所剩毫秒数，restart：重启任务
 */
export const useTimedTask = (deadlineTime, task, isRelative) => {
  const [currentTime, stopFresh] = useInterval();
  const isFirst = useRef(true);
  const deadlineTimeRef = useRef(deadlineTime);

  if (isRelative && isFirst.current) {
    isFirst.current = false;
    deadlineTimeRef.current = deadlineTimeRef.current + currentTime;
  }

  const diff = deadlineTimeRef.current - currentTime;
  const preDiff = useRef(diff);

  const restart = () => {
    isFirst.current = true;
    preDiff.current = 0.1;
  };

  if (preDiff.current <= 0) {
    return [true, diff, restart];
  }

  if (diff <= 0) {
    preDiff.current = diff;
    task && task(restart);
    return [true, diff, restart];
  }

  return [false, diff, restart];
};
