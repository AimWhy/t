class AsyncChain {
    /**
     * 创建一个异步队列
     */
    constructor() {
        this.promise = new Promise(resolve => {
            this.resolve = resolve;
        });
    }

    /**
     * 向队列中添加值
     * @param {any} value - 要添加的值
     */
    put(value) {
        let resolveNext = null;
        const nextPromise = new Promise(resolve => {
            resolveNext = resolve;
        });

        this.resolve({
            value: Promise.resolve(value),
            nextPromise
        });

        this.resolve = resolveNext;
    }

    /**
     * 从队列中获取下一个值
     * @returns {Promise<any>} 下一个值的Promise
     */
    get() {
        const result = this.promise.then(info => info.value);
        this.promise = this.promise.then(info => info.nextPromise);
        return result;
    }

    /**
     * 实现异步可迭代协议
     * 使用异步生成器简化实现
     */
    async *[Symbol.asyncIterator]() {
        while (true) {
            try {
                // 无限循环等待并生成队列中的值
                yield await this.get();
            } catch (error) {
                console.error("Error in AsyncChain iterator:", error);
                break;
            }
        }
    }

    loop(callback) {
        AsyncChain.loopProcess(this, callback);
    }

    fork() {
        const forkChain = new AsyncChain();
        const put = forkChain.put.bind(forkChain);
        this.loop((value) => put(value));
        forkChain.put = () => {
            throw new Error('forkChain.put is not implemented');
        };
        return forkChain;
    }

    static async loopProcess(asyncChain, callback) {
        let count = 0;
        let preVal = null;

        for await (let value of asyncChain) {
            if (typeof data === 'function') {
                value = data(preVal);
            }
            // 处理每个值
            callback(value, preVal, count++);
            preVal = value;
        }
    }
}

Object.prototype.pipe = function (makeIter) {
    return makeIter(this)
}

let a = new AsyncChain();

a.pipe(async function* (data) {
    for await (let value of data) {
        console.log(value);
    }
})
function* gen() {
    yield 1;
    yield 2;
    yield 3;
}

function genSyncPipe() {
    function* pushIter() {
        const funcSet = new Set();
        let result;
        while (true) {
            const param = yield result;
            if (typeof param === 'function') {
                if (funcSet.has(param)) {
                    funcSet.delete(param);
                } else {
                    funcSet.add(param);
                }
            } else {
                let arg = param;
                for (const func of funcSet) {
                    const inner = func(arg);
                    if (inner !== void 0) {
                        arg = inner
                    }
                }
                result = arg;
            }
        }
    }

    const result = pushIter()
    const originNext = result.next.bind(result);
    result.next = result.pipe = function (p) {
        const { value } = originNext(p);
        result.value = typeof p === 'function' ? () => void (result.next(p)) : value;
        return result;
    };
    return result.next();
}


x = genSyncPipe()
x.pipe(v => console.log(v * v))
x.next(2)


const e = (() => {
    class E {
        constructor(isOn = true) {
            this.isOn = isOn;
            this.listeners = [];
        }
        on(listener) {
            this.listeners.push(listener);
            return () => this.listeners.splice(this.listeners.indexOf(listener), 1);
        }
        next(v) {
            if (this.isOn) {
                this.listeners.forEach(listener => listener(v));
            }
        }
        turn(isOn) {
            this.isOn = isOn;
        }
    }

    return (v) => new E(v);
})()


Object.prototype.pipe = function (it) {
    return it(this)
}

function toY2(fn) {
    return function () {

    }
}

function toY(fn) {
    return function (pre) {
        const result = e();
        const yield = result.next.bind(result);
        const remove = pre.on(v => fn(v, yield));

        return result
    }
}

let x = e(); // or x = ''.pipe(e)
x.pipe(toY((v, yield) => {
    console.log(v)
    yield(v * v)
})).pipe(toY((v) => console.log(v)))

x.next(2);
x.next(3);

x.pipe(toY((v, yield) => {
    console.log(-v)
}))

x.next(4);

x.turn(false)

x.next(5);