"use strict";
async function* streamBody(response) {
    if (response.body[Symbol.asyncIterator]) {
        for await (const chunk of response.body) {
            yield chunk;
        }
    } else {
        const reader = response.body.getReader();
        let result;
        try {
            while (!(result = await reader.read()).done) {
                yield result.value;
            }
        } finally {
            reader.cancel();
        }
    }
}

async function* streamToBoundedChunks(chunks, boundary) {
    const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
    let buffer = '';
    let boundaryIndex;

    for await (const chunk of chunks) {
        // NOTE: We're avoiding referencing the `Buffer` global here to prevent auto-polyfilling in Webpack
        buffer +=
            chunk.constructor.name === 'Buffer'
                ? chunk.toString()
                : decoder.decode(chunk, { stream: true });

        while ((boundaryIndex = buffer.indexOf(boundary)) > -1) {
            yield buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + boundary.length);
        }
    }
    // if (buffer) {
    //     yield buffer;
    // }
}

const eventStreamRe = /data: ?([^\n]+)/;
async function* parseEventStream(response) {
    let payload;
    for await (const chunk of streamToBoundedChunks(streamBody(response), '\n\n')) {
        const match = chunk.match(eventStreamRe);
        if (match) {
            const chunk = match[1];
            try {
                yield (payload = JSON.parse(chunk));
            } catch (error) {
                if (!payload) {
                    throw error;
                }
            }
            if (payload && payload.hasNext === false) {
                break;
            }
        }
    }

    if (payload && payload.hasNext !== false) {
        yield { hasNext: false };
    }
}
