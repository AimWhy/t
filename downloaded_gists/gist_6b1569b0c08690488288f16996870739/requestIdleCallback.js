const MESSAGE_EVENT_DATA = 'blueprint-table-post-message';
const IDLE_STATE = {
	callbacks: [],
	triggered: false
};

const handleIdle = (event) => {
	if (event.source !== window || event.data !== MESSAGE_EVENT_DATA) {
		return;
	}

	IDLE_STATE.triggered = false;
	let callback = null;

	if (IDLE_STATE.callbacks.length > 0) {
		callback = IDLE_STATE.callbacks.shift();
	}

	if (IDLE_STATE.callbacks.length > 0) {
		triggerIdleFrame();
	}

	if (callback) {
		callback();
	}
};

if (typeof window !== 'undefined') {
	if (window.addEventListener != null) {
		window.addEventListener('message', handleIdle, false);
	}
}

const triggerIdleFrame = () => {
	if (IDLE_STATE.triggered) {
		return;
	}
	IDLE_STATE.triggered = true;

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			postMessage(MESSAGE_EVENT_DATA, '*');
		});
	});
};

export const requestIdleCallback = (callback) => {
	IDLE_STATE.callbacks.push(callback);
	triggerIdleFrame();
};
