// [...genWalker(node)] -> 后序遍历
// processNode(node) -> 前序遍历
function* genWalker(root, getFirstChild, getNextSibling, processNode = () => void 0, isLeaf = () => false) {
    processNode(root);
    const queue = [root];
    let current = getFirstChild(root);

    while (queue.length > 0) {
        if (!current || isLeaf(current)) {
            current = current || queue.pop();

            yield current;
            current = getNextSibling(current, queue[queue.length - 1]);
        } else {
            processNode(current);
            queue.push(current);
            current = getFirstChild(current);
        }
    }
}

// [...genWalker(document.body, n => n.firstChild, n => n.nextSibling)]