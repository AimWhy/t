"use strict";
const fulfilled = Promise.resolve();
const toPromise = (value) => (value && typeof value.then === 'function') ? value : fulfilled.then(() => value);
const awaiter = function (thisArg, _arguments, generator, checker) {
    return new Promise(function (resolve, reject) {
        function goNext(value, type = 'next') {
            try {
                const checkerError = checker();
                if (checkerError) {
                    step(generator.throw(checkerError));
                } else {
                    step(generator[type](value));
                }
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve(result.value) : toPromise(result.value).then(goNext, e => goNext(e, 'throw'));
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const runWeakMap = new WeakMap();
function runGenerator(genFunc, ...args) {
    const stamp = !runWeakMap.has(genFunc) ? 0 : runWeakMap.get(genFunc);
    const enterStamp = (stamp + 1) % Number.MAX_SAFE_INTEGER;

    runWeakMap.set(genFunc, enterStamp);
    const checker = () => enterStamp === runWeakMap.get(genFunc) ? null : new Error('Race Condition');

    return awaiter(this, args, genFunc, checker);
}

function* test(ms) {
    try {
        const data = yield new Promise((r) => setTimeout(r, ms, ms))
        console.log(data);
        // console.log(data);
    } catch (error) {
        console.error('出错了:', error);
    }
}

runGenerator(test, 200).catch(e => console.log(e))
runGenerator(test, 100).catch(e => console.log(e))