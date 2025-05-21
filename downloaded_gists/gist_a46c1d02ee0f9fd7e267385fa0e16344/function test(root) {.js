function walk(root, action = () => console.count()) {
    const queue = [];
    let current = root;

    while (current) {
        const isBreakChild = action(current);

        if (!isBreakChild && current.firstElementChild) {
            queue.push(current.firstElementChild);
        }

        if (root === current || !current.nextElementSibling) {
            current = queue.shift();
        } else {
            current = current.nextElementSibling;
        }
    }
}

function walk2(root, action = (v) => console.count(), isLeaf = v => v && !v.firstElementChild) {
    const stack = [root]; // [placeholder] or [root]
    let cursor = root.firstElementChild;
    let isSkipFirst = true;
    let isBreakChild = false;

    while (stack.length > 0) {
        const isLeafNode = isLeaf(cursor);
        if (isLeafNode || !cursor || isBreakChild) {
            const current = isLeafNode ? cursor : stack.pop();
            if (isSkipFirst && !stack.length) {
                break;
            }
            isBreakChild = action(current);
            cursor = current.nextElementSibling;
        } else {
            stack.push(cursor);
            cursor = cursor.firstElementChild;
        }
    }
}