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