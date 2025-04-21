function jsStackTrace() {
    var error = new Error();
    if (!error.stack) {
        // IE10+ special cases: It does have callstack info, but it is only
        // populated if an Error object is thrown, so try that as a special-case.
        try {
            throw new Error();
        } catch (e) {
            error = e;
        }

        if (!error.stack) {
            return '(no stack trace available)';
        }
    }
    return error.stack.toString();
}


const map = mapper => original => (a, b, c) => {
    original(v => a(mapper(v)))
}

Function.prototype.pipe = function (fn) {
    fn(this);
}


function notify(action) {
    return (a, b, c) => {
        action(a, b, c);
    }
}


notify(function (a, b, c) {
    a(2);
    setTimeout(() => {
        b(9);
    }, 1000);
}).pipe(map(i => i + 1))


const lazyFlatten = function* (iter) {
    // 字符串会无限递归
    // ('string' !== typeof a && Symbol.iterator in Object(a))
    if (iter && typeof iter === 'object' && Symbol.iterator in iter) {
        for (const a of iter) {
            yield* lazyFlatten(a);
        }
    } else {
        yield iter;
    }
};

console.log([...lazyFlatten([1, [2], [[3, 4], '6,7,8']])])




function ob(source) {
    function* creator() {
        let count = 0;
        const { next, error, complete } = yield count++;
        try {
            while (true) {
                next(yield);
            }
        } catch (e) {
            error(e);
        } finally {
            complete();
        }
    }

    creator.prototype.pipe = function ({ next, error, complete }) {
        // 创建新的generator
        return ob(sink => {
            this.next();
            this.next({
                next: v => sink.next(next(v)),
                error: err => (error(err), sink.throw(err)),
                complete: () => (complete(), sink.return()),
            });
            source(this);
        });
    };

    creator.prototype.subscribe = function ({ next, error, complete }) {
        this.next();
        this.next({ next, error, complete });
        source(this);

        // 返回取消订阅的函数
        return {
            unsubscribe: () => {
                try {
                    this.return && this.return();
                } catch (e) {
                    // 忽略取消订阅过程中的错误
                }
            }
        };
    };

    return creator();
}

// 测试代码
let map2 = mapper => original => mapper(original);

ob(g => {
    g.next(1);
    g.next(3);
    g.next(9);
}).pipe(map2(i => i + 1)).pipe(map2(i => i * 1)).subscribe({ next: console.log });