const serializableProperties = [
    'method',
    'referrer',
    'referrerPolicy',
    'mode',
    'credentials',
    'cache',
    'redirect',
    'integrity',
    'keepalive',
];

export class StorableRequest {
    _requestData;

    static async fromRequest(request) {
        const requestData = {
            url: request.url,
            headers: {},
        };
        if (request.method !== 'GET') {
            requestData.body = await request.clone().arrayBuffer();
        }
        for (const [key, value] of request.headers.entries()) {
            requestData.headers[key] = value;
        }
        for (const prop of serializableProperties) {
            if (request[prop] !== undefined) {
                requestData[prop] = request[prop];
            }
        }
        return new StorableRequest(requestData);
    }

    constructor(requestData) {
        if (requestData['mode'] === 'navigate') {
            requestData['mode'] = 'same-origin';
        }
        this._requestData = requestData;
    }

    toObject() {
        const requestData = Object.assign({}, this._requestData);
        requestData.headers = Object.assign({}, this._requestData.headers);
        if (requestData.body) {
            requestData.body = requestData.body.slice(0);
        }
        return requestData;
    }

    toRequest() {
        return new Request(this._requestData.url, this._requestData);
    }

    clone() {
        return new StorableRequest(this.toObject());
    }
}