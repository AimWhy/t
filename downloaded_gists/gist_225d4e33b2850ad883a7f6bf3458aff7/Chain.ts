export type TInterceptor = (c: Chain) => Promise<void>

export interface IRequestParams {
    timeout?: number
    method?: string
    url?: string
    data?: unknown
}

export class Chain {
    index: number
    requestParams: IRequestParams
    interceptors: TInterceptor[]

    constructor(requestParams?: IRequestParams, interceptors?: TInterceptor[], index?: number) {
        this.index = index || 0
        this.requestParams = requestParams || {}
        this.interceptors = interceptors || []
    }

    proceed(requestParams: IRequestParams = {}) {
        this.requestParams = requestParams
        if (this.index >= this.interceptors.length) {
            throw new Error('chain 参数错误, 请勿直接修改 request.chain')
        }
        const nextInterceptor = this._getNextInterceptor()
        const nextChain = this._getNextChain()
        const p = nextInterceptor(nextChain)
        const res = p.catch(err => Promise.reject(err))
        Object.keys(p).forEach(k => (typeof p[k] === 'function') && (res[k] = p[k]))
        return res
    }

    _getNextInterceptor() {
        return this.interceptors[this.index]
    }

    _getNextChain() {
        return new Chain(this.requestParams, this.interceptors, this.index + 1)
    }
}

export class Link {
    taroInterceptor: TInterceptor
    chain: Chain

    constructor(interceptor: TInterceptor) {
        this.taroInterceptor = interceptor
        this.chain = new Chain()
    }

    request(requestParams: IRequestParams) {
        const chain = this.chain
        const taroInterceptor = this.taroInterceptor

        chain.interceptors = chain.interceptors
            .filter(interceptor => interceptor !== taroInterceptor)
            .concat(taroInterceptor)

        return chain.proceed({ ...requestParams })
    }

    addInterceptor(interceptor: TInterceptor) {
        this.chain.interceptors.push(interceptor)
    }

    cleanInterceptors() {
        this.chain = new Chain()
    }
}

export function logInterceptor(chain: Chain) {
    const requestParams = chain.requestParams
    const { method, data, url } = requestParams

    console.log(`http ${method || 'GET'} --> ${url} data: `, data)

    const p = chain.proceed(requestParams)
    const res = p.then(res => {
        console.log(`http <-- ${url} result:`, res)
        return res
    })

    if (typeof p.abort === 'function') {
        res.abort = p.abort
    }

    return res
}