export function randomize(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function ulid() {
  let tmp;
  let str = '';
  let num = 16;
  let now = Date.now();
  let maxLen = BASE32.length;
  let arr = randomize(num);

  while (num--) {
    tmp = arr[num] / 255 * maxLen | 0;
    if (tmp === maxLen) {
      tmp = 31;
    }
    str = BASE32.charAt(tmp) + str;
  }

  for (num = 10; num--;) {
    tmp = now % maxLen;
    now = (now - tmp) / maxLen;
    str = BASE32.charAt(tmp) + str;
  }

  return str;
}