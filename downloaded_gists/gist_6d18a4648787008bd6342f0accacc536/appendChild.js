function appendChild(parent, fiber) {
    let node = fiber.child;

    while (node !== null) {
        if (node.tag === 'HostComponent') {
            parent.appendChild(node.stateNode)
        } else if (node.child !== null) {
            node = node.child
            continue;
        }

        if (node.return === null || node.return === fiber) {
            return;
        }

        while (node.sibling === null) {
            if (node.return === null || node.return === fiber) {
                return;
            } else {
                node = node.return
            }
        }

        node = node.sibling
    }
}