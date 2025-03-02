const cache = new Map();

const fetchBlob = async (url, resolve) => {
  const response = await fetch(url);
  const body = await response.blob();
  resolve(body);
}

const download = (url) => {
  if (cache.has(url)) return cache.get(url);
  const {promise, resolve} = Promise.withResolvers();
  cache.set(url, promise);
  fetchBlob(url, resolve);
  return promise;
}

const url = 'https://turtle.deno.dev/bin';
const p1 = download(url);
const p2 = download(url);

console.log(await p1 === await p2);