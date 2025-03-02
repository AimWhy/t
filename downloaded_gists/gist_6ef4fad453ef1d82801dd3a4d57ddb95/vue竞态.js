async function getInstance () {
  this.$wait.start('getInstance')

  // 方法开始执行前修改下本方法的 stamp 的值，即：this.getInstance.stamp
  this.getInstance.stamp = Date.now()
  console.log('开始执行：' + this.getInstance.stamp)

  // 模拟接口请求
  // eslint-disable-next-line
  let response = await new Promise((res, rej) => {
    window.setTimeout(res, Math.random() * 10000, { stamp: this.getInstance.stamp, data: Math.random() })
  })

  // 入参的 stamp 与 getInstance.stamp 不相同则不是最后一次调用的回调
  // 真实接口时可以将 stamp 放入request的config中, 通过 response.config.stamp 获取请求时的入参
  // 一个方法内多个异步请求 写起来更清晰
  if (response.stamp !== this.getInstance.stamp) {
    return
  }

  // eslint-disable-next-line
  let response2 = await new Promise((res, rej) => {
    window.setTimeout(res, Math.random() * 10000, { stamp: this.getInstance.stamp, data: Math.random() })
  })

  if (response2.stamp !== this.getInstance.stamp) {
    return
  }

  console.log(`只有最后一次调用(${this.getInstance.stamp})的结果能到达这里`, response.data, response2.data)

  this.$wait.end('getInstance')
}