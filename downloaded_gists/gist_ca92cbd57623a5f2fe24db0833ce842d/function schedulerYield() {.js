export default function installWorker() {
    const ONE_SECOND = 1000;
    const FALLBACK_AND_WAIT_MS = [1000, 5000, 5000, 10000, 10000, 30000];

    class ResilientWebSocket extends EventTarget {
        #webSocket;
        #isConnected = false;
        #isConnecting = false;
        #messageQueue = [];
        #reconnectTimeoutHandle;
        #currentWaitIndex = 0;
        #messageCallbacks = [];
        #wsUrl;
        #reconnecting = false;
        #worker;

        constructor(worker) {
            super();
            this.#worker = worker;
        }

        connect(url) {
            this.#wsUrl = url;
            if (this.#isConnected) {
                throw new Error('WebSocket already connected');
            }

            if (this.#isConnecting) {
                throw new Error('WebSocket connection in progress');
            }

            this.#isConnecting = true;

            this.#webSocket = new WebSocket(url);
            //Exposed to e2e tests so that the websocket can be manipulated during tests. Cannot find any other way to do this.
            // Playwright does not support forcing websocket state changes.
            this.#worker.currentWebSocket = this.#webSocket;

            const boundConnected = this.#connected.bind(this);
            this.#webSocket.addEventListener('open', boundConnected);

            const boundCleanUpAndReconnect = this.#cleanUpAndReconnect.bind(this);
            this.#webSocket.addEventListener('error', boundCleanUpAndReconnect);
            this.#webSocket.addEventListener('close', boundCleanUpAndReconnect);

            const boundMessage = this.#message.bind(this);
            this.#webSocket.addEventListener('message', boundMessage);

            this.addEventListener(
                'disconnected',
                () => {
                    this.#webSocket.removeEventListener('open', boundConnected);
                    this.#webSocket.removeEventListener('error', boundCleanUpAndReconnect);
                    this.#webSocket.removeEventListener('close', boundCleanUpAndReconnect);
                },
                { once: true }
            );
        }
        #connected() {
            console.info('Websocket connected.');
            this.#isConnected = true;
            this.#isConnecting = false;
            this.#currentWaitIndex = 0;

            if (this.#reconnecting) {
                this.#worker.postMessage({ type: 'reconnected' });
                this.#reconnecting = false;
            }

            this.#flushQueue();
        }
        #cleanUpAndReconnect() {
            console.warn('Websocket closed. Attempting to reconnect...');
            this.disconnect();
            this.#reconnect();
        }
        #message(event) {
            this.#messageCallbacks.forEach((callback) => callback(event.data));
        }
        #reconnect() {
            if (this.#reconnectTimeoutHandle) {
                return;
            }
            this.#reconnecting = true;

            this.#reconnectTimeoutHandle = setTimeout(() => {
                this.connect(this.#wsUrl);
                this.#reconnectTimeoutHandle = void 0;
            }, FALLBACK_AND_WAIT_MS[this.#currentWaitIndex]);

            if (this.#currentWaitIndex < FALLBACK_AND_WAIT_MS.length - 1) {
                this.#currentWaitIndex++;
            }
        }
        #flushQueueIfReady() {
            if (this.#isConnected) {
                this.#flushQueue();
            }
        }
        #flushQueue() {
            while (this.#messageQueue.length > 0) {
                if (!this.#isConnected) {
                    break;
                }

                const message = this.#messageQueue.shift();
                this.#webSocket.send(message);
            }
        }

        registerMessageCallback(callback) {
            this.#messageCallbacks.push(callback);

            return () => {
                this.#messageCallbacks = this.#messageCallbacks.filter((cb) => cb !== callback);
            };
        }
        enqueueMessage(message) {
            this.#messageQueue.push(message);
            this.#flushQueueIfReady();
        }
        disconnect() {
            this.#isConnected = false;
            this.#isConnecting = false;

            // On WebSocket error, both error callback and close callback are invoked, resulting in
            // this function being called twice, and websocket being destroyed and deallocated.
            if (this.#webSocket !== void 0 && this.#webSocket !== null) {
                this.#webSocket.close();
            }

            this.dispatchEvent(new Event('disconnected'));
            this.#webSocket = void 0;
        }
    }

    /**
     * Handles messages over the worker interface, and
     * sends corresponding WebSocket messages.
     */
    class WorkerToWebSocketMessageBroker {
        #websocket;
        #messageBatcher;

        constructor(websocket, messageBatcher) {
            this.#websocket = websocket;
            this.#messageBatcher = messageBatcher;
        }

        routeMessageToHandler(message) {
            const { type } = message.data;
            switch (type) {
                case 'connect':
                    this.connect(message);
                    break;
                case 'disconnect':
                    this.disconnect(message);
                    break;
                case 'message':
                    this.#websocket.enqueueMessage(message.data.message);
                    break;
                case 'readyForNextBatch':
                    this.#messageBatcher.readyForNextBatch();
                    break;
                case 'setMaxBufferSize':
                    this.#messageBatcher.setMaxBufferSize(message.data.maxBufferSize);
                    break;
                case 'setThrottleRate':
                    this.#messageBatcher.setThrottleRate(message.data.throttleRate);
                    break;
                case 'setThrottleMessagePattern':
                    this.#messageBatcher.setThrottleMessagePattern(message.data.throttleMessagePattern);
                    break;
                default:
                    throw new Error(`Unknown message type: ${type}`);
            }
        }
        connect(message) {
            const { url } = message.data;
            this.#websocket.connect(url);
        }
        disconnect() {
            this.#websocket.disconnect();
        }
    }

    /**
     * Responsible for buffering messages
     */
    class MessageBuffer {
        #buffer;
        #currentBufferLength;
        #dropped;
        #maxBufferSize;
        #isReadyForNextBatch;
        #worker;
        #throttledSendNextBatch;
        #throttleMessagePattern;

        constructor(worker) {
            // No dropping telemetry unless we're explicitly told to.
            this.#maxBufferSize = Number.POSITIVE_INFINITY;
            this.#isReadyForNextBatch = false;
            this.#worker = worker;
            this.#resetBatch();
            this.setThrottleRate(ONE_SECOND);
        }
        get #hasData() {
            return this.#currentBufferLength > 0;
        }

        #resetBatch() {
            this.#buffer = [];
            this.#currentBufferLength = 0;
            this.#dropped = false;
        }

        #shouldThrottle(message) {
            return (this.#throttleMessagePattern !== void 0 && this.#throttleMessagePattern.test(message));
        }
        #sendNextBatch() {
            const buffer = this.#buffer;
            const dropped = this.#dropped;
            const currentBufferLength = this.#currentBufferLength;

            this.#resetBatch();
            this.#worker.postMessage({
                type: 'batch',
                dropped,
                currentBufferLength: currentBufferLength,
                maxBufferSize: this.#maxBufferSize,
                batch: buffer
            });

            this.#isReadyForNextBatch = false;
        }

        setMaxBufferSize(maxBufferSize) {
            this.#maxBufferSize = maxBufferSize;
        }
        setThrottleRate(throttleRate) {
            this.#throttledSendNextBatch = throttle(this.#sendNextBatch.bind(this), throttleRate);
        }
        setThrottleMessagePattern(priorityMessagePattern) {
            this.#throttleMessagePattern = new RegExp(priorityMessagePattern, 'm');
        }
        addMessageToBuffer(message) {
            this.#buffer.push(message);
            this.#currentBufferLength += message.length;

            for (let i = 0; this.#currentBufferLength > this.#maxBufferSize && i < this.#buffer.length; i++) {
                const messageToConsider = this.#buffer[i];
                if (this.#shouldThrottle(messageToConsider)) {
                    this.#buffer.splice(i, 1);
                    this.#currentBufferLength -= messageToConsider.length;
                    this.#dropped = true;
                }
            }

            if (this.#isReadyForNextBatch) {
                this.#throttledSendNextBatch();
            }
        }
        readyForNextBatch() {
            if (this.#hasData) {
                this.#throttledSendNextBatch();
            } else {
                this.#isReadyForNextBatch = true;
            }
        }
    }

    function throttle(callback, wait) {
        let last = 0;
        let throttling = false;

        return function (...args) {
            if (throttling) {
                return;
            }

            const now = performance.now();
            const timeSinceLast = now - last;

            if (timeSinceLast >= wait) {
                last = now;
                callback(...args);
            } else if (!throttling) {
                throttling = true;

                setTimeout(() => {
                    last = performance.now();
                    throttling = false;
                    callback(...args);
                }, wait - timeSinceLast);
            }
        };
    }

    const websocket = new ResilientWebSocket(self);
    const messageBuffer = new MessageBuffer(self);
    const workerBroker = new WorkerToWebSocketMessageBroker(websocket, messageBuffer);

    websocket.registerMessageCallback((data) => {
        messageBuffer.addMessageToBuffer(data);
    });

    self.websocketInstance = websocket;
    self.addEventListener('message', (message) => {
        workerBroker.routeMessageToHandler(message);
    });
}
