
export class Cache extends Map {
    constructor(opts = {}) {
        super();

        if (typeof opts === 'number') {
            opts = {max: opts};
        }

        const {max, maxAge = -1} = opts;
        this.max = max > 0 && max || Infinity;
        this.maxAge = maxAge;
        this.stale = !!opts.stale;
    }

    peek(key) {
        return this.get(key, false);
    }

    set(key, content, maxAge = this.maxAge) {
        this.has(key) && this.delete(key);
        (this.size + 1 > this.max) && this.delete(this.keys().next().value);
        const expires = maxAge > -1 && (maxAge + Date.now());
        return super.set(key, {expires, content});
    }

    get(key, mut = true) {
        const x = super.get(key);
        if (x === void 0) {
            return x;
        }

        const {expires, content} = x;
        if (expires !== false && Date.now() >= expires) {
            this.delete(key);
            return this.stale ? content : void 0;
        }

        if (mut) {
            this.set(key, content);
        }
        return content;
    }
}

export function hash(str) {
    let hash = 5381;
    let i = str.length;

    while (i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
    }

    return hash >>> 0;
}

/**
  * post请求封装
  * @param {String} url
  * @param {Object} params
  * @param {Object} options 除了method params的其他请求配置参数，具体格式参考 umi-request。
  */
const rawPost = (url, params, options = {}) => {
    const {
        method,
        params: optionParams,
        otherOptions = {}
    } = options;

    return request(`${origin}${url}`, {
        method: 'POST',
        data: params,
        headers: {
            'baggage-version': 'sale-home-page'
        },
        ...otherOptions
    });
};

const postRequestCache = new Cache({max: 40, maxAge: 3000});

const controlledPromise = () => {
    const defer = {timeStamp: 0};
    defer.promise = new Promise((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
        defer.resolve.mark = (t = 1) => result => t >= defer.timeStamp && resolve(result);
        defer.reject.mark = (t = 1) => error => t >= defer.timeStamp && reject(error);
    });
    return defer;
};

const post = (url, params, options = {}) => {
    const argStr = JSON.stringify({url, params, options});
    const postKey = hash(argStr);
    let controlled = postRequestCache.get(postKey);

    const {
        useFirst = true,
        useLast = false,
        useFastest = false
    } = options;

    if (!controlled) {
        controlled = controlledPromise();

        controlled.promise.finally(() => {
            postRequestCache.delete(postKey);
        });

        postRequestCache.set(postKey, controlled);

        rawPost(url, params, options).then(controlled.resolve.mark(), controlled.reject.mark());

        return controlled.promise;
    }

    if (useFirst) {
        console.log('只发送第一次');
    }
    else if (useLast) {
        const timeStamp = performance.now();
        controlled[timeStamp] = timeStamp;
        rawPost(url, params, options).then(controlled.resolve.mark(timeStamp), controlled.reject.mark(timeStamp));
    }
    else if (useFastest) {
        rawPost(url, params, options).then(controlled.resolve, controlled.reject);
    }

    return controlled.promise;
};