import { Storage } from "./storage";

function run(fn, context, args, snapshot) {
    const revert = Storage.switch(snapshot);
    try {
        return fn.apply(context, args);
    } finally {
        Storage.restore(revert);
    }
}

export class Snapshot {
    #snapshot = Storage.snapshot();

    static wrap(fn) {
        const snapshot = Storage.snapshot();
        return function (...args) {
            return run(fn, this, args, snapshot);
        }
    }

    run(fn, ...args) {
        return run(fn, null, args, this.#snapshot);
    }
}
