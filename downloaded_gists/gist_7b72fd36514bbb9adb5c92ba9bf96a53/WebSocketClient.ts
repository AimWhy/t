export class WebSocketClient {
    static messageId = 0;

    private url: string;
    private socket: WebSocket;
    private callbacks: Record<number, { resolve: (data: any) => void, reject: (error: Error) => void, retries: number, msgTimeout: null | number }>;
    private listeners: any[];
    private msgMaxRetries: number;
    private msgRetryDelay: number;
    private msgPendingQueue: any[];
    private reConnectTimeout: null | number;
    private reConnectDelay: number;

    constructor(url: string) {
        this.url = url;
        this.socket = new WebSocket(url);
        this.callbacks = {};
        this.listeners = [];
        this.msgMaxRetries = 3;
        this.msgRetryDelay = 1000;
        this.reConnectDelay = 3000;
        this.msgPendingQueue = [];
        this.reConnectTimeout = null;

        this.setupWebSocket();
    }

    private setupWebSocket() {
        this.socket.onopen = () => {
            this.processPendingQueue();
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.msgId && this.callbacks[data.msgId]) {
                // 消息回应： 信令发送方确定以发到服务器
                this.callbacks[data.msgId].resolve(data);
                window.clearTimeout(this.callbacks[data.msgId].msgTimeout);
                delete this.callbacks[data.msgId];
            } else {
                // 纯接收消息，信令接收方逻辑
                this.listeners.forEach((listener) => {
                    listener(data);
                });
            }
        };

        this.socket.onclose = () => {
            if (!this.reConnectTimeout) {
                this.reConnectTimeout = window.setTimeout(() => {
                    this.reConnectTimeout = null;
                    this.socket = new WebSocket(this.url);
                    this.setupWebSocket();
                }, this.reConnectDelay);
            }
        };
    }

    private processPendingQueue() {
        while (this.msgPendingQueue.length > 0) {
            const message = this.msgPendingQueue.shift();
            this.sendWithRetry(message);
        }
    }

    public sendWithRetry(message: any, retries: number = 0): Promise<any> {
        return new Promise((resolve, reject) => {
            const msgId = WebSocketClient.messageId++;
            let msgTimeout = null;
            message.msgId = msgId;

            if (this.socket.readyState === WebSocket.OPEN) {
                msgTimeout = this.sendMessage(message);
            } else {
                this.msgPendingQueue.push(message);
            }

            this.callbacks[msgId] = { resolve, reject, retries, msgTimeout };
        });
    }

    private sendMessage(message: any) {
        const msgId = message.msgId;
        this.socket.send(JSON.stringify(message));

        return window.setTimeout(() => {
            if (this.callbacks[msgId]) {
                const { reject, retries, msgTimeout } = this.callbacks[msgId];
                window.clearTimeout(msgTimeout);

                if (retries < this.msgMaxRetries) {
                    this.callbacks[msgId].retries++;
                    this.callbacks[msgId].msgTimeout = this.sendMessage(message);
                } else {
                    reject(new Error('Exceeded maximum retries'));
                    delete this.callbacks[msgId];
                }
            }
        }, this.msgRetryDelay);
    }

    public onMessage(callback: (message: any) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    public close() {
        if (this.reConnectTimeout) {
            window.clearTimeout(this.reConnectTimeout);
            this.reConnectTimeout = null;
        }

        this.socket.onclose = void 0;
        this.socket.close();
    }
}

// 使用示例
/*
    const ws = new WebSocketClient('ws://example.com/socket');

    ws.sendWithRetry({ type: 'get_data' }).then((response) => {
        console.log('Received response:', response);
    }).catch((error) => {
        console.error('Error:', error);
    });

    ws.sendWithRetry({ type: 'update_data', data: { id: 123, value: 'new value' } }).then((response) => {
        console.log('Received response:', response);
    }).catch((error) => {
        console.error('Error:', error);
    });

    // 关闭连接
    ws.close();
*/
