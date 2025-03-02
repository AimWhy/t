var fetchFn = fetch;
if (typeof TransformStream === "function" && ReadableStream.prototype.pipeThrough) {
    async function fetchWithProgress(path) {
        const response = await fetch(path);
        // May be incorrect if compressed
        const contentLength = response.headers.get("Content-Length");
        const total = parseInt(contentLength, 10);

        let bytesLoaded = 0;
        const ts = new TransformStream({
            transform(chunk, controller) {
                bytesLoaded += chunk.byteLength;
                console.log(bytesLoaded, total);
                controller.enqueue(chunk)
            }
        });

        return new Response(response.body.pipeThrough(ts), response);
    }
    fetchFn = fetchWithProgress;
}


/**************************************************************/


export const MILLISECOND = 1;
export const SECOND = MILLISECOND * 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;

export const getFetchWithTimeout = (timeout = SECOND * 30) => {
    if (!Number.isInteger(timeout) || timeout < 1) {
        throw new Error('Must specify positive integer timeout.');
    }

    return async function _fetch(url, opts) {
        const abortController = new window.AbortController();
        const { signal } = abortController;
        const f = window.fetch(url, { ...opts, signal });
        const timer = setTimeout(() => abortController.abort(), timeout);

        try {
            const res = await f;
            clearTimeout(timer);
            return res;
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    };
};

export const fetchWithCache = async (url, fetchOptions = {}, { cacheRefreshTime = MINUTE * 6, timeout = SECOND * 30 } = {},) => {
    if (fetchOptions.body || (fetchOptions.method && fetchOptions.method !== 'GET')) {
        throw new Error('fetchWithCache only supports GET requests');
    }

    if (!(fetchOptions.headers instanceof window.Headers)) {
        fetchOptions.headers = new window.Headers(fetchOptions.headers);
    }

    if (fetchOptions.headers.has('Content-Type') && fetchOptions.headers.get('Content-Type') !== 'application/json') {
        throw new Error('fetchWithCache only supports JSON responses');
    }

    const currentTime = Date.now();
    const cacheKey = `cachedFetch:${url}`;

    const { cachedResponse, cachedTime } = (await getStorageItem(cacheKey)) || {};
    if (cachedResponse && currentTime - cachedTime < cacheRefreshTime) {
        return cachedResponse;
    }

    fetchOptions.headers.set('Content-Type', 'application/json');
    const fetchWithTimeout = getFetchWithTimeout(timeout);

    const response = await fetchWithTimeout(url, {
        referrerPolicy: 'no-referrer-when-downgrade',
        body: null,
        method: 'GET',
        mode: 'cors',
        ...fetchOptions,
    });

    if (!response.ok) {
        throw new Error(`Fetch failed with status '${response.status}': '${response.statusText}'`);
    }
    const responseJson = await response.json();
    const cacheEntry = { cachedResponse: responseJson, cachedTime: currentTime };

    await setStorageItem(cacheKey, cacheEntry);
    return responseJson;
};
