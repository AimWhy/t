const SECURITY_HEADERS = {
    'Content-Security-Policy': "default-src 'none'",
    'X-Content-Security-Policy': "default-src 'none'",
    'X-WebKit-CSP': "default-src 'none'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'deny',
    'X-XSS-Protection': '1; mode=block',
    'X-Permitted-Cross-Domain-Policies': 'none',
};

function createDownloadStream(port) {
    return new ReadableStream({
        start(controller) {
            port.onmessage = ({ data }) => {
                switch (data?.action) {
                    case 'end':
                        return controller.close();
                    case 'download_chunk':
                        return controller.enqueue(data?.payload);
                    case 'abort':
                        return controller.error(data?.reason);
                    default:
                        console.error(`received unknown action "${data?.action}"`);
                }
            };
        },
        cancel() {
            port.postMessage({ action: 'download_canceled' });
        },
    });
}

class DownloadServiceWorker {
    constructor() {
        /*
        value: {
            stream: ReadableStream<Uint8Array>;
            filename: string;
            mimeType: string;
            size?: number;
        }
        */
        this.pendingDownloads = new Map();
        this.downloadId = 1;
        this.generateUID = () => ++this.downloadId % 9000;
        this.onInstall = () => void self.skipWaiting();
        this.onActivate = (event) => void event.waitUntil(self.clients.claim());

        this.onFetch = (event) => {
            const url = new URL(event.request.url);

            if (!url.pathname.startsWith('/sw')) {
                return;
            }

            if (url.pathname.endsWith('/sw/ping')) {
                return event.respondWith(new Response('pong', { headers: new Headers(SECURITY_HEADERS) }));
            }

            // URL format: /sw/ID
            const chunks = url.pathname.split('/').filter((item) => !!item);
            const id = chunks[chunks.length - 1];
            const pendingDownload = this.pendingDownloads.get(id);

            if (!pendingDownload) {
                return event.respondWith(new Response(undefined, {
                    status: 404,
                    headers: new Headers(SECURITY_HEADERS),
                }));
            }

            this.pendingDownloads.delete(id);

            const { stream, filename, size, mimeType } = pendingDownload;
            const headers = new Headers({
                ...(size ? { 'Content-Length': `${size}` } : {}),
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                ...SECURITY_HEADERS,
            });

            event.respondWith(new Response(stream, { headers }));
        };

        this.onMessage = (event) => {
            if (event.data?.action !== 'start_download') {
                return;
            }

            const id = this.generateUID();
            const { filename, mimeType, size } = event.data.payload;
            const downloadUrl = new URL(`/sw/${id}`, self.registration.scope);
            const port = event.ports[0];
            const stream = createDownloadStream(port);

            this.pendingDownloads.set(`${id}`, { stream, filename, mimeType, size });
            port.postMessage({ action: 'download_started', payload: downloadUrl.toString() });
        };

        self.addEventListener('install', this.onInstall);
        self.addEventListener('activate', this.onActivate);
        self.addEventListener('message', this.onMessage);
        self.addEventListener('fetch', this.onFetch);
    }
}
export default new DownloadServiceWorker();