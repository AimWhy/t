import { defer } from './deferred';
import { Time } from './time';
export const BUCKET_NAME = 'perfetto-ui-data';
export const MIME_JSON = 'application/json; charset=utf-8';
export const MIME_BINARY = 'application/octet-stream';

export class GcsUploader {
    constructor(data, args) {
        this.state = 'UPLOADING';
        this.error = '';
        this.totalSize = 0;
        this.uploadedSize = 0;
        this.uploadedUrl = '';
        this.uploadedFileName = '';
        this.donePromise = defer();
        this.startTime = performance.now();
        this.args = args;
        this.onProgress = args.onProgress ?? ((_) => { });
        this.req = new XMLHttpRequest();
        this.start(data);
    }
    /**
     * @param {Blob | ArrayBuffer | string} data 
     * @returns 
     */
    async start(data) {
        let fname = this.args.fileName;
        if (fname === void 0) {
            // If the file name is unspecified, hash the contents.
            if (data instanceof Blob) {
                fname = await hashFileStreaming(data);
            } else {
                fname = await sha1(data);
            }
        }
        this.uploadedFileName = fname;
        this.uploadedUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fname}`;

        // Check if the file has been uploaded already. If so, skip.
        const res = await fetch(`https://www.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${fname}`);
        if (res.status === 200) {
            console.log(`Skipping upload of ${this.uploadedUrl} because it exists already`);
            this.state = 'UPLOADED';
            this.donePromise.resolve();
            return;
        }

        const mimeType = this.args.mimeType ?? MIME_BINARY;
        const reqUrl = `https://www.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${fname}&predefinedAcl=publicRead`;

        this.req.onabort = (e) => this.onRpcEvent(e);
        this.req.onerror = (e) => this.onRpcEvent(e);
        this.req.upload.onprogress = (e) => this.onRpcEvent(e);
        this.req.onloadend = (e) => this.onRpcEvent(e);
        this.req.open('POST', reqUrl, /* async= */ true);
        this.req.setRequestHeader('Content-Type', mimeType);
        this.req.send(data);
    }
    waitForCompletion() {
        return this.donePromise;
    }
    abort() {
        if (this.state === 'UPLOADING') {
            this.req.abort();
        }
    }
    getEtaString() {
        let str = `${Math.ceil((100 * this.uploadedSize) / this.totalSize)}%`;
        str += ` (${(this.uploadedSize / 1e6).toFixed(2)} MB)`;
        const elapsed = (performance.now() - this.startTime) / 1000;
        const rate = this.uploadedSize / elapsed;
        const etaSecs = Math.round((this.totalSize - this.uploadedSize) / rate);
        str += ' - ETA: ' + Time.toTimecode(Time.fromSeconds(etaSecs)).dhhmmss;
        return str;
    }
    onRpcEvent(e) {
        let done = false;
        switch (e.type) {
            case 'progress':
                this.uploadedSize = e.loaded;
                this.totalSize = e.total;
                break;
            case 'abort':
                this.state = 'ERROR';
                this.error = 'Upload aborted';
                break;
            case 'error':
                this.state = 'ERROR';
                this.error = `${this.req.status} - ${this.req.statusText}`;
                break;
            case 'loadend':
                done = true;
                if (this.req.status === 200) {
                    this.state = 'UPLOADED';
                } else if (this.state === 'UPLOADING') {
                    this.state = 'ERROR';
                    this.error = `${this.req.status} - ${this.req.statusText}`;
                }
                break;
            default:
                return;
        }
        this.onProgress(this);
        if (done) {
            this.donePromise.resolve();
        }
    }
}
/**
 * @param [string | ArrayBuffer] data
 * @returns [Promise<string>]
 */
async function sha1(data) {
    let buffer;
    if (typeof data === 'string') {
        buffer = new TextEncoder().encode(data);
    } else {
        buffer = data;
    }
    const digest = await crypto.subtle.digest('SHA-1', buffer);
    return digestToHex(digest);
}
/**
 * @param [Blob] file
 * @returns [Promise<string>]
 */
async function hashFileStreaming(file) {
    const CHUNK_SIZE = 32 * 1024 * 1024; // 32MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let chunkDigests = '';
    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = await file.slice(start, end).arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-1', chunk);
        chunkDigests += digestToHex(digest);
    }
    return sha1(chunkDigests);
}
/**
 * @param [ArrayBuffer]
 * @returns [string]
 */
function digestToHex(digest) {
    return Array.from(new Uint8Array(digest))
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
}
