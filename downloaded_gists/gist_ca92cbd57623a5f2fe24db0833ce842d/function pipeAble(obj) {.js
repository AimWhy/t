const pipeAble = (obj, alias = 'value') => ({
    [alias]: obj,
    pipe: (fn) => pipeAble(fn(obj), alias),
});

function trigger(action, arg) {
    let isDone = false;
    let teardownRef = null;
    let unsubscribed = false;
    let teardownImmediately = false;

    const unsubscribe = () => {
        if (teardownRef === null) {
            teardownImmediately = true;
            return;
        }
        if (!unsubscribed) {
            unsubscribed = true;
            if (typeof teardownRef === 'function') {
                return teardownRef();
            }
            if (teardownRef && teardownRef.unsubscribe) {
                teardownRef.unsubscribe();
            }
        }
    }

    const template = (fn, isTrigger, ...rest) => {
        let result;
        if (!isDone) {
            result = fn(...rest);
            isTrigger && (isDone = true);
            isTrigger && unsubscribe();
        }
        return result;
    };

    teardownRef = action({
        next: template.bind(null, arg.next, !1),
        error: template.bind(null, arg.error, !0),
        complete: template.bind(null, arg.complete, !0),
    });
    teardownImmediately && unsubscribe();

    return ({ unsubscribe });
};

const observer = (action) => pipeAble(trigger.bind(null, action), 'subscribe');

const map = (fn) => (pre) => ({ next, error, complete }) => {
    return pre({
        next: val => next(fn(val)),
        error: err => error(err),
        complete: () => complete(),
    })
}

observer(subscribe => {
    subscribe.next(1)
    subscribe.next(3)
    subscribe.next(9)
    subscribe.error(new Error('error'))
    subscribe.next(12)
    return () => {
        console.log('unsubscribe')
    }
}).pipe(map(i => i + 1)).subscribe({ next: console.log, error: console.error, complete: () => console.log('complete') })