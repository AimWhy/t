export const waitUntilWrapperExists = async (selector = '.messages-box .wrapper') =>
	document.querySelector(selector) ||
	new Promise((resolve) => {
		const observer = new MutationObserver(function (mutations, obs) {
			const element = document.querySelector(selector);
			if (element) {
				obs.disconnect(); // stop observing
				return resolve(element);
			}
		});
		observer.observe(document, {
			childList: true,
			subtree: true,
		});
	});