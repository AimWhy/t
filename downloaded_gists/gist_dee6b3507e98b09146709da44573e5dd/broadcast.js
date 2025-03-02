function broadcast () {
  var map = new Map()

  function _set (type) {
    var _ = { eachTick: [], onceTick: [], resolves: [], $: null }
    map.set(type, _)
    return _
  }

  function _get (type) {
    return map.get(type) || _set(type)
  }

  function _cancel (a, fun) {
    var i = a.indexOf(fun)
    if (i > -1) {
      a.splice(i, 1)
    }
  }

  function drop (type, cb) {
    var _ = _get(type)
    if (arguments.length > 1) {
      _cancel(_.eachTick, cb)
      _cancel(_.onceTick, cb)
    } else {
      map.delete(type)
    }
  }

  function that (type, value) {
    if (arguments.length === 1) {
      return that.bind(null, type)
    }
    var _ = _get(type)
    _.$ = Promise.resolve(value)
    while (_.onceTick.length) {
      _.$.then(_.onceTick.shift())
    }
    while (_.resolves.length) {
      _.$.then(_.resolves.shift())
    }
    return Array.prototype.push.apply(_.onceTick, _.eachTick)
  }

  function when (type, fun) {
    var _ = _get(type)
    if (_.$ !== null) {
      _.$.then(that.bind(null, type))
    }
    if (arguments.length === 1) {
      return new Promise(function (resolve) { _.resolves.push(resolve) })
    }

    // 只触发一次: 曾经通知过 ? 自动触发 : 下次通知触发
    return (_.onceTick.indexOf(fun) < 0) ? _.onceTick.push(fun) : _.onceTick.length
  }

  function all (type, cb) {
    var _ = _get(type)
    if (_.eachTick.indexOf(cb) < 0) { // 通知就会触发
      _.eachTick.push(cb)
    }
    return when(type, cb) // 同时 onceTick
  }

  return { all, drop, new: broadcast, that, when }
}

module.exports = broadcast()