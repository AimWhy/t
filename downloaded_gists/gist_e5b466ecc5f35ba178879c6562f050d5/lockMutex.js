const lockPromises = new Map();

function lockMutex(k, suff = "global") {
  const key = k + ';' + suff;
  let unlockNext;
  
  const willLock = new Promise(resolve => { unlockNext = resolve; });
  
  const lockPromise = lockPromises.get(key) || Promise.resolve();
  
  const willUnlock = lockPromise.then(() => unlockNext);
  
  lockPromises.set(key, lockPromise.then(() => willLock));
  
  return willUnlock;
};

/**************************/
let i = 1
function fetch2(p) {
    return new Promise((res, rej) => {
        setTimeout(res, 1000 + Math.random() * 3000, p);
    });
}

async function test(src) {
    let temp = src + i++;
    const unlockMutex = await lockMutex(src);
    try {
      let r = await fetch2(temp);
      console.log(r);
    } finally {
      unlockMutex();
    }
}

test('a');
test('a');
test('a');
test('a');
test('a');
