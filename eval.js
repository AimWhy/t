function ob(source) {
    function* gen(list) {
        while (true) {
            const { type, func } = yield;
            list.push(func);
            if (type === 'subscribe') {
                break;
            }
        }
        while (true) {
            let args = yield;
            for (const func of list) {
                args = func(args);
            }
        }
    }
    gen.prototype.pipe = function (func) {
        this.next({ type: 'pipe', func });
        return this;
    }
    gen.prototype.subscribe = function (func) {
        this.next({ type: 'subscribe', func });
        const unsubscribe = source(params);
        this.next(unsubscribe);
    }
    const result = gen([]);
    const params = {
        next: (value) => result.next(value),
        throw: (exception) => result.throw(exception),
        return: (value) => result.return(value),
    };
    result.next();
    return result;
}

const map = (fn) => value => fn(value);

function test() {
    try {
        ob(subscribe => {
            subscribe.next(1)
            subscribe.next(3)
            subscribe.next(9)
            subscribe.throw(new Error('error'))
            subscribe.next(12)

            return () => console.log('unsubscribe');
        }).pipe(map(i => i + 1)).subscribe(console.log)
    } catch (e) {
        console.log(e)
    }
}

test();