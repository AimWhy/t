export class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    then(onfulfilled, onrejected) {
        return this.promise.then(onfulfilled, onrejected);
    }
}

class MessageProxy {
    constructor(protocol, handler, isClient = false) {
        this.protocol = protocol;
        this.handler = handler;
        this.ready = new Deferred();
        this.messageId = 0;
        this.responseMap = new Map();
        this.disposables = [];
        const self = this;

        if (!isClient) {
            const first = self.protocol.onMessage(message => {
                // first message
                if (message === 'ready') {
                    // sanity check
                    const dispose = self.protocol.onMessage((val) => {
                        if (val !== 'ready') {
                            self.onReceive(val);
                        }
                    })
                    this.disposables.push(dispose);
                    first.dispose();
                    self.ready.resolve();
                }
            });
        } else {
            this.disposables.push(this.protocol.onMessage(val => this.onReceive(val)));
            this.ready.resolve();
            this.protocol.sendMessage('ready');
        }
    }

    async sendRequest(methodName, args) {
        await this.ready;
        const messageId = this.messageId++;
        const deferred = new Deferred();
        this.responseMap.set(messageId, deferred);
        const request = {
            messageId: messageId,
            method: methodName,
            passArguments: args
        };
        this.protocol.sendMessage(JSON.stringify(request));
        return deferred.promise;
    }

    onReceive(val) {
        const message = JSON.parse(val);
        if (isResponseMessage(message)) { // is a response
            const deferred = this.responseMap.get(message.originalMessageId);
            if (deferred) {
                deferred.resolve(message.response);
            }
        } else {
            Promise.resolve(this.handler[message.method].apply(this.handler, message.passArguments)).then(r => {
                const response = {
                    originalMessageId: message.messageId,
                    response: r
                };
                this.protocol.sendMessage(JSON.stringify(response));
            });
        }
    }

    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
}

function isResponseMessage(val) {
    return typeof val.originalMessageId === 'number';
}

export function createProxy(protocol, handler, isClient) {
    const messageProxy = new MessageProxy(protocol, handler, isClient);
    let proxy = {
        get: (target, name) => {
            if (!target[name]) {
                target[name] = (...myArgs) => {
                    return messageProxy.sendRequest(name, myArgs);
                };
            }
            return target[name];
        },
        dispose: () => {
            messageProxy.dispose();
        }
    };
    return new Proxy(Object.create(null), proxy);
}