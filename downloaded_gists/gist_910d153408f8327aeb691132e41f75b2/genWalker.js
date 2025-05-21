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


function genWalker(root, { firstChild, nextSibling, isLeaf = _ => false } = {}) {
    const queue = [root];
    let current = firstChild(root);

    function gen(skip) {
        let result;
        while (queue.length > 0) {
            if (!current || skip || isLeaf(current)) {
                current = (!current || skip) ? queue.pop() : current;
                result = current;
                current = nextSibling(current);
            } else {
                queue.push(current);
                current = firstChild(current);
            }

            if (result) {
                return ({ done: false, value: result });
            }
        }

        return ({ done: true, value: void 0 });
    }

    return {
        next: (skip) => gen(skip).value,
        [Symbol.iterator]: () => ({ next: gen }),
    }
}
[...genWalker(document.body, { firstChild: n => n.firstElementChild, nextSibling: n => n.nextElementSibling })];
[...genWalker(document.body, { firstChild: n => n.firstElementChild, nextSibling: n => n.nextElementSibling, order: 'postOrder' })]


function genFiberTree2(returnFiber) {
    beginWork(returnFiber);
    const queue = [returnFiber];
    let current = returnFiber.child;

    function next() {
        if (queue.length > 0) {
            if (!current) {
                current = queue.pop();
                yield current;
                current = current.sibling;
            } else if (current.__skipSelf) {
                current = current.sibling;
            } else if (current.isHostText || !current.needRender) {
                yield current;
                current = current.sibling;
            } else {
                beginWork(current);
                queue.push(current);
                current = current.child;
            }
        }
    }


    return {
        next,
    }
}