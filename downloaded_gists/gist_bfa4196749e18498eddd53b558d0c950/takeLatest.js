function takeLatest(asyncFunc) {
	let index = 0;
	return (...argv) => {
		function execNext(func, reqIndex) {
			return (...argv2) => {
				if (reqIndex === index) {
					func.call(this, ...argv2);
				}
			};
		}

		return new Promise((resolve, reject) => {
			index++;
			asyncFunc.call(this, ...argv).then(execNext(resolve, index), execNext(reject, index));
		});
	};
}

// 异步函数
const timeout = name =>
	new Promise(resolve => {
		setTimeout(() => {
			resolve(name);
		}, 500);
	});

const a = takeLatest(timeout);

// 模拟频繁触发
for (let index = 0; index < 4; index++) {
	a(index).then(n => {
		// todo: 处理结果
		console.log(n);
	});
}