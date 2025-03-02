var frameYieldMs = 5;

function push(heap, node) {
    var index = heap.length;
    heap.push(node);
    siftUp(heap, node, index);
}
function peek(heap) {
    return heap.length === 0 ? null : heap[0];
}
function pop(heap) {
    if (heap.length === 0) {
        return null;
    }

    var first = heap[0];
    var last = heap.pop();

    if (last !== first) {
        heap[0] = last;
        siftDown(heap, last, 0);
    }

    return first;
}

function siftUp(heap, node, i) {
    var index = i;

    while (index > 0) {
        var parentIndex = index - 1 >>> 1;
        var parent = heap[parentIndex];

        if (compare(parent, node) > 0) {
            // The parent is larger. Swap positions.
            heap[parentIndex] = node;
            heap[index] = parent;
            index = parentIndex;
        } else {
            // The parent is smaller. Exit.
            return;
        }
    }
}

function siftDown(heap, node, i) {
    var index = i;
    var length = heap.length;
    var halfLength = length >>> 1;

    while (index < halfLength) {
        var leftIndex = (index + 1) * 2 - 1;
        var left = heap[leftIndex];
        var rightIndex = leftIndex + 1;
        var right = heap[rightIndex]; // If the left or right node is smaller, swap with the smaller of those.

        if (compare(left, node) < 0) {
            if (rightIndex < length && compare(right, left) < 0) {
                heap[index] = right;
                heap[rightIndex] = node;
                index = rightIndex;
            } else {
                heap[index] = left;
                heap[leftIndex] = node;
                index = leftIndex;
            }
        } else if (rightIndex < length && compare(right, node) < 0) {
            heap[index] = right;
            heap[rightIndex] = node;
            index = rightIndex;
        } else {
            // Neither child is smaller. Exit.
            return;
        }
    }
}

function compare(a, b) {
    var diff = a.sortIndex - b.sortIndex;
    return diff !== 0 ? diff : a.id - b.id;
}

var ImmediatePriority = 1;
var UserBlockingPriority = 2;
var NormalPriority = 3;
var LowPriority = 4;
var IdlePriority = 5;

var now = () => performance.now();

var IMMEDIATE_PRIORITY_TIMEOUT = -1;
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
var IDLE_PRIORITY_TIMEOUT = Math.pow(2, 30) - 1;

var taskQueue = [];
var timerQueue = []; // Incrementing id counter. Used to maintain insertion order.

var taskIdCounter = 1; // Pausing the scheduler is useful for debugging.
var currentTask = null;
var currentPriorityLevel = NormalPriority; // This is set while performing work, to prevent re-entrance.

var isPerformingWork = false;
var isHostCallbackScheduled = false;
var isHostTimeoutScheduled = false; // Capture local references to native APIs, in case a polyfill overrides them.

function advanceTimers(currentTime) {
    var timer = peek(timerQueue);

    while (timer !== null) {
        if (timer.callback === null) {
            pop(timerQueue);
        } else if (timer.startTime <= currentTime) {
            pop(timerQueue);
            timer.sortIndex = timer.expirationTime;
            push(taskQueue, timer);
        } else {
            return;
        }
        timer = peek(timerQueue);
    }
}

function handleTimeout(currentTime) {
    isHostTimeoutScheduled = false;
    advanceTimers(currentTime);

    if (!isHostCallbackScheduled) {
        if (peek(taskQueue) !== null) {
            isHostCallbackScheduled = true;
            requestHostCallback(flushWork);
        } else {
            var firstTimer = peek(timerQueue);

            if (firstTimer !== null) {
                requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
            }
        }
    }
}

function flushWork(hasTimeRemaining, initialTime) {
    isHostCallbackScheduled = false;

    if (isHostTimeoutScheduled) {
        // 我们安排了一个超时，但不再需要。取消它
        isHostTimeoutScheduled = false;
        cancelHostTimeout();
    }

    isPerformingWork = true;
    var previousPriorityLevel = currentPriorityLevel;

    try {
        return workLoop(hasTimeRemaining, initialTime);
    } finally {
        currentTask = null;
        currentPriorityLevel = previousPriorityLevel;
        isPerformingWork = false;
    }
}

function workLoop(hasTimeRemaining, initialTime) {
    var currentTime = initialTime;
    advanceTimers(currentTime);
    currentTask = peek(taskQueue);

    while (currentTask !== null) {
        if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost())) {
            // 此当前任务尚未过期，我们已经到了截止日期。
            break;
        }

        var callback = currentTask.callback;
        if (typeof callback === 'function') {
            currentTask.callback = null;
            currentPriorityLevel = currentTask.priorityLevel;
            var didUserCallbackTimeout = currentTask.expirationTime <= currentTime;

            var continuationCallback = callback(didUserCallbackTimeout);
            currentTime = now();

            if (typeof continuationCallback === 'function') {
                currentTask.callback = continuationCallback;
            } else {
                if (currentTask === peek(taskQueue)) {
                    pop(taskQueue);
                }
            }

            advanceTimers(currentTime);
        } else {
            pop(taskQueue);
        }

        currentTask = peek(taskQueue);
    } // Return whether there's additional work


    if (currentTask !== null) {
        return true;
    } else {
        var firstTimer = peek(timerQueue);
        if (firstTimer !== null) {
            requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
        }
        return false;
    }
}

function runWithPriority(priorityLevel, eventHandler) {
    switch (priorityLevel) {
        case ImmediatePriority:
        case UserBlockingPriority:
        case NormalPriority:
        case LowPriority:
        case IdlePriority:
            break;
        default:
            priorityLevel = NormalPriority;
    }

    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = priorityLevel;

    try {
        return eventHandler();
    } finally {
        currentPriorityLevel = previousPriorityLevel;
    }
}

function next(eventHandler) {
    var priorityLevel;

    switch (currentPriorityLevel) {
        case ImmediatePriority:
        case UserBlockingPriority:
        case NormalPriority:
            // 切换到正常优先级
            priorityLevel = NormalPriority;
            break;
        default:
            // 任何低于正常优先级的内容都应保持在当前级别
            priorityLevel = currentPriorityLevel;
            break;
    }

    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = priorityLevel;

    try {
        return eventHandler();
    } finally {
        currentPriorityLevel = previousPriorityLevel;
    }
}

function wrapCallback(callback) {
    var parentPriorityLevel = currentPriorityLevel;
    return function () {
        var previousPriorityLevel = currentPriorityLevel;
        currentPriorityLevel = parentPriorityLevel;

        try {
            return callback.apply(this, arguments);
        } finally {
            currentPriorityLevel = previousPriorityLevel;
        }
    };
}

function scheduleCallback(priorityLevel, callback, options) {
    var currentTime = now();
    var startTime;

    if (typeof options === 'object' && options !== null) {
        var delay = options.delay;

        if (typeof delay === 'number' && delay > 0) {
            startTime = currentTime + delay;
        } else {
            startTime = currentTime;
        }
    } else {
        startTime = currentTime;
    }

    var timeout;

    switch (priorityLevel) {
        case ImmediatePriority:
            timeout = IMMEDIATE_PRIORITY_TIMEOUT;
            break;
        case UserBlockingPriority:
            timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
            break;
        case IdlePriority:
            timeout = IDLE_PRIORITY_TIMEOUT;
            break;
        case LowPriority:
            timeout = LOW_PRIORITY_TIMEOUT;
            break;
        case NormalPriority:
        default:
            timeout = NORMAL_PRIORITY_TIMEOUT;
            break;
    }

    var expirationTime = startTime + timeout;
    var newTask = {
        id: taskIdCounter++,
        callback: callback,
        priorityLevel: priorityLevel,
        startTime: startTime,
        expirationTime: expirationTime,
        sortIndex: -1
    };

    // This is a delayed task.
    if (startTime > currentTime) {
        newTask.sortIndex = startTime;
        push(timerQueue, newTask);

        if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
            if (isHostTimeoutScheduled) {
                cancelHostTimeout();
            } else {
                isHostTimeoutScheduled = true;
            }
            requestHostTimeout(handleTimeout, startTime - currentTime);
        }
    } else {
        newTask.sortIndex = expirationTime;
        push(taskQueue, newTask);
        // wait until the next time we yield.

        continueExecution();
    }

    return newTask;
}

function continueExecution() {
    if (!isHostCallbackScheduled && !isPerformingWork) {
        isHostCallbackScheduled = true;
        requestHostCallback(flushWork);
    }
}

const getFirstCallbackNode = () => peek(taskQueue);

const cancelCallback = (task) => { task.callback = null; }

const getCurrentPriorityLevel = () => currentPriorityLevel;

var startTime = -1;
var isMessageLoopRunning = false;
var scheduledHostCallback = null;

function shouldYieldToHost() {
    var timeElapsed = now() - startTime;
    return timeElapsed >= frameYieldMs
}


var performWorkUntilDeadline = function () {
    if (scheduledHostCallback !== null) {
        var currentTime = now(); 

        startTime = currentTime;
        var hasTimeRemaining = true; 
        var hasMoreWork = true;

        try {
            hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
        } finally {
            if (hasMoreWork) {
                schedulePerformWorkUntilDeadline();
            } else {
                isMessageLoopRunning = false;
                scheduledHostCallback = null;
            }
        }
    } else {
        isMessageLoopRunning = false;
    }
};

var channel = new MessageChannel();
var port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;
var schedulePerformWorkUntilDeadline = function () {
    port.postMessage(null);
};

function requestHostCallback(callback) {
    scheduledHostCallback = callback;
    if (!isMessageLoopRunning) {
        isMessageLoopRunning = true;
        schedulePerformWorkUntilDeadline();
    }
}

var taskTimeoutID = -1;
function requestHostTimeout(callback, ms) {
    taskTimeoutID = setTimeout(function () {
        callback(now());
    }, ms);
}

function cancelHostTimeout() {
    clearTimeout(taskTimeoutID);
    taskTimeoutID = -1;
}

exports.IdlePriority = IdlePriority;
exports.ImmediatePriority = ImmediatePriority;
exports.LowPriority = LowPriority;
exports.NormalPriority = NormalPriority;
exports.UserBlockingPriority = UserBlockingPriority;

exports.now = now;
exports.cancelCallback = cancelCallback;
exports.continueExecution = continueExecution;
exports.getCurrentPriorityLevel = getCurrentPriorityLevel;
exports.getFirstCallbackNode = getFirstCallbackNode;
exports.next = next;
exports.runWithPriority = runWithPriority;
exports.scheduleCallback = scheduleCallback;
exports.shouldYield = shouldYieldToHost;
exports.wrapCallback = wrapCallback;