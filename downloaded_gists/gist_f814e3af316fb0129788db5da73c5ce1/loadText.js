// 这段代码琢磨了许久，通过使用了一些特殊的字节数组解析出来猜测，10这个位置要么应该是一个换行符
async function loadText (url) {
    const res = await fetch(url)
    // 传输了多少读多少
    const reader = await res.body.getReader()
    const decoder = new TextDecoder() // 文本解码器
    let flag = false
    let remainChunk = new Uint8Array(0)
    while(!flag) {
        const { value, done } = await reader.read()
        // console.log(done);  // 加载状态
        // console.log(value); // 字节数组
        flag = done
        if (flag) return
        const lastIndex = value.lastIndexOf(10) // 数值10位置进行切分
        
        const chunk = value.slice(0, lastIndex + 1)
        const readChunk = new Uint8Array(remainChunk.length + chunk.length)
        
        readChunk.set(remainChunk);
        readChunk.set(chunk, remainChunk.length)
        remainChunk = value.slice(lastIndex + 1)
        const text = decoder.decode(readChunk)
        console.log('======');
        console.log(text)
    }
}



//下一个

async function loadNovel() {
  const url = 'https://duyi-static.oss-cn-beijing.aliyuncs.com/files/novel.txt';
  const resp = await fetch(url);
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let remainChunk = new Uint8Array(0);
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    const lastIndex = value.lastIndexOf(10);
    const chunk = value.slice(0, lastIndex + 1);
    const readChunk = new Uint8Array(remainChunk.length + chunk.length);
    readChunk.set(remainChunk);
    readChunk.set(chunk, remainChunk.length);
    remainChunk = value.slice(lastIndex + 1);
    const text = decoder.decode(readChunk);
    console.log(text);
  }
  const text = decoder.decode(remainChunk);
  console.log(text);
}

loadNovel();
