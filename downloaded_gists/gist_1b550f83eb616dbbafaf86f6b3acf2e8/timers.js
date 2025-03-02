let fastNowTimeout
let fastNow = Date.now()
const fastTimers = []

function onTimeout() {
  fastNow = Date.now()

  let len = fastTimers.length
  let idx = 0
  while (idx < len) {
    const timer = fastTimers[idx]

    if (timer.state === 0) {
      timer.state = fastNow + timer.delay
    } else if (timer.state > 0 && fastNow >= timer.state) {
      timer.state = -1
      timer.callback(timer.opaque)
    }

    if (timer.state === -1) {
      timer.state = -2
      if (idx !== len - 1) {
        fastTimers[idx] = fastTimers.pop()
      } else {
        fastTimers.pop()
      }
      len -= 1
    } else {
      idx += 1
    }
  }

  if (fastTimers.length > 0) {
    refreshTimeout()
  }
}

function refreshTimeout() {
  clearTimeout(fastNowTimeout)
  fastNowTimeout = setTimeout(onTimeout, 1e3)
}

class Timeout {
  constructor(callback, delay, opaque) {
    this.callback = callback
    this.delay = delay
    this.opaque = opaque

    // -2 表示不在计时器列表中
    // -1 表示在计时器列表中，但是处于非活跃状态
    // = 0 表示在计时器列表中，正在等待时间到达
    // > 0 表示在计时器列表中，正在等待时间到期
    this.state = -2
    this.refresh()
  }

  refresh() {
    if (this.state === -2) {
      fastTimers.push(this)
      if (!fastNowTimeout || fastTimers.length === 1) {
        refreshTimeout()
      }
    }
    this.state = 0
  }

  clear() {
    this.state = -1
  }
}

module.exports = {
  setTimeout(callback, delay, opaque) {
    return delay < 1e3
      ? setTimeout(callback, delay, opaque)
      : new Timeout(callback, delay, opaque)
  },
  clearTimeout(timeout) {
    if (timeout instanceof Timeout) {
      timeout.clear()
    } else {
      clearTimeout(timeout)
    }
  }
}