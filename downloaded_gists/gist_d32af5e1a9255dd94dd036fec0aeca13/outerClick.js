(function (ELEMENT) {
  ELEMENT.matches = ELEMENT.matches || ELEMENT.mozMatchesSelector || ELEMENT.msMatchesSelector || ELEMENT.oMatchesSelector || ELEMENT.webkitMatchesSelector
  ELEMENT.closest = ELEMENT.closest || function closest (selector) {
    if (!this) return null
    if (this.matches(selector)) return this
    return !this.parentElement ? null : this.parentElement.closest(selector)
  }
  ELEMENT.contains = ELEMENT.contains || function contains (elem) {
    var comparison = this.compareDocumentPosition(elem)
    return comparison === 0 || comparison & 16
  }
})(Element.prototype)

var selectorMap = {}
var elementMap = []

document.body.addEventListener('click', function (event) {
  var isHit = false
  for (var selector in selectorMap) {
    if (!event.target.closest(selector)) {
      selectorMap[selector](event)
      isHit = true
    }
  }
  for (var i = 0; i < elementMap.length; i++) {
    if (!elementMap[i].el.contains(event.target)) {
      elementMap[i].fn(event)
      isHit = true
    }
  }
  if (isHit) {
    event.stopImmediatePropagation()
  }
}, true)

function outerClick (selector, fn, context) {
  if (Object.prototype.toString.call(selector) === '[object String]') {
    selectorMap[selector] = fn.bind(context) // 塞入队列
    return function () { // 解绑
      delete selectorMap[selector]
    }
  } else {
    elementMap.push({ el: selector, fn: fn.bind(context) }) // 塞入队列
    return function () { // 解绑
      elementMap = elementMap.filter(function (item) {
        return item.el !== selector
      })
    }
  }
}