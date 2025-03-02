// Ryan's implementation from https://dev.to/ryansolid/building-a-reactive-library-from-scratch-1i0p
const context = [];
export function signal(value) {
    const subscriptions = new Set();
    const read = () => {
        const running = context[context.length - 1];
        if (running) {
            subscriptions.add(running);
            running.dependencies.add(subscriptions);
        }
        return value;
    };
    const set = (nextValue) => {
        value = nextValue;
        for (const sub of [...subscriptions]) {
            sub.execute();
        }
    };
    read.set = set;
    return read;
}
function cleanup(running) {
    for (const dep of running.dependencies) {
        dep.delete(running);
    }
    running.dependencies.clear();
}
export function effect(fn) {
    const execute = () => {
        cleanup(running);
        context.push(running);
        try {
            fn();
        }
        finally {
            context.pop();
        }
    };
    const running = {
        execute,
        dependencies: new Set()
    };
    execute();
}