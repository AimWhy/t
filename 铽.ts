/**
 * "双栈队列" 或 "摊销队列"
 * 确保队列的所有操作（push 和 pop）都能保持高效的平均时间复杂度 O(1)，这在处理大量数据时特别重要。
 */
export class Queue<T> {
	private enter: T[] = [];
	private leave: T[] = [];

	get size() {
		return this.enter.length + this.leave.length;
	}

	constructor(init: T[] = []) {
		this.enter.push(...init);
	}

	push(...val: T[]) {
		this.enter.push(...val);
	}

	pop() {
		if (!this.leave.length) {
			while (this.enter.length) {
				this.leave.push(this.enter.pop()!);
			}
		}
		return this.leave.pop();
	}

	at(index: number) {
		if (index < this.leave.length) {
			return this.leave[this.leave.length - 1 - index];
		} else {
			return this.enter[index - this.leave.length];
		}
	}

	*[Symbol.iterator]() {
		for (let i = 0; i < this.leave.length; i++) {
			yield this.leave[this.leave.length - 1 - i];
		}
		yield* this.enter;
	}
}

export class ConditionVariable {
	private promise: Promise<void> | undefined;
	private resolve: (() => void) | undefined;

	private resetPromise() {
		this.promise = new Promise<void>((resolve) => {
			this.resolve = resolve;
		});
	}

	wait(): Promise<void> {
		if (!this.promise) {
			this.resetPromise();
		}
		return this.promise!;
	}

	signal() {
		if (this.resolve) {
			this.resolve();
			this.promise = void 0;
			this.resolve = void 0;
		}
	}
}

export class WaitQueue<T> {
	private queue = new Queue<T>();
	private notFull = new ConditionVariable();
	private notEmpty = new ConditionVariable();

	constructor(private readonly maxSize: number = Infinity) { }

	async push(x: T): Promise<void> {
		while (this.queue.size >= this.maxSize) {
			await this.notFull.wait();
		}

		this.queue.push(x);
		this.notEmpty.signal();
	}

	async pop(): Promise<T> {
		while (this.queue.size <= 0) {
			await this.notEmpty.wait();
		}

		const value = this.queue.pop()!;
		this.notFull.signal();
		return value;
	}
}

export class PromiseQueue {
	private readonly cv = new ConditionVariable();
	private inflight = 0;
	private waiting = 0;

	constructor(private readonly maxInFlight: number) { }

	async push(p: () => Promise<void>): Promise<void> {
		while (this.inflight >= this.maxInFlight) {
			++this.waiting;
			await this.cv.wait();
			--this.waiting;
		}
		++this.inflight;
		return p().finally(() => {
			--this.inflight;
			this.cv.signal();
		});
	}

	numInflight() {
		return this.inflight;
	}

	numWaiting() {
		return this.waiting;
	}
}

export function mapAsyncPool<T, V>(
	input: T[],
	f: (x: T) => Promise<V>,
	poolSize: number
): Promise<V>[] {
	// Using WaitQueue as a semaphore here.
	const waitQueue = new WaitQueue<void>(poolSize);
	return input.map(async (x) => {
		await waitQueue.push();
		// It's our turn, so safe to run the function now.
		const result = await f(x);
		await waitQueue.pop();
		return result;
	});
}
