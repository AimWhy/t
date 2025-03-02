import { parseDuration } from './util.js';
export async function retry(count, a, b) {
    const total = count;
    let callback;
    let delayStatic = 0;
    let delayGen;
    if (typeof a == 'function') {
        callback = a;
    }
    else {
        if (typeof a == 'object') {
            delayGen = a;
        }
        else {
            delayStatic = parseDuration(a);
        }
        assert(b);
        callback = b;
    }
    let lastErr;
    let attempt = 0;
    while (count-- > 0) {
        attempt++;
        try {
            return await callback();
        }
        catch (err) {
            let delay = 0;
            if (delayStatic > 0)
                delay = delayStatic;
            if (delayGen)
                delay = delayGen.next().value;
            $.log({
                kind: 'retry',
                error: chalk.bgRed.white(' FAIL ') +
                    ` Attempt: ${attempt}${total == Infinity ? '' : `/${total}`}` +
                    (delay > 0 ? `; next in ${delay}ms` : ''),
            });
            lastErr = err;
            if (count == 0)
                break;
            if (delay)
                await sleep(delay);
        }
    }
    throw lastErr;
}