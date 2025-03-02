export const safeStringify = function (obj, spaces) {
	return JSON.stringify(obj, serializer(), spaces);
};

const serializer = function () {
	const keys = [];
	const stack = [];

	const cycleReplacer = (key, value) => {
		if (stack[0] === value) {
			return '[Circular ~]';
		}

		return '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']';
	};

	return function (key, value) {
		if (stack.length > 0) {
			const thisPos = stack.indexOf(this);

			if (thisPos > -1) {
				stack.length = thisPos + 1;
				keys.length = thisPos + 1;
				keys[thisPos] = key;
			} else {
				stack.push(this);
				keys.push(key);
			}

			if (~stack.indexOf(value)) {
				value = cycleReplacer.call(this, key, value);
			}
		} else {
			stack.push(value);
		}

		if (
			value === Infinity ||
			value === -Infinity ||
			Number.isNaN(value) ||
			typeof value === 'function' ||
			typeof value === 'symbol'
		) {
			return '[' + value.toString() + ']';
		}

		return value;
	};
};