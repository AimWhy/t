export default function createDispatcher() {
	const middleware = [];
	let currentIndex = 0;
	const use = (item) => middleware.push(item);
	const dispatch = (payload) => {
		const current = middleware[currentIndex];
		if (typeof current === 'function') {
			return current(payload, (explicitPayload) => {
				currentIndex++;
				return dispatch(explicitPayload);
			});
		}
		currentIndex = 0;
		return payload;
	};
	use.dispatch = dispatch;
	use.unshift = (item) => middleware.unshift(item);
	use.remove = (item) => {
		const index = middleware.indexOf(item);
		if (index > -1) middleware.splice(index, 1);
	};
	return use;
}

function createHooks() {
	const hooks = new Map();
	return new Proxy(hooks, {
		get(_, property) {
			if (!hooks.has(property)) {
				hooks.set(property, createDispatcher());
			}
			return hooks.get(property);
		}
	});
}

function trap(getter, setter, curryGetter = true) {
	let get = false;
	if (getter) {
		if (curryGetter) {
			get = (node, context) => {
				return (...args) => getter(node, context, ...args);
			};
		} else {
			get = (node, context) => getter(node, context);
		}
	}

	let set = (node, context, property) => {
		console.error(122, node, context, property);
	};
	if (setter) {
		set = setter;
	}

	return { get, set };
}

function createTraps() {
	return new Map([
		['config', trap(false)],
		['plugins', trap(false)],
		['emit', trap(false)]
	]);
}

function createContext(options) {
	return {
		hook: createHooks(),
		traps: createTraps()
	};
}

export function createNode(options) {
	const ops = options || {};
	const context = createContext(ops);

	const node = new Proxy(context, {
		get(...args) {
			const [, property] = args;
			if (property === '__Node__') {
				return true;
			}
			const trap = context.traps.get(property);

			if (trap && trap.get) {
				return trap.get(node, context);
			}

			return Reflect.get(...args);
		},
		set(...args) {
			const [, property, value] = args;
			const trap = context.traps.get(property);

			if (trap && trap.set) {
				return trap.set(node, context, property, value);
			}

			return Reflect.set(...args);
		}
	});

	return nodeInit(node, ops);
}

function nodeInit(node, ops) {
	node.emit('created', node);
	node.isCreated = true;
	return node;
}
