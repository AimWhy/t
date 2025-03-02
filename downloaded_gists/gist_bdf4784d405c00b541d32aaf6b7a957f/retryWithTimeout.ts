export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms))
}

const timeoutSymbol = Symbol()

// https://stackoverflow.com/a/67630893
async function retry<T>(f: () => Promise<T>, count: number) {
	for (let attempt = 1; attempt <= count; attempt++) {
		try {
			return await f()
		} catch (err) {
			if (
				typeof err === 'object' &&
				err != null &&
				'cause' in err &&
				err.cause === timeoutSymbol
			) {
				console.debug(`Retry ${attempt}/${count}`)
			}
		}
	}
	throw Error(`Failed after ${count} tries`)
}
async function timeout<T>(f: () => Promise<T>, ms: number) {
	return await Promise.race([
		f(),
		sleep(ms).then(() => {
			throw Error(undefined, { cause: timeoutSymbol })
		}),
	])
}
export async function retryWithTimeout<T>(
	f: () => Promise<T>,
	count: number,
	timeoutMs: number,
) {
	return await retry(async () => await timeout(f, timeoutMs), count)
}