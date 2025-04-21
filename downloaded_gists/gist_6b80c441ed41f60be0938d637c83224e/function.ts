
function asyncTool(func) {
	const fulfilled = Promise.resolve();
	const middleware: Function[] = [];
	const context = Object.create(null);

	const newFunc = function (...args) {
		let index = -1
		const that = this;
		context.args = Object.freeze(args);

		return (function dispatch(i) {
			if (i < index) {
				return Promise.reject(new Error('next() be called outside'))
			}

			index = i
			let p = null;

			if (i < middleware.length) {
				return fulfilled.then(() => middleware[i](context, dispatch.bind(null, i + 1))).then(() => context.result);
			} else {
				return context.result = fulfilled.then(() => func.apply(that, args));
			}
		})(0);
	}

	newFunc.use = function (mid) {
		if (typeof mid !== 'function') {
			throw new TypeError('middleware must be a function!')
		}
		middleware.push(mid);
		return this
	}

	return newFunc;
}

function retry(retries) {
	return async function (context, next) {
		for (let i = 0; i < retries; i++) {
			try {
				return await next();
			} catch (error) {
				context。
			}
		}
	}
}