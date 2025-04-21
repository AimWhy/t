export function waitUntil<T>(
    condition: () => Promise<T | null> | T | null,
    interval: number = 1000,
    timeout?: number,
): Promise<T | null> {
    return new Promise(async (resolve, reject) => {
        let сheckInterval: number | undefined;
        let rejectTimeout = timeout && setTimeout(() => {
            cleanup();
            resolve(null);
        }, timeout);

        const cleanup = () => {
            rejectTimeout && clearTimeout(rejectTimeout);
            сheckInterval && clearInterval(сheckInterval);
        };

        const tryToResolve = async (): Promise<boolean> => {
            try {
                const result = await condition();
                if (result) {
                    cleanup();
                    resolve(result);
                }
                return !!result;
            } catch (err) {
                cleanup();
                reject(err);
                return false;
            }
        };

        const resolved = await tryToResolve();
        if (resolved) {
            сheckInterval = setInterval(tryToResolve, interval);
        }
    });
}