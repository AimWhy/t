const PUBLIC_PATH = 'https://cdn.protonmail.ch/';
const stripLeadingAndTrailingSlash = (str) => str.replace(/^\/+|\/+$/g, '');

function createDownloadIframe(src) {
    const iframe = document.createElement('iframe');
    iframe.hidden = true;
    iframe.src = src;
    iframe.name = 'iframe';
    document.body.appendChild(iframe);
    return iframe;
}

async function wakeUpServiceWorker(retry = true) {
    const worker = navigator.serviceWorker.controller;

    if (worker) {
        worker.postMessage({ action: 'ping' });
    } else {
        const url = [
            document.location.href.substring(0, document.location.href.indexOf('/')),
            stripLeadingAndTrailingSlash(PUBLIC_PATH),
            'sw/ping',
        ].filter(Boolean).join('/');

        const res = await fetch(url);
        const body = await res.text();
        if (!res.ok || body !== 'pong') {
            if (!retry) {
                throw new Error('Download worker is dead');
            }
            console.warn('Download worker is dead, retrying registration');
            await initDownloadSW();
            await wakeUpServiceWorker(false);
        }
    }
    return worker;
}

let workerAliveInterval = 0;
function serviceWorkerKeepAlive() {
    clearInterval(workerAliveInterval);
    workerAliveInterval = setInterval(() => {
        wakeUpServiceWorker().catch(() => clearInterval(workerAliveInterval));
    }, 10000);
}

export async function initDownloadSW() {
    await navigator.serviceWorker.register(new URL('./downloadSW', import.meta.url), {
        scope: `/${stripLeadingAndTrailingSlash(PUBLIC_PATH)}`,
    });

    serviceWorkerKeepAlive();
}

/**
 * @param {{ filename: string; mimeType: string; size?: number; }} meta
*/
export async function openDownloadStream(meta, { onCancel, abortSignal }) {
    const channel = new MessageChannel();
    const stream = new WritableStream({
        write(block) {
            channel.port1.postMessage({ action: 'download_chunk', payload: block });
        },
        close() {
            channel.port1.postMessage({ action: 'end' });
        },
        abort(reason) {
            channel.port1.postMessage({ action: 'abort', reason: String(reason) });
        },
    });

    if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
            channel.port1.postMessage({ action: 'abort', reason: 'Download stream aborted' });
        });
    }

    const worker = await wakeUpServiceWorker();

    channel.port1.onmessage = ({ data }) => {
        if (data?.action === 'download_canceled') {
            onCancel();
        } else if (data?.action === 'download_started') {
            createDownloadIframe(data.payload);
        }
    };
    worker.postMessage({ action: 'start_download', payload: meta }, [channel.port2]);

    return stream;
}

/**************************************************************************************************/

async function test(stream, meta) {
    const abortController = new AbortController();
    const saveStream = await openDownloadStream(meta, { onCancel: () => abortController.abort() });

    await new Promise((resolve, reject) => {
        abortController.signal.addEventListener('abort', () => {
            reject(new Error(`Transfer canceled`));
        });
        stream.pipeTo(saveStream, { preventCancel: true }).then(resolve).catch(reject);
    });
}

// 1. initDownloadSW();
// 2. test(response.body, { filename, mimeType, size }).then(（）=> {
//     console.log('Download completed');
// })；