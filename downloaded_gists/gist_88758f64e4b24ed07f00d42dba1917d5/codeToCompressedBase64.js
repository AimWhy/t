 async function codeToCompressedBase64(code) {
    // Get the string as UTF8 bytes.
    const myencoder = new TextEncoder();
    const byteBuff = myencoder.encode(code);
    // Compress the stream of bytes
    const compressor = new CompressionStream("gzip");
    const writer = compressor.writable.getWriter();
    writer.write(byteBuff);
    writer.close();
    // Read the compressed stream and turn into a byte string
    const compressedBuff = await new Response(compressor.readable).arrayBuffer();
    const compressedBytes = new Uint8Array(compressedBuff);
    // Turn the bytes into a string of bytes (needed for window.btoa to work)
    let binStr = "";
    for (const byte of compressedBytes) {
        binStr += String.fromCharCode(byte);
    }
    // Get the base64 representation for the string of bytes
    const base64String = window.btoa(binStr);
    return base64String;
}
 async function compressedBase64ToCode(base64) {
    // Turn the base64 string into a string of bytes
    const binStr = window.atob(base64);
    // Turn it into a byte array
    const byteArray = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; ++i)
        byteArray[i] = binStr.charCodeAt(i);
    // Decompress the bytes
    const decompressor = new DecompressionStream("gzip");
    const writer = decompressor.writable.getWriter();
    writer.write(byteArray);
    writer.close();
    // Read the decompressed stream and turn into a byte string
    const decompressedBuff = await new Response(decompressor.readable).arrayBuffer();
    // Decode the utf-8 bytes into a JavaScript string
    const decoder = new TextDecoder();
    const code = decoder.decode(decompressedBuff);
    return code;
}