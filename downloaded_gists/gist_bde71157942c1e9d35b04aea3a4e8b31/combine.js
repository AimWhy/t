export function combine(...chunks) {
    let result = [];

    (function helper(level, pre) {
        let chunk = chunks[level]
        let isResult = level === chunks.length - 1;

        for (let val of chunk) {
            let cur = pre.concat(val)
            if (isResult) {
                result.push(cur)
            } else {
                helper(level + 1, cur)
            }
        }

    })(0, [])

    return result;
}

export function compose(middlewareArr) {
    return function (context, next) {
        let index = -1;

        (function inner(i) {
            if (index >= i) {
                return Promise.reject(new Error('next() called multiple times'))
            }

            index = i

            let fun = index === middlewareArr.length ? next : middlewareArr[i];

            if (!fun) {
                return Promise.resolve() // 调用到根后触发
            } else {
                return Promise.resolve().then(() => fun(context, inner.bind(null, i + 1)))
            }
        })(0);
    }
}

export function compose(fn1, ...fns) {
    return fns.reduce((f1, f2) => (...args) => f1(f2(...args)), fn1);
} 