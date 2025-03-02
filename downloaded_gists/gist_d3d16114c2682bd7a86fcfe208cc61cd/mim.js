let keepAlive = () => {
    keepAlive = () => { };
    const interval = setInterval(async () => {
        const { sw } = await findServiceWorker();
        if (sw) {
            sw.postMessage({ type: "PING" });
        } else {
            const ping = location.href.substring(0, location.href.lastIndexOf("/")) + "/ping";

            fetch(ping).then((res) => {
                !res.ok && clearInterval(interval);
                return res.text();
            });
        }
    }, 10000);
};

// Now that we have the Service Worker registered we can process messages
export async function postMessage(
    data: {
        origin?: string;
        referrer?: string;
        headers: Record<string, string>;
        pathname: string;
        url?: string;
        transferringReadable: boolean;
    },
    ports: MessagePort[]
) {
    const { scope, sw } = await findServiceWorker();
    if (!sw) {
        throw new Error("No service worker registered.");
    }

    if (!ports || !ports.length) {
        throw new TypeError("[StreamSaver] You didn't send a messageChannel");
    }

    if (typeof data !== "object") {
        throw new TypeError("[StreamSaver] You didn't send a object");
    }

    data.origin = window.location.origin;
    data.referrer = data.referrer || document.referrer || origin;
    new Headers(data.headers);

    data.pathname = data.pathname.replace(/^\/+/g, "");

    const org = origin.replace(/(^\w+:|^)\/\//, "");
    data.url = new URL(`${scope + org}/${data.pathname}`).toString();

    if (!data.url.startsWith(`${scope + org}/`)) {
        throw new TypeError("[StreamSaver] bad `data.pathname`");
    }

    const transferable = [ports[0]];

    if (!data.transferringReadable) {
        keepAlive();
    }

    return sw.postMessage({ type: "REGISTER_DOWNLOAD", ...data }, transferable);
}

export function register() {
    keepAlive();
}

export async function findServiceWorker(): Promise<{
    sw?: ServiceWorker;
    scope?: string;
}> {
    if (!("serviceWorker" in navigator)) {
        return {};
    }

    const registrations = (await navigator.serviceWorker?.getRegistrations()) || [];
    for (const registration of registrations) {
        if (registration.active) {
            return {
                sw: registration.active,
                scope: registration.scope
            };
        }
    }
    return {};
}

/****************************************************************************/

let supportsTransferable = false;

const isSecureContext = globalThis.isSecureContext;
// TODO: Must come up with a real detection test (#69)
let useBlobFallback =
    /constructor/i.test(globalThis.HTMLElement.toString()) ||
    "safari" in globalThis ||
    "WebKitPoint" in globalThis;

/**
 * create a hidden iframe and append it to the DOM (body)
 */
function makeIframe(src: string, doc = true) {
    if (!src) throw new Error("meh");

    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    if (doc) iframe.srcdoc = src;
    else iframe.src = src;
    document.body.appendChild(iframe);
    return iframe;
}

try {
    // We can't look for service worker since it may still work on http
    new Response(new ReadableStream());
    if (isSecureContext && !("serviceWorker" in navigator)) {
        useBlobFallback = true;
    }
} catch (err) {
    useBlobFallback = true;
}

function checkSupportsTransferable() {
    try {
        // Transferable stream was first enabled in chrome v73 behind a flag
        const { readable } = new TransformStream();
        const mc = new MessageChannel();
        mc.port1.postMessage(readable, [readable]);
        mc.port1.close();
        mc.port2.close();
        supportsTransferable = true;
    } catch {
        // ignore
    }
}
checkSupportsTransferable();

export async function createWriteStream(
    filename: string,
    opts: {
        size?: number;
        pathname?: string;
        signal?: AbortSignal;
    } = {}
): Promise<WritableStream<Uint8Array>> {
    const { sw } = await findServiceWorker();
    // let bytesWritten = 0; // by StreamSaver.js (not the service worker)
    let downloadUrl: string | null = null;
    let channel: MessageChannel | null = null;
    let ts: TransformStream | null = null;
    let frame: HTMLIFrameElement | null = null;
    
    if (sw && !useBlobFallback) {
        channel = new MessageChannel();

        // Make filename RFC5987 compatible
        filename = encodeURIComponent(filename.replace(/\//g, ":"))
            .replace(/['()]/g, escape)
            .replace(/\*/g, "%2A");
        const response: {
            transferringReadable: boolean;
            pathname: string;
            headers: Record<string, string>;
        } = {
            transferringReadable: supportsTransferable,
            pathname:
                opts.pathname || Math.random().toString().slice(-6) + "/" + filename,
            headers: {
                "Content-Type": "application/octet-stream; charset=utf-8",
                "Content-Disposition": "attachment; filename*=UTF-8''" + filename
            }
        };

        if (opts.size) {
            response.headers["Content-Length"] = `${opts.size}`;
        }

        if (supportsTransferable) {
            ts = new TransformStream();
            const readableStream = ts.readable;
            if (opts.signal) {
                opts.signal.addEventListener("abort", () => frame?.remove(), {
                    once: true
                });
            }
            channel.port1.postMessage({ readableStream }, [readableStream]);
        }
        channel.port1.onmessage = async (evt) => {
            // Service worker sent us a link that we should open.
            if (evt.data.download) {
                // We never remove this iframes because it can interrupt saving
                frame = makeIframe(evt.data.download, false);
            } else if (evt.data.abort) {
                chunks = [];
                if (channel) {
                    channel.port1.postMessage("abort"); //send back so controller is aborted
                    channel.port1.onmessage = null;
                    channel.port1.close();
                    channel.port2.close();
                    channel = null;
                }
            }
        };

        await postMessage(response, [channel.port2]);
    }

    let chunks: Uint8Array[] = [];
    return (
        (sw && !useBlobFallback && ts && ts.writable) ||
        new WritableStream({
            write(chunk) {
                if (opts.signal?.aborted) return;

                if (!(chunk instanceof Uint8Array)) {
                    throw new TypeError("Can only write Uint8Arrays");
                }
                if (!sw || useBlobFallback) {
                    // Safari... The new IE6
                    // https://github.com/jimmywarting/StreamSaver.js/issues/69
                    //
                    // even though it has everything it fails to download anything
                    // that comes from the service worker..!
                    chunks.push(chunk);
                    return;
                }

                // is called when a new chunk of data is ready to be written
                // to the underlying sink. It can return a promise to signal
                // success or failure of the write operation. The stream
                // implementation guarantees that this method will be called
                // only after previous writes have succeeded, and never after
                // close or abort is called.

                // TODO: Kind of important that service worker respond back when
                // it has been written. Otherwise we can't handle backpressure
                // EDIT: Transferable streams solves this...
                channel?.port1.postMessage(chunk);
                // bytesWritten += chunk.length;

                if (downloadUrl) {
                    window.location.href = downloadUrl;
                    downloadUrl = null;
                }
            },
            close() {
                if (opts.signal?.aborted) return;
                if (!sw || useBlobFallback) {
                    const blob = new Blob(chunks, {
                        type: "application/octet-stream; charset=utf-8"
                    });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = filename;
                    link.addEventListener("click", () => {
                        // `setTimeout()` due to
                        // https://github.com/LLK/scratch-gui/issues/1783#issuecomment-426286393
                        setTimeout(() => URL.revokeObjectURL(link.href), 30 * 1000);
                    });
                    link.click();
                    chunks = [];
                } else {
                    channel?.port1.postMessage("end");
                }
            },
            abort() {
                chunks = [];
                if (channel) {
                    channel.port1.postMessage("abort");
                    channel.port1.onmessage = null;
                    channel.port1.close();
                    channel.port2.close();
                    channel = null;
                }
            }
        })
    );
}
