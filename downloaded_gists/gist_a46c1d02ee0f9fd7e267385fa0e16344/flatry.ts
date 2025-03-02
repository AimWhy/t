const MemoMap = new WeakMap();
const RACE_ERR = new Error('RACE_CONDITION');

function isPromise(value) {
    return value && typeof value.then === 'function';
}

function genChecker(symbol, strategy = 'last') {
    const raw = Symbol('raceSymbol');

    if (strategy === 'last' || !MemoMap.has(symbol)) {
        MemoMap.set(symbol, raw);
    }

    const checker = (result) => MemoMap.get(symbol) !== raw ? Promise.reject([RACE_ERR, result[1]]) : result
    checker.clean = () => MemoMap.delete(symbol);
    return checker;
}

function flatTry(fn, args = [], { context = null, checker = f => f() } = {}) {
    if (typeof fn !== "function") {
        throw new Error("Argument must be a function or Promise");
    }

    try {
        const result = fn.apply(context, args);
        if (isPromise(result)) {
            const errorFn = (err) => checker([err, null]);
            const successFn = (value) => checker([null, value])
            return result.then(successFn, errorFn)
        }
        return [null, result];
    } catch (err) {
        return [err, null];
    }
}

/**********************************************/

function delay(ms, v, isOk = 1) {
    const { promise, resolve, reject } = Promise.withResolvers()
    setTimeout(isOk ? resolve : reject, ms, v)
    return promise
}
const testSymbol = Symbol('testSymbol')
async function test(name) {
    const checker = genChecker(testSymbol, 'only')
    try {
        console.log(name + '进来了')

        let [err1, v1] = await flatTry(delay, [Math.random() * 1000, `${name} ==> 1`], { checker })
        if (!err1) {
            console.log(v1)
        }

        let [err2, v2] = await flatTry(delay, [Math.random() * 1000, `${name} ==> 2`], { checker })
        if (!err2) {
            console.log(v2)
        }

        let [err3, v3] = await flatTry(delay, [Math.random() * 1000, `${name} ==> 3`], { checker })
        if (!err3) {
            console.log(v3)
        }

        let [err4, v4] = await flatTry(delay, [Math.random() * 1000, `${name} ==> 4`], { checker })
        if (!err4) {
            console.log(v4)
        }

        console.log('success')
    } catch (error) {
        if (Array.isArray(error) && error[0] === RACE_ERR) {
            console.log('丢弃：' + error[1])
        }
    }
}

async function run() {
    test('a')
    await delay(350)
    test('b')
    await delay(380)
    test('c')
    await delay(360)
    test('d')
}
console.clear()
run()