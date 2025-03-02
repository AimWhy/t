export const defaultChildNodes = function defaultChildNodes(node) {
	return node.childNodes;
};

export function* treeMap(node, mapfn, getChildNodes) {
	for (const child of depthFirst(node, getChildNodes)) {
		yield* mapfn(child);
	}
}

export function* depthFirst(node, getChildNodes = defaultChildNodes) {
	yield node;

	const childNodes = getChildNodes(node);

	if (childNodes === void 0) {
		return;
	}

	for (const child of childNodes) {
		yield* depthFirst(child, getChildNodes);
	}
}

function* reversedView(arr, initialIndex = arr.length - 1) {
	for (let index = initialIndex; index >= 0; index--) {
		yield arr[index];
	}
}

export function* depthFirstReversed(node, getChildNodes = defaultChildNodes) {
	const childNodes = getChildNodes(node);
	if (childNodes !== void 0) {
		for (const child of reversedView(childNodes)) {
			yield* depthFirstReversed(child, getChildNodes);
		}
	}
	yield node;
}

export function* previousSiblings(node) {
	const parent = node.parentNode;

	if (parent === void 0) {
		return;
	}

	const siblings = parent.childNodes;
	if (siblings === void 0) {
		throw new Error(`Inconsistent parse5 tree: parent does not have children`);
	}

	const index = siblings.indexOf(node);
	if (index === -1) {
		throw new Error(
			`Inconsistent parse5 tree: parent does not know about child`
		);
	}

	yield* reversedView(siblings, index - 1);
}

export function* ancestors(node) {
	let currNode = node;
	while (currNode !== void 0) {
		yield currNode;
		currNode = currNode.parentNode;
	}
}

export function* prior(node) {
	for (const previousSibling of previousSiblings(node)) {
		yield* depthFirstReversed(previousSibling);
	}

	const parent = node.parentNode;
	if (parent) {
		yield parent;
		yield* prior(parent);
	}
}

export function query(node, predicate, getChildNodes = defaultChildNodes) {
	for (const result of queryAll(node, predicate, getChildNodes)) {
		return result;
	}
	return null;
}

function AND(/* ...rules */) {
	const rules = new Array(arguments.length);
	for (let i = 0; i < arguments.length; i++) {
		rules[i] = arguments[i];
	}

	return function (node) {
		for (let i = 0; i < rules.length; i++) {
			if (!rules[i](node)) {
				return false;
			}
		}
		return true;
	};
}

export function* queryAll(node, predicate, getChildNodes = defaultChildNodes) {
	const elementPredicate = AND(isElement, predicate);

	for (const desc of depthFirst(node, getChildNodes)) {
		if (elementPredicate(desc)) {
			yield desc;
		}
	}
}
