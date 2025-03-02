  function concurrencyManager(axios, limit) {
    if (limit === void 0) {
      limit = 10
    }
    if (limit < 1) {
      throw new Error(
        "ConcurrencyManager Error: minimun concurrent requests is 1"
      )
    }
    var instance = {
      limit: limit,
      queue: [],
      running: [],
      interceptors: {
        request: null,
        response: null,
      },
      push: function(reqHandler) {
        instance.queue.push(reqHandler)
        instance.shiftInitial()
      },
      shiftInitial: function() {
        setTimeout(function() {
          if (instance.running.length < instance.limit) {
            instance.shift()
          }
        }, 0)
      },
      shift: function() {
        if (instance.queue.length) {
          var queued = instance.queue.shift()
          queued.resolver(queued.request)
          instance.running.push(queued)
        }
      },
      requestHandler: function(req) {
        return new Promise(function(resolve) {
          instance.push({ request: req, resolver: resolve })
        })
      },
      responseHandler: function(res) {
        instance.running.shift()
        instance.shift()
        return res
      },
      detach: function() {
        axios.interceptors.request.eject(instance.interceptors.request)
        axios.interceptors.response.eject(instance.interceptors.response)
      },
      attach: function(limitConcurrentRequestsTo) {
        if (limitConcurrentRequestsTo) {
          instance.limit = limitConcurrentRequestsTo
        }
        instance.interceptors.request = axios.interceptors.request.use(
          instance.requestHandler
        )
        instance.interceptors.response = axios.interceptors.response.use(
          instance.responseHandler,
          instance.responseHandler
        )
      },
    }
    return instance
  }