function poll(fn, timeout, interval = 100) {
	const endTime = Number(new Date()) + (timeout || 2000);

	const checkCondition = (resolve, reject) => {
		let ajax = fn();
		ajax.then((response) => {
			if (response.statusText === 'OK') {
				resolve(response.data);
			} else if (Number(new Date()) < endTime) {
				setTimeout(checkCondition, interval, resolve, reject);
			} else {
				reject(new Error('time out for ' + fn + ' : ' + arguments));
			}
		});
	};
	return new Promise(checkCondition);
}

poll(
	() => {
		return axios.get('https:some_url', {
			params: {
				getParam1: 1234567
			}
		});
	},
	2000,
	150
)
	.then((res) => {
		console.log(res); // here is where you use the result to call a function blah blah
	})
	.catch(() => console.log('failed to get data'));
