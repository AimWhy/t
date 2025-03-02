export function deepCompare(x, y) {
	if (x === y) {
		return true;
	}

	if (typeof x !== typeof y) {
		return false;
	}

	if (typeof x === 'number' && isNaN(x) && isNaN(y)) {
		return true;
	}

	if (x === null || y === null) {
		return x === y;
	}

	if (!(x instanceof Object)) {
		return false;
	}

	if (x.constructor !== y.constructor || x.prototype !== y.prototype) {
		return false;
	}

	if (x instanceof RegExp || x instanceof Date) {
		return x.toString() === y.toString();
	}

	if (Array.isArray(x)) {
		if (x.length !== y.length) {
			return false;
		}

		for (let i = 0; i < x.length; i++) {
			if (!deepCompare(x[i], y[i])) {
				return false;
			}
		}
	} else {
		for (const p in y) {
			if (
				Object.prototype.hasOwnProperty.call(y, p) !==
				Object.prototype.hasOwnProperty.call(x, p)
			) {
				return false;
			}
		}

		for (const p in x) {
			if (
				Object.prototype.hasOwnProperty.call(y, p) !==
					Object.prototype.hasOwnProperty.call(x, p) ||
				!deepCompare(x[p], y[p])
			) {
				return false;
			}
		}
	}
	return true;
}

export function withTimeout(promise, timeout) {
	if (timeout) {
		return new Promise((resolve, reject) => {
			setTimeout(
				() => reject(new TimeoutError(timeout)),
				timeout.asMilliseconds()
			);
			promise.then(resolve, reject);
		});
	} else {
		return promise;
	}
}
