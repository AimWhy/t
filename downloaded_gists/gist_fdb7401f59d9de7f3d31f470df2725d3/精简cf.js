import { connect } from 'cloudflare:sockets';

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;

const safeCloseWebSocket = (socket) => {
    try {
        // 只有在 WebSocket 处于开放或正在关闭状态时才调用 close()
        // 这避免了在已关闭或连接中的 WebSocket 上调用 close()
        if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
            socket.close();
        }
    } catch (error) {
        console.error('safeCloseWebSocket error', error);
    }
}

let proxyIP = "ts.hpc.tw";
let userID = "d6dae435-1839-4a50-9335-b1868178ad35";

async function vlessOverWSHandler(request) {
    const webSocketPair = new WebSocketPair();
    const [client, webSocket] = Object.values(webSocketPair);

    webSocket.accept();

    let address = '';
    let portWithRandomLog = '';
    const log = (info, event) => console.log(`[${address}:${portWithRandomLog}] ${info}`, event || '');
    // 获取早期数据头部，可能包含了一些初始化数据
    const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';
    // 创建一个可读的 WebSocket 流，用于接收客户端数据
    const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

    let isDns = false;
    // 用于存储远程 Socket 的包装器
    let remoteSocketWrapper = { value: null };
    // WebSocket 数据流向远程服务器的管道
    readableWebSocketStream.pipeTo(new WritableStream({
        async write(chunk, controller) {
            if (isDns) {
                // 如果是 DNS 查询，调用 DNS 处理函数
                return await handleDNSQuery(chunk, webSocket, null, log);
            }

            if (remoteSocketWrapper.value) {
                const writer = remoteSocketWrapper.value.writable.getWriter()
                await writer.write(chunk);
                writer.releaseLock();
                return;
            }

            const {
                hasError,
                message,
                addressType,
                portRemote = 443,
                addressRemote = '',
                rawDataIndex,
                vlessVersion = new Uint8Array([0, 0]),
                isUDP,
            } = processVlessHeader(chunk, userID);

            // 设置地址和端口信息，用于日志
            address = addressRemote;
            portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '}`;

            if (hasError) {
                // controller.error(message);
                // cf seems has bug, controller.error will not end stream
                throw new Error(message);
                // webSocket.close(1000, message);
                return;
            }

            // 如果是 UDP 且端口不是 DNS 端口（53），则关闭连接
            if (isUDP) {
                if (portRemote === 53) {
                    isDns = true;
                } else {
                    // controller.error('UDP proxy only enable for DNS which is port 53');
                    // cf seems has bug, controller.error will not end stream
                    throw new Error('UDP 代理仅对 DNS（53 端口）启用');
                    return;
                }
            }
            // 构建 Vless 响应头部 ["version", "附加信息长度 N"]
            const vlessResponseHeader = new Uint8Array([vlessVersion[0], 0]);
            // 获取实际的客户端数据
            const rawClientData = chunk.slice(rawDataIndex);

            if (isDns) {
                // 如果是 DNS 查询，调用 DNS 处理函数
                return handleDNSQuery(rawClientData, webSocket, vlessResponseHeader, log);
            }
            // 处理 TCP 出站连接
            handleTCPOutBound(remoteSocketWrapper, addressType, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log);
        },
        close() {
            log(`readableWebSocketStream is close`);
        },
        abort(reason) {
            log(`readableWebSocketStream is abort`, JSON.stringify(reason));
        },
    })).catch((err) => {
        log('readableWebSocketStream pipeTo error', err);
    });

    // 返回一个 WebSocket 升级的响应
    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}

async function handleTCPOutBound(remoteSocket, addressType, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log) {
    async function connectAndWrite(address, port, socks = false) {
        const tcpSocket = connect({ hostname: address, port: port });
        remoteSocket.value = tcpSocket;
        log(`connected to ${address}:${port}`);
        const writer = tcpSocket.writable.getWriter();
        await writer.write(rawClientData);
        // 首次写入，通常是 TLS 客户端 Hello 消息
        writer.releaseLock();
        return tcpSocket;
    }

    /**
     * 重试函数：当 Cloudflare 的 TCP Socket 没有传入数据时，我们尝试重定向 IP
     * 这可能是因为某些网络问题导致的连接失败
     */
    async function retry() {
        const tcpSocket2 = await connectAndWrite(proxyIP || addressRemote, portRemote);

        // 无论重试是否成功，都要关闭 WebSocket（可能是为了重新建立连接）
        tcpSocket2.closed.catch(error => {
            console.log('retry tcpSocket closed error', error);
        }).finally(() => {
            safeCloseWebSocket(webSocket);
        })
        // 建立从远程 Socket 到 WebSocket 的数据流
        remoteSocketToWS(tcpSocket2, webSocket, vlessResponseHeader, null, log);
    }

    // 首次尝试连接远程服务器
    const tcpSocket = await connectAndWrite(addressRemote, portRemote);

    // 当远程 Socket 就绪时，将其传递给 WebSocket
    // 建立从远程服务器到 WebSocket 的数据流，用于将远程服务器的响应发送回客户端
    // 如果连接失败或无数据，retry 函数将被调用进行重试
    remoteSocketToWS(tcpSocket, webSocket, vlessResponseHeader, retry, log);
}

function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
    // 标记可读流是否已被取消
    let readableStreamCancel = false;
    return new ReadableStream({
        start(controller) {
            webSocketServer.addEventListener('message', (event) => {
                // 如果流已被取消，不再处理新消息
                if (!readableStreamCancel) {
                    controller.enqueue(event.data);
                }
            });

            // 监听 WebSocket 的关闭事件
            // 注意：这个事件意味着客户端关闭了客户端 -> 服务器的流
            // 但是，服务器 -> 客户端的流仍然打开，直到在服务器端调用 close()
            // WebSocket 协议要求在每个方向上都要发送单独的关闭消息，以完全关闭 Socket
            webSocketServer.addEventListener('close', () => {
                // 客户端发送关闭，需要关闭服务器
                // 如果数据流被取消，跳过 controller.close
                safeCloseWebSocket(webSocketServer);
                if (!readableStreamCancel) {
                    controller.close();
                }
            });

            webSocketServer.addEventListener('error', (err) => {
                log('webSocketServer has error');
                controller.error(err);
            });

            // 处理 WebSocket 0-RTT（零往返时间）的早期数据
            // 0-RTT 允许在完全建立连接之前发送数据，提高了效率
            const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
            if (error) {
                controller.error(error);
            } else if (earlyData) {
                controller.enqueue(earlyData);
            }
        },
        // 当使用者从流中拉取数据时调用
        pull(controller) {
            // 这里可以实现反压机制
            // 如果 WebSocket 可以在流满时停止读取，我们就可以实现反压
            // 参考：https://streams.spec.whatwg.org/#example-rs-push-backpressure
        },
        cancel(reason) {
            // 流被取消的几种情况：
            // 1. 当管道的 WritableStream 有错误时，这个取消函数会被调用，所以在这里处理 WebSocket 服务器的关闭
            // 2. 如果 ReadableStream 被取消，所有 controller.close/enqueue 都需要跳过
            // 3. 但是经过测试，即使 ReadableStream 被取消，controller.error 仍然有效
            if (!readableStreamCancel) {
                readableStreamCancel = true;
                log(`ReadableStream was canceled, due to ${reason}`);
                safeCloseWebSocket(webSocketServer);
            }
        }
    });
}

function processVlessHeader(vlessBuffer, uuid2) {
    if (vlessBuffer.byteLength < 24) {
        return {
            hasError: true,
            message: 'invalid data',
        };
    }

    const version = new Uint8Array(vlessBuffer.slice(0, 1));
    const uuidBytes = new Uint8Array(vlessBuffer.slice(1, 17));
    const hexArray = Array.from(uuidBytes, byte => byte.toString(16).padStart(2, '0'));
    const uuid = [
        hexArray.slice(0, 4).join(''),
        hexArray.slice(4, 6).join(''),
        hexArray.slice(6, 8).join(''),
        hexArray.slice(8, 10).join(''),
        hexArray.slice(10).join('')
    ].join('-');

    if (uuid !== uuid2) {
        return {
            hasError: true,
            message: 'invalid user',
        };
    }

    const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
    // 暂时跳过附加选项
    const command = new Uint8Array(vlessBuffer.slice(18 + optLength, 18 + optLength + 1))[0];

    if (command !== 1 && command !== 2) {
        return {
            hasError: true,
            message: `command ${command} is not support, command 01-tcp,02-udp,03-mux`,
        };
    }

    let isUDP = command === 2;
    const portIndex = 18 + optLength + 1;
    // 解析远程端口（大端序，2 字节）
    const portBuffer = vlessBuffer.slice(portIndex, portIndex + 2);
    const portRemote = new DataView(portBuffer).getUint16(0);

    let addressIndex = portIndex + 2;
    const addressBuffer = new Uint8Array(vlessBuffer.slice(addressIndex, addressIndex + 1));
    const addressType = addressBuffer[0];

    let addressLength = 0;
    let addressValueIndex = addressIndex + 1;
    let addressValue = '';

    // 1--> IPv4 (4字节)
    // 2--> 域名 (可变长)
    // 3--> IPv6 (16字节)
    switch (addressType) {
        case 1:
            addressLength = 4;
            addressValue = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join('.');
            break;
        case 2:
            addressLength = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
            addressValueIndex += 1;
            addressValue = new TextDecoder().decode(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
            break;
        case 3:
            addressLength = 16;
            const dataView = new DataView(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
            // 2001:0db8:85a3:0000:0000:8a2e:0370:7334
            const ipv6 = [];
            for (let i = 0; i < 8; i++) {
                ipv6.push(dataView.getUint16(i * 2).toString(16));
            }
            addressValue = ipv6.join(':');
            break;
        default:
            return {
                hasError: true,
                message: `invalid addressType is ${addressType}`,
            };
    }

    return !addressValue ? {
        hasError: true,
        message: `addressValue is empty, addressType is ${addressType}`,
    } : {
        hasError: false,
        addressRemote: addressValue,
        addressType,
        portRemote,
        rawDataIndex: addressValueIndex + addressLength,
        vlessVersion: version,
        isUDP,
    };
}

async function remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader, retry, log) {
    let vlessHeader = vlessResponseHeader;
    let hasIncomingData = false;

    await remoteSocket.readable.pipeTo(
        new WritableStream({
            start() { },
            async write(chunk, controller) {
                hasIncomingData = true;
                if (webSocket.readyState !== WS_READY_STATE_OPEN) {
                    controller.error('webSocket.readyState is not open, maybe close');
                }
                let mergedChunk = chunk;
                if (vlessHeader) {
                    mergedChunk = await new Blob([vlessHeader, chunk]).arrayBuffer();
                    vlessHeader = null;
                }
                webSocket.send(mergedChunk);
            },
            close() {
                log(`remoteConnection!.readable is close with hasIncomingData is ${hasIncomingData}`);
                // 不需要主动关闭 WebSocket，因为这可能导致 HTTP ERR_CONTENT_LENGTH_MISMATCH 问题
                // 客户端无论如何都会发送关闭事件
                // safeCloseWebSocket(webSocket);
            },
            abort(reason) {
                console.error(`remoteConnection!.readable abort`, reason);
            },
        })
    ).catch((error) => {
        console.error(`remoteSocketToWS has exception `, error.stack || error);
        safeCloseWebSocket(webSocket);
    });

    // 处理 Cloudflare 连接 Socket 的特殊错误情况
    // 1.Socket.closed 会出错
    // 2.Socket.readable 将在没有任何数据的情况下关闭
    if (hasIncomingData === false && retry) {
        log(`retry`);
        retry();
    }
}

function base64ToArrayBuffer(base64Str) {
    if (!base64Str) {
        return { error: null };
    }
    try {
        // Go 语言使用了 URL 安全的 Base64 变体（RFC 4648）
        // 这种变体使用 '-' 和 '_' 来代替标准 Base64 中的 '+' 和 '/'
        // JavaScript 的 atob 函数不直接支持这种变体，所以我们需要先转换
        base64Str = base64Str.replace(/-/g, '+').replace(/_/g, '/');

        // 使用 atob 函数解码 Base64 字符串
        // atob 将 Base64 编码的 ASCII 字符串转换为原始的二进制字符串
        const decode = atob(base64Str);

        // 将二进制字符串转换为 Uint8Array
        // 这是通过遍历字符串中的每个字符并获取其 Unicode 编码值（0-255）来完成的
        const buffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));

        // 返回 Uint8Array 的底层 ArrayBuffer
        // 这是实际的二进制数据，可以用于网络传输或其他二进制操作
        return { earlyData: buffer.buffer, error: null };
    } catch (error) {
        // 如果在任何步骤中出现错误（如非法 Base64 字符），则返回错误
        return { error };
    }
}

async function handleDNSQuery(udpChunk, webSocket, vlessResponseHeader, log) {
    // 无论客户端发送哪个 DNS 服务器，我们总是使用硬编码的 DNS 服务器
    // 因为有些 DNS 服务器不支持 DNS over TCP
    try {
        let vlessHeader = vlessResponseHeader;
        // 选用 Google 的 DNS 服务器（注：在 Cloudflare 修复连接自身 IP 的 bug 后， 改为 Cloudflare 的 1.1.1.1）
        const dnsServer = '8.8.4.4';
        // DNS 服务的标准端口
        const dnsPort = 53;
        const tcpSocket = connect({
            hostname: dnsServer,
            port: dnsPort,
        });

        log(`connected to ${dnsServer}:${dnsPort}`);
        const writer = tcpSocket.writable.getWriter();
        // 将客户端的 DNS 查询数据发送给 DNS 服务器
        await writer.write(udpChunk);
        // 释放写入器，允许其他部分使用
        writer.releaseLock();

        // 将从 DNS 服务器接收到的响应数据通过 WebSocket 发送回客户端
        await tcpSocket.readable.pipeTo(new WritableStream({
            async write(chunk) {
                if (webSocket.readyState === WS_READY_STATE_OPEN) {
                    let mergedChunk = chunk;
                    if (vlessHeader) {
                        mergedChunk = await new Blob([vlessHeader, chunk]).arrayBuffer();
                        // 头部只发送一次，之后置为 null
                        vlessHeader = null;
                    }
                    webSocket.send(chunk);
                }
            },
            close() {
                log(`dns server(${dnsServer}) tcp is close`);
            },
            abort(reason) {
                console.error(`dns server(${dnsServer}) tcp is abort`, reason);
            },
        }));
    } catch (error) {
        console.error(`handleDNSQuery have exception, error: ${error.message}`);
    }
}

export default {
    async fetch(request, env, ctx) {
        try {
            userID = env.UUID || userID;
            const upgradeHeader = request.headers.get('Upgrade');
            if (upgradeHeader === 'websocket') {
                return await vlessOverWSHandler(request);
            }

            const url = new URL(request.url);
            switch (url.pathname) {
                case '/':
                    return new Response(JSON.stringify(request.cf), { status: 200 });
                default:
                    return new Response('Not found', { status: 404 });
            }
        } catch (err) {
            return new Response(e.toString());
        }
    }
};