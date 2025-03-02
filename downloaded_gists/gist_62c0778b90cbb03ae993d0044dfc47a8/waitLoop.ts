export function getTimestamp(): number {
    return Date.now();
}

export function getElapsedTime(timestamp: number): number {
    return getTimestamp() - timestamp;
}

export async function wait(timeoutMillisecond: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, timeoutMillisecond));
}

export async function waitLoop<T>(
    loopFunc: () => Promise<T>,
    exitFunc: (result: T) => Promise<boolean>,
    timeoutMsec: number = 10000,
    waitMsec: number = 100,
): Promise<T> {
    let result;
    let exit;
    const end = getTimestamp() + timeoutMsec;

    do {
        await wait(waitMsec);
        result = await loopFunc();
        exit = await exitFunc(result);
    } while (exit !== true && getElapsedTime(end) <= 0);

    return result;
}