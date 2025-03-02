export function createPromiseLock() {
    const locks = [];
    return {
        async run(fn) {
            const p = fn();
            locks.push(p);
            try {
                return await p;
            }
            finally {
                remove(locks, p);
            }
        },
        async wait() {
            await Promise.allSettled(locks);
        },
        isWaiting() {
            return Boolean(locks.length);
        },
        clear() {
            locks.length = 0;
        },
    };
}
