export function* walk(maybeNode, visited = new WeakSet()) {
	if (typeof maybeNode === 'string') {
		return;
	}

	if (visited.has(maybeNode)) {
		return;
	}

	// Traverse node's properties first
	for (const value of Object.values(maybeNode)) {
		if (Array.isArray(value)) {
			for (const element of value) {
				yield* walk(element, visited);
			}
		} else {
			yield* walk(value, visited);
		}
	}
	// Then pass it back to our callback, which will mutate it
	yield maybeNode;
	visited.add(maybeNode);
}
