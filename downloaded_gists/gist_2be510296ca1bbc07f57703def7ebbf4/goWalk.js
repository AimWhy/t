function FiberNode(instance) {
    this.instance = instance;
    this.parent = null;
    this.sibling = null;
    this.child = null;
    this.context = {};
}

FiberNode.prototype.getName = function () {
    return this.instance.name;
};

FiberNode.prototype.getChildren = function () {
    return this.instance.body;
};

function connect(parent, childList) {
    parent.child = childList.reduceRight((prev, current) => {
        const fiberNode = new FiberNode(current);
        fiberNode.parent = parent;
        fiberNode.sibling = prev;
        return fiberNode;
    }, null);

    return parent.child;
}

function walk(node) {
    console.log(node.getName());
    const childList = node.getChildren();
    let child = null;

    if (childList.length > 0) {
        child = connect(node, childList);
    }
    return child;
}

function goWalk(root, run) {
    let currentNode = root;

    while (true) {
        // 构建下一层级
        const child = walk(currentNode);
        
        // 如果有子节点
        if (child) {
            currentNode = child;
            continue;
        }

        // 如果没有相邻节点, 则返回到父节点
        while (!currentNode.sibling) {
            currentNode = currentNode.parent;
            if (currentNode === root) {
                return;
            }
        }

        // 相邻节点
        currentNode = currentNode.sibling;
    }
}

// 调用
goWalk(new FiberNode(a1), (pNode, node, type) => console.log(pNode, node))
