function _getStickyVal () {
  let el = document.createElement('a')
  let mStyle = el.style
  mStyle.cssText = 'position:sticky;position:-o-sticky;position:-webkit-sticky;position:-moz-sticky;position:-ms-sticky;'
  return mStyle.position
}

let _regex = /(auto|scroll)/
function _isScrollAble (node) {
  const computedStyle = window.getComputedStyle(node, null)
  let overflow = computedStyle.overflow + computedStyle.overflowY + computedStyle.overflowX
  return _regex.test(overflow)
}

export function scrollParent (node) {
  if (node instanceof HTMLElement || node instanceof SVGElement) {
    let result = node.parentNode
    while (result && result !== document) {
      if (_isScrollAble(result)) {
        return result
      }
      result = result.parentNode
    }
    return document.scrollingElement || document.documentElement
  }
}

const rAF =
  window.requestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame

let captureScrollQueue = []
window.addEventListener('scroll', function (e) {
  for (let i = 0; i < captureScrollQueue.length; i++) {
    captureScrollQueue[i](e)
  }
}, true)

function addCaptureScroll (f) {
  if (!captureScrollQueue.includes(f)) {
    captureScrollQueue.push(f)
  }
  return function remove () { removeCaptureScroll(f) }
}

function removeCaptureScroll (f) {
  captureScrollQueue = captureScrollQueue.filter(item => item !== f)
}

class Sticky {
  constructor (target, o = {}) {
    this.options = {
      needSticky: o.needSticky || true,
      top: o.top,
      right: o.right,
      bottom: o.bottom,
      left: o.left,
      freeSpaceFix: o.freeSpaceFix || { top: 0, left: 0, right: 0, bottom: 0 }, // parentBorder + ParentPadding + targetMargin
      useClasses: o.useClasses || false,
      isForcePolyfill: o.isForcePolyfill || false,
      polyfillClass: o.polyfillClass || 'js-polyfill-sticky',
      yStuckClass: o.yStuckClass || 'js-y-stuck',
      yStickyClass: o.yStickyClass || 'js-y-sticky',
      yStickyChangeClass: o.yStickyChangeClass || 'js-y-sticky--change',
      yStickyChangeNumber: o.yStickyChangeNumber || null,
      xStuckClass: o.xStuckClass || 'js-x-stuck',
      xStickyClass: o.xStickyClass || 'js-x-sticky',
      xStickyChangeClass: o.xStickyChangeClass || 'js-x-sticky--change',
      xStickyChangeNumber: o.xStickyChangeNumber || null,
    }
    this.stickyVal = o.isForcePolyfill ? '' : _getStickyVal()
    this.target = target
    this.parentEle = target.parentNode
    this.scrollEle = scrollParent(this.target)
    this.hasXChangeNumber = o.xStickyChangeNumber != null
    this.hasYChangeNumber = o.yStickyChangeNumber != null
    this.scrollCall = this.scrollCall.bind(this)
    this.setStyle = this.setStyle.bind(this)
    this.fixOptions()
    this.addListener()
  }

  update (updatedProps = {}) {
    Object.keys(updatedProps).forEach((updatedProp) => {
      this.options[updatedProp] = updatedProps[updatedProp]
    })
    this.fixOptions()
  }

  fixOptions (invalid = '') {
    if (!invalid && this.options.top == null && this.options.bottom == null && this.options.left == null && this.options.right == null) {
      this.options.top = 0
    }
    if (!invalid && (this.options.top != null || this.options.bottom != null) && !this.hasYChangeNumber) {
      this.options.yStickyChangeNumber = this.target.offsetHeight
    }
    if (!invalid && (this.options.left != null || this.options.right != null) && !this.hasXChangeNumber) {
      this.options.xStickyChangeNumber = this.target.offsetWidth
    }
    if (this.options.needSticky && this.stickyVal) {
      this.target.style.position = this.stickyVal + invalid
      if (this.options.top != null) {
        this.target.style.top = `${this.options.top}px` + invalid
      }
      if (this.options.bottom != null) {
        this.target.style.bottom = `${this.options.bottom}px` + invalid
      }
      if (this.options.left) {
        this.target.style.left = `${this.options.left}px` + invalid
      }
      if (this.options.right) {
        this.target.style.right = `${this.options.right}px` + invalid
      }
    }
    this.target.style.transform = `translate(0px, 0px)`
    this.cacheInfo = this.computeCache()
  }

  addListener () {
    if (this.options.useClasses || (this.options.needSticky && !this.stickyVal)) {
      addCaptureScroll(this.scrollCall)
    }
  }

  computeCache () {
    let sRect = this.scrollEle.getBoundingClientRect()
    let pRect = this.parentEle.getBoundingClientRect()
    let tRect = this.target.getBoundingClientRect()
    let freeLeft = 0
    let freeRight = 0
    let freeTop = 0
    let freeBottom = 0
    let scrollLeft = this.scrollEle.scrollLeft
    let scrollTop = this.scrollEle.scrollTop
    let offsetHeight = this.scrollEle.offsetHeight
    let offsetWidth = this.scrollEle.offsetWidth
    let scrollHeight = this.scrollEle.scrollHeight
    let scrollWidth = this.scrollEle.scrollWidth

    function getScrollRight (scrollLeft) {
      return scrollWidth - offsetWidth - scrollLeft
    }

    function getScrollBottom (scrollTop) {
      return scrollHeight - offsetHeight - scrollTop
    }

    if (this.options.top != null) {
      freeTop = pRect.bottom - this.options.freeSpaceFix.bottom - tRect.bottom
    }
    if (this.options.bottom != null) {
      freeBottom = tRect.top - pRect.top - this.options.freeSpaceFix.top
    }

    if (this.options.left != null) {
      freeLeft = pRect.right - this.options.freeSpaceFix.right - tRect.right
    }
    if (this.options.right != null) {
      freeRight = tRect.left - pRect.left - this.options.freeSpaceFix.left
    }

    return {
      isShow: (tRect.right - tRect.left) * (tRect.bottom - tRect.top),
      freeLeft,
      freeRight,
      freeTop,
      freeBottom,
      getScrollRight,
      getScrollBottom,
      distanceLeft: scrollLeft + tRect.left - (sRect.left + this.options.left),
      distanceTop: scrollTop + tRect.top - (sRect.top + this.options.top),
      distanceRight: getScrollRight(scrollLeft) + (sRect.right - this.options.right) - tRect.right,
      distanceBottom: getScrollBottom(scrollTop) + (sRect.bottom - this.options.bottom) - tRect.bottom,
    }
  }

  setStyle () {
    let { stickyVal, target, scrollEle, cacheInfo } = this
    let {
      top,
      bottom,
      left,
      right,
      needSticky,
      polyfillClass,
      yStuckClass,
      yStickyClass,
      yStickyChangeClass,
      yStickyChangeNumber,
      xStuckClass,
      xStickyClass,
      xStickyChangeClass,
      xStickyChangeNumber
    } = this.options
    let newY = 0
    let newX = 0
    let addClassArr = target.className.split(/\s+/).filter(function (item) {
      return item && item !== yStickyClass && item !== yStuckClass && item !== yStickyChangeClass &&
        item !== xStickyClass && item !== xStuckClass && item !== xStickyChangeClass && item !== polyfillClass
    })

    if (top != null) {
      newY = scrollEle.scrollTop - cacheInfo.distanceTop
      if (newY < 0) {
        newY = 0
      } else if (newY > cacheInfo.freeTop) {
        addClassArr.push(yStuckClass)
        newY = cacheInfo.freeTop
      } else {
        addClassArr.push(yStickyClass)
        if (newY >= yStickyChangeNumber) {
          addClassArr.push(yStickyChangeClass)
        }
      }
    }

    if (bottom != null) {
      newY = cacheInfo.getScrollBottom(scrollEle.scrollTop) - cacheInfo.distanceBottom
      if (newY < 0) {
        newY = 0
      } else if (newY > cacheInfo.freeBottom) {
        addClassArr.push(yStuckClass)
        newY = cacheInfo.freeBottom
      } else {
        addClassArr.push(yStickyClass)
        if (newY >= yStickyChangeNumber) {
          addClassArr.push(yStickyChangeClass)
        }
      }
      newY = -newY
    }

    if (left != null) {
      newX = scrollEle.scrollLeft - cacheInfo.distanceLeft
      if (newX < 0) {
        newX = 0
      } else if (newX > cacheInfo.freeLeft) {
        addClassArr.push(xStuckClass)
        newX = cacheInfo.freeLeft
      } else {
        addClassArr.push(xStickyClass)
        if (newX >= xStickyChangeNumber) {
          addClassArr.push(xStickyChangeClass)
        }
      }
    }

    if (right != null) {
      newX = cacheInfo.getScrollRight(scrollEle.scrollLeft) - cacheInfo.distanceRight
      if (newX < 0) {
        newX = 0
      } else if (newX < cacheInfo.freeRight) {
        addClassArr.push(xStuckClass)
        newX = cacheInfo.freeRight
      } else {
        addClassArr.push(xStickyClass)
        if (newX >= xStickyChangeNumber) {
          addClassArr.push(xStickyChangeClass)
        }
      }
      newX = -newX
    }

    if (!stickyVal) {
      addClassArr.push(polyfillClass)
      if (needSticky) {
        target.style.transform = `translate(${newX}px, ${newY}px)`
      }
    }
    target.className = addClassArr.join(' ')
  }

  scrollCall (event) {
    if ((this.scrollEle === event.target || (event.target === document && this.scrollEle === document.documentElement)) && this.cacheInfo.isShow) {
      rAF(this.setStyle)
    }
  }

  cleanup () {
    this.fixOptions('invalid')
    removeCaptureScroll(this.scrollCall)
  }
}

export default function sticky (target, o) {
  return new Sticky(target, o)
}
