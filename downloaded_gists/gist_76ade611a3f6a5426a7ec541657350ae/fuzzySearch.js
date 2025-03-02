// 模糊搜索 needle：检索词， haystack：目标值
function fuzzySearch (needle, haystack, ignoreCase) {
  var hlen = haystack.length
  var nlen = needle.length
  if (nlen > hlen) {
    return false
  }
  if (nlen === 0) {
    return true
  }
  if (ignoreCase) {
    haystack = haystack.toLocaleLowerCase()
    needle = needle.toLocaleLowerCase()
  }
  if (nlen === hlen) {
    return needle === haystack
  }

  var i = 0
  var j = 0
  while (j < hlen && i < nlen) {
    if (haystack[j] === needle[i]) {
      i++
    }
    j++
  }
  return i === nlen
}