const isPromise = value => value ? typeof value.then === 'function' : false;

const RaceConditionMap = new Map();
const defaultChecker = v => v;


function useAsyncTry(p, key) {

}


function useTry(fn, args, key) {
    if (typeof fn !== 'function') {
        throw new Error('First Argument must be a function');
    }
    const symbol = Symbol();
    const checker = () => {};

    const errorFn = err => {
        RaceConditionMap.delete(key);
        return [err, null];
    };
    const successFn = value => {
        RaceConditionMap.delete(key);
        return [null, value];
    };

    try {
        const result = fn(...args);
        const isAsync = isPromise(result);

        return isAsync ? result.then(successFn, errorFn) : successFn(result);
    } catch (err) {
        return errorFn(err);
    }
}

const genRaceConditionChecker = (function () {
    const globalMap = new WeakMap();
    return function ({ key }) {
        if (!key) {
            return () => null;
        }

        const callSymbol = Symbol();
        globalMap.set(key, callSymbol);

        return function checker() {
            if (globalMap.has(key) && callSymbol === globalMap.get(key) && globalMap.delete(key)) {
                return null;
            }
            return { raceError: !0 }
        }
    };
})();

function genRaceConditionChecker({ key }) {
    if (!key) {
        return () => null;
    }

    const globalMap = genRaceConditionChecker.map ||= new Map();
    const callSymbol = Symbol();
    globalMap.set(key, callSymbol);

    return function checker() {
        if (globalMap.has(key) && callSymbol === globalMap.get(key) && globalMap.delete(key)) {
            return null;
        }
        return { raceError: !0 }
    }
};