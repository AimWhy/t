export interface RequestIdleCallbackDeadline {
    didTimeout: boolean;
    timeRemaining: (() => number);
}

export interface RequestIdleCallbackOptions {
    timeout: number;
}

export const enum Setting {
    LongTask = 30,
}

const idleTimeout = 5000;

function requestIdleCallbackPolyfill(callback: (deadline: RequestIdleCallbackDeadline) => void, options: RequestIdleCallbackOptions): void {
    const startTime = performance.now();
    const channel = new MessageChannel();
    const incoming = channel.port1;
    const outgoing = channel.port2;

    incoming.onmessage = (event: MessageEvent): void => {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        const duration = currentTime - event.data;
        const didTimeout = elapsed > options.timeout;

        if (duration > Setting.LongTask && !didTimeout) {
            requestAnimationFrame((): void => { outgoing.postMessage(currentTime); });
        } else {
            callback({
                didTimeout,
                timeRemaining: (): number => didTimeout ? Setting.LongTask : Math.max(0, Setting.LongTask - duration)
            });
        }
    };
    requestAnimationFrame((): void => { outgoing.postMessage(performance.now()); });
}

export const requestIdleCallback = window["requestIdleCallback"] || requestIdleCallbackPolyfill;