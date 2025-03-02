export function whenDeleted(path: string, intervalMs = 1000): Promise<void> {
	return new Promise<void>(resolve => {
		let running = false;
		const interval = setInterval(() => {
			if (!running) {
				running = true;
				fs.access(path, err => {
					running = false;

					if (err) {
						clearInterval(interval);
						resolve(undefined);
					}
				});
			}
		}, intervalMs);
	});
}