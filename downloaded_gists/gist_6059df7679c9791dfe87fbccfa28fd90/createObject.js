// A copy of `Window.setTimeout` from js.
// delay is in milliseconds.
function setTimeout (parent, delay, cb) {
  var timer = new (function (parent) {
    return Qt.createQmlObject('import QtQml 2.2; Timer { }', parent)
  })(parent)

  timer.interval = delay
  timer.repeat = false
  timer.triggered.connect(cb)
  timer.start()

  return timer
}

// Destroy timeout.
function clearTimeout (timer) {
  timer.stop() // NECESSARY.
  timer.destroy()
}

// -----------------------------------------------------------------------------

function createObject (source, parent, options) {
  if (options && options.isString) {
    var object = Qt.createQmlObject(source, parent)

    var properties = options && options.properties
    if (properties) {
      for (var key in properties) {
        object[key] = properties[key]
      }
    }

    return object
  }

  var component = Qt.createComponent(source)
  if (component.status !== QtQuick.Component.Ready) {
    console.debug('Component not ready.')
    if (component.status === QtQuick.Component.Error) {
      console.debug('Error: ' + component.errorString())
    }
    return // Error.
  }

  var object = component.createObject(parent, (options && options.properties) || {})
  if (!object) {
    console.debug('Error: unable to create dynamic object.')
  }

  return object
}