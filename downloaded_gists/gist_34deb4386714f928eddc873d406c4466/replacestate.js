let _wr =  function (type) {  
  let orig = window.history[type]
  return  function () {
    let rv = orig.apply(this, arguments)
    let e = new Event(type.toLowerCase())
    e.arguments = arguments
    window.dispatchEvent(e)
    return rv
  }
}
window.history.pushState = _wr('pushState')  
window.history.replaceState = _wr('replaceState')
window.addEventListener('pushstate',  function (event) {})  
window.addEventListener('replacestate',  function (event) {})