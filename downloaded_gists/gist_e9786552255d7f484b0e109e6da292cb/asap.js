
var queue = [];
var flushing = false;
var index = 0;
var capacity = 1024;

function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    queue[queue.length] = task;
}

rawAsap.requestFlush = requestFlush;
function requestFlush() {
    if (flushing) {
        setImmediate(flush);
    }
}

function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        index = index + 1;
        queue[currentIndex].call();

        if (index > capacity) {
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }

    queue.length = 0;
    index = 0;
    flushing = false;
}



var freeTasks = [];
function asap(task) {
    var rawTask = freeTasks.length ? freeTasks.pop() : new RawTask();
    rawTask.task = task;
    rawAsap(rawTask);
}

function RawTask() {
    this.task = null;
}

RawTask.prototype.call = function () {
    var threw = true;
    try {
        this.task.call();
        threw = false;
    } finally {
        threw && rawAsap.requestFlush();
        this.task = null;
        freeTasks.push(this);
    }
};
