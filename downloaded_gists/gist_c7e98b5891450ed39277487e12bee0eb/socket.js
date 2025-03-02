function noop () {}

export default function (url, {
  protocols = [],
  timeout = 1000,
  maxAttempts = Infinity,
  onOpen = noop,
  onClose = noop,
  onError = noop,
  onMessage = noop,
  onReconnect = noop,
  onMaximum = noop,
}) {
  var ws
  var num = 0
  var $ = {}

  $.open = function () {
    ws = new WebSocket(url, protocols)

    ws.onmessage = onMessage

    ws.onopen = function (e) {
      onOpen(e)
      num = 0
    }

    ws.onclose = function (e) {
      e.code !== 1e3 && e.code !== 1005 && $.reconnect(e)
      onClose(e)
    }

    ws.onerror = function (e) {
      (e && e.code === 'ECONNREFUSED') ? $.reconnect(e) : onError(e)
    }
  }

  $.reconnect = function (e) {
    (num++ < maxAttempts) ? setTimeout(function () {
      onReconnect(e)
      $.open()
    }, timeout) : onMaximum(e)
  }

  $.json = function (x) {
    ws.send(JSON.stringify(x))
  }

  $.send = function (x) {
    ws.send(x)
  }

  $.close = function (x, y) {
    ws.close(x || 1005, y)
  }

  $.open()

  return $
}
