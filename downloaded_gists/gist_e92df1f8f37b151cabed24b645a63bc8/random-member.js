let memberPool = [
  '王洪莹',
  '龚道林',
  '冯白杨',
  '孙艳芳',
  '祝宇欣',
  '杜宽',
  '李伟民',
  '穆英杰',
]
let sessionToMembers = {}

export function getMembers (count = 1, sessionId = 0, reset = false) {
  if (
    !sessionToMembers[sessionId] ||
    !sessionToMembers[sessionId].length ||
    reset
  ) {
    sessionToMembers[sessionId] = memberPool.slice(0)
  }

  let members = sessionToMembers[sessionId]
  let memberLen = members.length
  let result = []

  if (count >= memberLen) {
    result = members.slice(0)
    members.length = 0
    return count === memberLen
      ? result
      : result.concat(getMembers(count - result.length, sessionId))
  }

  for (let i = 0; i < count; i++) {
    let j = Math.floor(Math.random() * members.length)
    result.push(members.splice(j, 1)[0])
  }

  return result
}
