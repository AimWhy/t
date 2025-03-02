const waitTA = new Int32Array(new SharedArrayBuffer(4));

function sleep(duration) {
  const response = Atomics.wait(waitTA, 0, 0, duration * 1000);
  if (response !== 'timed-out') {
    throw new Exception(`unexpected response from Atomics.wait: ${response}`);
  }
}