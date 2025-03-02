function createWorker (fun) {
  var blob = new Blob(['(' + fun.toString() + ')()'])
  var url = window.URL.createObjectURL(blob)
  return new Worker(url)
}

var clockWorker = createWorker(function () {
  var adjustTimer = 1000 - Date.now() % 1000
  setTimeout(function () {
    self.postMessage(Date.now())
    setInterval(function () {
      self.postMessage(Date.now())
    }, 1000)
  }, adjustTimer)
})

clockWorker.onmessage = function (event) {
  console.log(new Date(event.data).toLocaleString())
}