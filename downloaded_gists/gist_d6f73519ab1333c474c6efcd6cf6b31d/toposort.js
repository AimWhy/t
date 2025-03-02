function makeNodesHash(arr) {
  let res = new Map()
  for (let i = 0, len = arr.length; i < len; i++) {
    res.set(arr[i], i)
  }
  return res
}

function makeOutgoingEdges(arr) {
  let edges = new Map()
  for (let i = 0, len = arr.length; i < len; i++) {
    let edge = arr[i]

    if (!edges.has(edge[0])) {
      edges.set(edge[0], new Set())
    }

    if (!edges.has(edge[1])) {
      edges.set(edge[1], new Set())
    }

    edges.get(edge[0]).add(edge[1])
  }
  return edges
}

module.exports = function toposort(nodes, edges) {
  let cursor = nodes.length
  const sorted = new Array(cursor)
  let visited = {}
  let i = cursor
  // 好的数据结构使算法更快
  let outgoingEdges = makeOutgoingEdges(edges)
  let nodesHash = makeNodesHash(nodes)

  // 检查未知节点
  edges.forEach(function (edge) {
    if (!nodesHash.has(edge[0]) || !nodesHash.has(edge[1])) {
      throw new Error('Unknown node. There is an unknown node in the supplied edges.')
    }
  })

  while (i--) {
    if (!visited[i]) {
      visit(nodes[i], i, new Set())
    }
  }

  return sorted

  function visit(node, index, predecessors) {
    if (predecessors.has(node)) {
      let nodeRep
      try {
        nodeRep = ", node was:" + JSON.stringify(node)
      } catch (e) {
        nodeRep = ""
      }
      throw new Error('Cyclic dependency' + nodeRep)
    }

    if (!nodesHash.has(node)) {
      throw new Error('Found unknown node. Make sure to provided all involved nodes. Unknown node: ' + JSON.stringify(node))
    }

    if (visited[index]) {
      return;
    }
    visited[index] = true

    let outgoing = outgoingEdges.get(node) || new Set()
    outgoing = Array.from(outgoing)
    let j = outgoing.length;

    if (j) {
      predecessors.add(node)

      do {
        let child = outgoing[--j]
        visit(child, nodesHash.get(child), predecessors)
      } while (j)

      predecessors.delete(node)
    }

    sorted[--cursor] = node
  }
}