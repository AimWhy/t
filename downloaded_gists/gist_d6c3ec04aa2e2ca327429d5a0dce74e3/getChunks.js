export const MB = 1024 ** 2;
// 文件分块
export function getChunks(file, blockSize) {
    let chunkByteSize = blockSize * MB; // 转换为字节
    // 如果 chunkByteSize 比文件大，则直接取文件的大小
    if (chunkByteSize > file.size) {
        chunkByteSize = file.size;
    }
    else {
        // 因为最多 10000 chunk，所以如果 chunkSize 不符合则把每片 chunk 大小扩大两倍
        while (file.size > chunkByteSize * 10000) {
            chunkByteSize *= 2;
        }
    }
    const chunks = [];
    const count = Math.ceil(file.size / chunkByteSize);
    for (let i = 0; i < count; i++) {
        const chunk = file.slice(chunkByteSize * i, i === count - 1 ? file.size : chunkByteSize * (i + 1));
        chunks.push(chunk);
    }
    return chunks;
}

export function readAsArrayBuffer(data) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        // evt 类型目前存在问题 https://github.com/Microsoft/TypeScript/issues/4163
        reader.onload = (evt) => {
            if (evt.target) {
                const body = evt.target.result;
                resolve(body);
            }
            else {
                reject(new Error('progress event target is undefined'));
            }
        };
        reader.onerror = () => {
            reject(new Error('fileReader read failed'));
        };
        reader.readAsArrayBuffer(data);
    });
}
