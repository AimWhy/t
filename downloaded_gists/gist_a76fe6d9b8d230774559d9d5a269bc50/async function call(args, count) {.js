async function call(args, count) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    result.push(args[i]());
    if (result.length > count) {
      await Promise.race(result);
    }
  }
  return Promise.all(result);
}

const delay = (ms, v) => new Promise((resolve) => {
  console.log(v);
  setTimeout(resolve, ms, v)
});

const args = [
  () => delay(1000, 1),
  () => delay(2500, 2),
  () => delay(2000, 3),
  () => delay(1900, 4),
  () => delay(1400, 5),
  () => delay(1200, 6),
  () => delay(1500, 7),
  () => delay(3700, 8),
  () => delay(3200, 9)
];

call(args, 3).then(console.log);