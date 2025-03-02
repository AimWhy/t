/* eslint-disable func-names */
import {useState, useEffect, useRef} from 'react';

function createWorker(fun) {
    const blob = new Blob([`(${fun.toString()})()`]);
    const url = window.URL.createObjectURL(blob);
    return new Worker(url);
}

const clockWorker = createWorker(() => {
    const adjustTimer = 20 - Date.now() % 20;
    setTimeout(() => {
        self.postMessage(Date.now());
        setInterval(() => {
            self.postMessage(Date.now());
        }, 20);
    }, adjustTimer);
});

/**
 * 全局定时器
 * @param {timeSpace} 时间间隔默认1s更新一次
 * @return number 时间戳
*/
export const useInterval = (function () {
    const queue = [];

    clockWorker.onmessage = function ({data}) {
        queue.forEach(item => {
            if (data - item.preTime >= item.timeSpace) {
                item.preTime = data;
                item.setNow(data);
            }
        });
    };

    function clear(t) {
        const index = queue.findIndex(item => item.setNow === t);
        index > -1 && queue.splice(index, 1);
    }

    return function (timeSpace = 1000) {
        const [now, setNow] = useState(Date.now());
        if (!queue.some(item => item.setNow === setNow)) {
            queue.push({
                timeSpace,
                preTime: now,
                setNow
            });
        }
        useEffect(() => () => clear(setNow), []);

        return now;
    };
})();

/**
 * 倒计时方法
 * @param {deadlinetTime, task}
 *  deadlinetTime: 倒计时截止时间(时间戳 ms)
 *  task 倒计时结束执行的回调函数
 * @return [bool, dff]
 *  bool: 倒计时是否结束，diff：距离截止时间所剩毫秒数
*/
export const useTimedTask = (deadlinetTime, task) => {
    const now = useInterval();
    const diff = deadlinetTime - now;
    const preDiff = useRef(diff);

    if (preDiff.current < 0) {
        return [true, diff];
    }

    if (diff <= 0 && preDiff.current > 0) {
        preDiff.current = diff;
        task && task();
        return [true, diff];
    }

    return [false, diff];
};