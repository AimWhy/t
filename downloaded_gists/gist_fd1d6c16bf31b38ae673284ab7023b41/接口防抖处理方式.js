function fakePromise () {
  let res, rej
  const p = new Promise((resolve, reject) => {
    res = resolve
    rej = reject
  })
  return { p, res, rej }
}

const t = {}
function promiseState (p) {
  return Promise.race([p, t]).then(
    v => (v === t ? 'pending' : 'fulfilled'),
    _ => 'rejected'
  )
}

let luckProm = ''

// 获取幸运数
function getLuck (p) {
  var timerId = window.setTimeout(_ => {
    var result = Math.random()
    result > 0.5 ? p.res(result) : p.rej(result)
  }, 2000)

  p.cancel = _ => {
    window.clearTimeout(timerId)
  }
}

function doOther () {
  // 做一些同步、异步、组件监听等功能， 在回调中执行 getLuck()
  getLuck()
}

// 处理防止抖动 和 由中转方式调用getLuck
function getLuckWrap (isCatchForDebounce) {
  return promiseState(luckProm.p).then(state => {
    if (state === 'pending') {
      // 如果上一次的回调还没执行
      !isCatchForDebounce ? luckProm.cancel() : luckProm.rej('abort')
    }
    luckProm = fakePromise() // 新建一个fakePromise

    // 这里可能不是直接调用，例子： doOther()
    getLuck(luckProm)
    return luckProm.p
  })
}

window.document.onclick = function () {
  // 对中间区域回调的防抖处理方式： 中断 或 catch
  let isCatchForDebounce = true

  getLuckWrap(isCatchForDebounce)
    .then(v => {
      console.log('幸运值:' + v)
    })
    .catch(e => {
      console.log(typeof e === 'number' ? '悲催值:' + e : e)
    })
}
