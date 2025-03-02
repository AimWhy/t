function deepClone(obj) {
  return new Promise(resolve => {
    const { port1, port2 } = new MessageChannel();
    port2.onmessage = (msg) => resolve(msg.data);
    port1.postMessage(obj);
  });
}

function deepClone1(obj) {
  return structuredClone(obj);
}