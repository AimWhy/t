```js
// Before
async asyncData({ error }) {
  try {
    const categories = (await axios.get('forum')).sections;
    return { categories };
  } catch (err) {
    return error({ statusCode: err.statusCode });
  }
}

// After
async asyncData({ error }) {
  const [err, res] = await run(axios.get, ['forum']);
  if (err) return error({ statusCode: err.statusCode });
  return { categories: res.sections };
}
```

```js
// Before
let result = false;
try {
    result = mayThrowErrorSomeday()
} catch (error) {
    console.log('Error catched', error)
}
console.log('result', result);

// After
const [err, result] = run(mayThrowErrorSomeday);
if (err) console.log('Error catched', err)
console.log('result', result);
```

```js
let delay = (ms, value) => new Promise((res) => setTimeout(res, ms, value));

async function test(ms1, ms2) {
  let run2 = run.sequence();

  let [err, val] = await run2(delay, [ms1, 'first:' + ms1]);
  if (err && err.isRace) {
    return console.warn('已被抛弃处理1:' + ms1);
  }
  console.log(val);

  await delay(ms2);

  let [err2, val2] = await run2(delay, [ms2, 'second:' + ms2]);
  if (err2 && err2.isRace) {
    return console.warn('已被抛弃处理2:' + ms2);
  }
  console.log(val2);

  const ms3 = Math.random() * 4000;
  let [err3, val3] = await run2(delay, [ms3, 'third3:' + ms3]);
  if (err3 && err3.isRace) {
    return console.warn('已被抛弃处理3:' + ms3);
  }
  console.log(val3);
}

test(3000, 2000);
setTimeout(() => test(20, 400), 2800);
setTimeout(() => test(440, 1400), 3020); //竞态
```