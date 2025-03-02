'use strict';

const makeMap = (list) => {
	const map = Object.create(null);
	for (let i = 0; i < list.length; i++) {
		map[list[i]] = true;
	}
	return (val) => !!map[val];
};

const MemoPoolMap = new Map();
const objectEqual = (object1, object2, isDeep) => {
	if (object1 === object2) {
		return true;
	}

	if (
		typeof object1 !== 'object' ||
		typeof object2 !== 'object' ||
		object1 === null ||
		object2 === null
	) {
		return false;
	}

	const keys1 = Object.keys(object1);
	const keys2 = Object.keys(object2);

	if (keys1.length !== keys2.length) {
		return false;
	}

	for (const key of keys1) {
		const o1 = object1[key];
		const o2 = object2[key];

		if (isDeep) {
			const memo = MemoPoolMap.get(o1);
			if (memo && memo[0] === o2) {
				return memo[1];
			} else if (!objectEqual(o1, o2, true)) {
				return false;
			} else if (o1 && o2 && typeof o1 === 'object' && typeof o2 === 'object') {
				MemoPoolMap.set(o1, [o2, true]);
			}
		} else if (o1 !== o2) {
			return false;
		}
	}

	return true;
};

const HTML_TAGS =
	`html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot`.split(
		','
	);

const isHTMLTag = makeMap(HTML_TAGS);

const specialBooleanAttrs =
	`itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`.split(
		','
	);

const isSpecialBooleanAttr = makeMap(specialBooleanAttrs);

const includeBooleanAttr = (value) => !!value || value === '';

const optionsModifierRE = /(?:Once|Passive|Capture)$/;
const parseEventName = (name) => {
	let options = void 0;
	if (optionsModifierRE.test(name)) {
		options = {};
		let m;
		while ((m = name.match(optionsModifierRE))) {
			name = name.slice(0, name.length - m[0].length);
			options[m[0].toLowerCase()] = true;
		}
	}
	const event = name.slice(2).toLowerCase();
	return [event, options];
};

const genCursorFix = () => {
	const focusedElement = document.activeElement;
	const start = focusedElement.selectionStart;
	const end = focusedElement.selectionEnd;

	return () => {
		// 重新定位焦点, 恢复选择位置
		focusedElement.focus();
		focusedElement.selectionStart = start;
		focusedElement.selectionEnd = end;
	};
};

const resolvedPromise = Promise.resolve();
const queueMicrotask =
	window.queueMicrotask ||
	((callback) => {
		if (typeof callback !== 'function') {
			throw new TypeError('The argument to queueMicrotask must be a function.');
		}

		resolvedPromise.then(callback).catch((error) =>
			setTimeout(() => {
				throw error;
			}, 0)
		);
	});

const uniqueSet = new Set();
const queueMicrotaskOnce = (func) => {
	if (!uniqueSet.has(func)) {
		uniqueSet.add(func);
		queueMicrotask(() => {
			func();
			uniqueSet.delete(func);
		});
	}
};

let isMessageLoopRunning = false;
const scheduledCallbackQueue = [];
const performWork = () => {
	if (scheduledCallbackQueue.length) {
		try {
			const work = scheduledCallbackQueue.shift();
			work();
		} finally {
			if (scheduledCallbackQueue.length) {
				schedulePerform();
			} else {
				isMessageLoopRunning = false;
			}
		}
	} else {
		isMessageLoopRunning = false;
	}
};

const channel = new MessageChannel();
channel.port1.onmessage = performWork;
const schedulePerform = () => channel.port2.postMessage(null);

const queueMacrotask = (callback) => {
	scheduledCallbackQueue.push(callback);
	if (!isMessageLoopRunning) {
		isMessageLoopRunning = true;
		schedulePerform();
	}
};

const isTextOrCommentElement = (element) =>
	element.type === 'text' || element.type === 'comment';

function onCompositionStart(e) {
	e.target.composing = true;
}
function onCompositionEnd(e) {
	const target = e.target;
	if (target.composing) {
		target.composing = false;
		target.dispatchEvent(new Event('input'));
	}
}

function onInputFixed(fun) {
	return function (e) {
		if (!e.target.composing) {
			fun(e);
		}
	};
}

function fixProps(oldProps) {
	const newProps = { ...oldProps };
	if ('onInput' in newProps) {
		newProps['onCompositionstart'] = onCompositionStart;
		newProps['onCompositionend'] = onCompositionEnd;
		newProps['onChange'] = onCompositionEnd;
		newProps['onInput'] = onInputFixed(newProps['onInput']);
	}
	return newProps;
}

function genBuildInFun($tag) {
	const func = function (
		props = {},
		oldProps = {},
		{ instance, useState, useEffect }
	) {
		oldProps = fixProps(oldProps);
		props = fixProps(props);

		const [invokers] = useState({});
		const element = instance || document.createElement($tag);
		const deleteMap = { ...oldProps };
		element._fiberKey = this.key;
		element._fiber = this;

		for (const [pKey, pValue] of Object.entries(props)) {
			if (pKey.match(/^on[A-Z]/)) {
				const [eventName, options] = parseEventName(pKey);

				if (!invokers[pKey]) {
					invokers[pKey] = {
						raw: pValue,
						handler(event) {
							invokers[pKey].raw(event);
						}
					};

					element.addEventListener(eventName, invokers[pKey].handler, options);
				} else {
					invokers[pKey].raw = pValue;
				}

				delete deleteMap[pKey];
				continue;
			}

			delete deleteMap[pKey];
			if (pKey === 'children' || pKey === 'ref' || pKey === 'key') {
				continue;
			}
			if (pValue === oldProps[pKey]) {
				continue;
			}

			const isBoolean = isSpecialBooleanAttr(pKey);

			if (pValue == null || (isBoolean && !includeBooleanAttr(pValue))) {
				element.removeAttribute(pKey);
			} else {
				element.setAttribute(pKey, isBoolean ? '' : pValue);
			}
		}

		for (const [pKey, map] of Object.entries(deleteMap)) {
			if (pKey.match(/^on[A-Z]/)) {
				const [eventName, options] = parseEventName(pKey);
				element.removeEventListener(eventName, map.handler, options);
			} else {
				element.removeAttribute(pKey);
			}
		}

		useEffect(
			() => () => {
				for (const [pKey, map] of Object.entries(invokers)) {
					const [eventName, options] = parseEventName(pKey);
					element.removeEventListener(eventName, map.handler, options);
				}
				element.remove();
			},
			[]
		);

		return element;
	};

	Object.defineProperty(func, 'name', { value: $tag });
	return func;
}

const buildIn = {
	comment(props, oldProps, { instance, useEffect }) {
		const element = instance || document.createComment(props.content);
		element._fiberKey = this.key;
		element._fiber = this;

		if (!oldProps || props.content !== oldProps.content) {
			element.data = props.content;
		}
		useEffect(
			() => () => {
				element.remove();
			},
			[]
		);

		return element;
	},
	text(props, oldProps, { instance, useEffect }) {
		const element = instance || document.createTextNode(props.content);
		element._fiberKey = this.key;
		element._fiber = this;

		if (!oldProps || props.content !== oldProps.content) {
			element.data = props.content;
		}

		useEffect(
			() => () => {
				element.remove();
			},
			[]
		);

		return element;
	}
};

HTML_TAGS.forEach((tag) => {
	buildIn[tag] = genBuildInFun(tag);
});

const HostElementSet = new Set(Object.values(buildIn));

const isHostElementFn = (func) => HostElementSet.has(func);

const MountedLane = 0;
const UpdatedLane = 1;

const firstNextWithProps = (generatorFunction) => {
	return (func, pushRenderElement) => {
		const generatorObject = generatorFunction(func, pushRenderElement);

		generatorObject.next();

		const result = {
			next: (...args) => {
				return generatorObject.next(...args);
			},
			throw: (...args) => {
				return generatorObject.throw(...args);
			},

			//子 fiber 状态
			first: null,
			last: null,
			length: 0,

			// 自身 fiber 状态
			index: 0,
			previous: null,
			sibling: null,
			return: null,
			StatusLane: MountedLane,

			// 继承 Element 数据
			type: func,
			key: null,
			props: {},
			children: null,

			// dom 数据
			stateNode: document.createDocumentFragment()
		};

		generatorObject.next(result);

		return result;
	};
};

const checkIfSnapshotChanged = ({ value, getSnapshot }) => {
	try {
		return value !== getSnapshot();
	} catch {
		return true;
	}
};

function* withStateFun(func, pushRenderElement) {
	const self = yield;

	let props = void 0;
	let newProps = (yield) || {};
	let result = null;

	let StateIndex = 0;
	const hookQueue = [];

	const useState = (initialState) => {
		const innerIndex = StateIndex++;

		if (hookQueue.length <= innerIndex) {
			if (typeof initialState === 'function') {
				initialState = initialState();
			}
			hookQueue[innerIndex] = initialState;
		}

		return [
			hookQueue[innerIndex],
			(newState) => {
				if (typeof newState === 'function') {
					const oldState = hookQueue[innerIndex];
					newState = newState(oldState);
				}
				hookQueue[innerIndex] = newState;

				pushRenderElement(self);
			}
		];
	};

	const effects = [];
	const cleanEffects = [];
	const useEffect = (effect, deps) => {
		const innerIndex = StateIndex++;
		const oldDeps = hookQueue[innerIndex] ? hookQueue[innerIndex][1] : NaN;

		if (hookQueue.length <= innerIndex) {
			hookQueue[innerIndex] = [effect, deps];
		} else {
			hookQueue[innerIndex][1] = deps;
		}

		if (deps == void 0) {
			effects.push(effect);
		} else if (Array.isArray(deps)) {
			if (!deps.length) {
				if (self.StatusLane === MountedLane) {
					effects.push(effect);
					effect.mountDep = true;
				}
			} else {
				if (!objectEqual(deps, oldDeps)) {
					effects.push(effect);
				}
			}
		}
	};

	const useSyncExternalStore = (subscribe, getSnapshot) => {
		const value = getSnapshot();
		const [{ inst }, forceUpdate] = useState({
			inst: { value, getSnapshot }
		});

		useEffect(() => {
			if (checkIfSnapshotChanged(inst)) {
				forceUpdate({ inst });
			}

			return subscribe(function handleStoreChange() {
				if (checkIfSnapshotChanged(inst)) {
					forceUpdate({ inst });
				}
			});
		}, [subscribe]);

		return value;
	};

	self.flushEffects = function flushEffects() {
		while (effects.length) {
			const current = effects.shift();
			const clean = current();

			if (typeof clean === 'function') {
				clean.mountDep = current.mountDep;
				cleanEffects.push(clean);
			}
		}
		self.StatusLane = UpdatedLane;
	};

	self.flushCleanEffects = function flushCleanEffects(isUnmounted) {
		const temp = [];

		while (cleanEffects.length) {
			const clean = cleanEffects.shift();
			const isUnmountClean = clean.mountDep;

			if (isUnmounted) {
				clean();
			} else {
				if (!isUnmountClean) {
					clean();
				} else {
					temp.push(clean);
				}
			}
		}
		if (isUnmounted) {
			props = void 0;
			effects.length = 0;
			cleanEffects.length = 0;
			hookQueue.length = 0;
		} else {
			cleanEffects.push(...temp);
		}
	};

	const hookMap = {
		useState,
		useEffect,
		useSyncExternalStore
	};

	while (true) {
		self.flushCleanEffects();

		StateIndex = 0;

		result = func.call(self, newProps, props, hookMap);

		props = newProps;

		newProps = yield result;

		hookMap.instance = result;
	}
}

const componentCreator = firstNextWithProps(withStateFun);

function generator(pushRenderElement, element) {
	const result = componentCreator(
		typeof element.type === 'string' ? buildIn[element.type] : element.type,
		pushRenderElement
	);

	result.props = element.props;
	return result;
}

function jsx(type, props = {}, key = null) {
	return { key, type, props };
}

function Fragment(props) {
	return toChildren(props.children);
}

const renderList = new Set();
const pushRenderElement = (generatorObj) => {
	renderList.add(generatorObj);
	queueMicrotaskOnce(forceRender);
};

function* lastPositionFiber(fiber) {
	while (fiber) {
		if (fiber.type !== Fragment || !fiber.props.target) {
			yield fiber;
			yield* lastPositionFiber(fiber.last);
		}
		fiber = fiber.previous;
	}
}

function getPreviousNode(fiber) {
	const previous = fiber.previous;
	for (const temp of lastPositionFiber(previous)) {
		if (isHostElementFn(temp.type)) {
			return temp.stateNode;
		}
	}
}

const insertNode = (existReturnFiber, fiber) => {
	const preNode = getPreviousNode(fiber);

	if (preNode) {
		preNode.after(fiber.stateNode);
	} else {
		if (isHostElementFn(existReturnFiber.type)) {
			existReturnFiber.stateNode.prepend(fiber.stateNode);
		} else {
			let parentPreviousNode = getPreviousNode(existReturnFiber);
			while (!parentPreviousNode) {
				existReturnFiber = existReturnFiber.return;
				if (isHostElementFn(existReturnFiber.type)) {
					existReturnFiber.stateNode.prepend(fiber.stateNode);
					return;
				} else {
					parentPreviousNode = getPreviousNode(existReturnFiber);
				}
			}
			parentPreviousNode.after(fiber.stateNode);
		}
	}
};

function cleanChildFiber(fiber) {
	fiber.first = null;
	fiber.last = null;
	fiber.length = 0;
}
function cleanSelfFiber(fiber) {
	fiber.index = 0;
	fiber.previous = null;
	fiber.sibling = null;
	fiber.return = null;
}

let FiberMap = new Map();

const gen = (element, key) => {
	let fiber = null;
	if (key !== void 0 && FiberMap && FiberMap.get(key)) {
		fiber = FiberMap.get(key);
		FiberMap.delete(key);

		fiber.reuse = 'reuse' in fiber ? fiber.reuse : true;
		fiber.StatusLane = UpdatedLane;
		cleanSelfFiber(fiber);
	} else {
		fiber = generator(pushRenderElement, element);
	}

	fiber.key = key;
	return fiber;
};

function linkReturn(returnFiber, fiber) {
	if (returnFiber) {
		const index = returnFiber.length || 0;

		fiber.index = index;
		fiber.return = returnFiber;

		if (!returnFiber.first) {
			returnFiber.first = fiber;
		} else {
			returnFiber.last.sibling = fiber;
			fiber.previous = returnFiber.last;
		}

		returnFiber.last = fiber;
		returnFiber.length = index + 1;
	}
}
function toChildren(children) {
	if (children === void 0) {
		return children;
	}
	return [].concat(children);
}

function beginWork(element, returnFiber) {
	const pKey = returnFiber ? `${returnFiber.key}:` : '';
	const length = returnFiber ? returnFiber.length || 0 : 0;

	if (typeof element === 'string' || typeof element === 'number') {
		element = jsx('text', { content: element });
	} else if (Array.isArray(element)) {
		element = jsx(Fragment, { children: element });
	} else if (!element || !element.type) {
		element = jsx('text', { content: '' });
	}

	let fiber = null;
	let key = pKey + (element.key || '');
	if (!element.key) {
		key = key + (element.type.name || element.type) + '_' + length;
	}

	fiber = gen(element, key);
	linkReturn(returnFiber, fiber);

	if (fiber.reuse && objectEqual(element.props, fiber.props, true)) {
		walkInnerFiber(fiber, (f) => FiberMap.delete(f.key, f));
		return fiber;
	}

	delete fiber.reuse;
	cleanChildFiber(fiber);

	if (isTextOrCommentElement(element)) {
		fiber.props = element.props;
		return fiber;
	}

	if (isHTMLTag(element.type)) {
		fiber.props = element.props;
		fiber.children = toChildren(element.props.children);
		return fiber;
	}

	fiber.props = element.props;
	const innerRootElement = fiber.next(element.props).value;
	fiber.children = toChildren(innerRootElement);
	return fiber;
}

function mountFinishedWork(fiber) {
	if (isHostElementFn(fiber.type)) {
		const temp = fiber.next(fiber.props).value;
		if (temp.nodeType !== 3 && temp.nodeType !== 8) {
			temp.appendChild(fiber.stateNode);
		}
		fiber.stateNode = temp;
	}

	if (fiber.type === Fragment && fiber.props.target) {
		fiber.props.target.appendChild(fiber.stateNode);
	}

	if (fiber.return) {
		fiber.return.stateNode.appendChild(fiber.stateNode);
	}
}

function updateFinishedWork(fiber) {
	if (isHostElementFn(fiber.type)) {
		fiber.stateNode = fiber.next(fiber.props).value;
	}

	if (!fiber.first) {
		return;
	}

	let childFiber = fiber.first;
	while (childFiber) {
		if (fiber.StatusLane === UpdatedLane) {
			if (childFiber.StatusLane === MountedLane) {
				insertNode(fiber, childFiber);
			}
		} else {
			fiber.stateNode.appendChild(childFiber.stateNode);

			if (fiber.type === Fragment && fiber.props.target) {
				fiber.props.target.appendChild(fiber.stateNode);
			}
		}
		childFiber = childFiber.sibling;
	}
}

function* postOrder(element, returnFiber) {
	Promise.resolve().then(() => MemoPoolMap.clear());

	const fiber = beginWork(element, returnFiber);

	if (!fiber || !fiber.children || !fiber.children.length || fiber.reuse) {
		delete fiber.reuse;
		// console.log('reuse', fiber.key);
		yield fiber;
	} else {
		for (const child of fiber.children) {
			yield* postOrder(child, fiber);
		}
		yield fiber;
	}
}

const innerRender = (element) => {
	let result = null;
	const isUpdate = FiberMap.size > 0;
	for (const fiber of postOrder(element)) {
		// console.log('FinishedWork', fiber.key, fiber);
		// console.count('FinishedWork');
		if (isUpdate) {
			updateFinishedWork(fiber);
		} else {
			mountFinishedWork(fiber);
		}

		queueMacrotask(fiber.flushEffects);

		result = fiber;
	}

	if (isUpdate && result.return) {
		queueMacrotask(result.return.flushEffects);
	}

	for (const [_fiberKey, dFiber] of FiberMap.entries()) {
		// console.log('_fiberKey', _fiberKey);
		queueMacrotask(() => {
			dFiber.flushCleanEffects(true);
		});
	}

	FiberMap.clear();
	return result;
};

const walkInnerFiber = (fiber, fun) => {
	let cursor = fiber;
	if (!cursor.first) {
		return;
	}

	while (cursor) {
		while (cursor.first) {
			cursor = cursor.first;
		}

		while (!cursor.sibling) {
			fun(cursor);
			cursor = cursor.return;
			if (!cursor || cursor === fiber) {
				cursor === fiber && fun(cursor);
				return;
			}
		}

		fun(cursor);
		if (!cursor || cursor === fiber) {
			cursor === fiber && fun(cursor);
			return;
		}

		cursor = cursor.sibling;
	}
};

const cleanReuse = (fiber) => {
	while (fiber) {
		delete fiber.reuse;
		fiber = fiber.return;
	}
};

const getAncestorFuncFiber = () => {
	const parentMap = new Map();

	for (const fiber of renderList) {
		let parent = fiber;

		while (parent) {
			const count = (parentMap.get(parent) || 0) + 1;
			parent.reuse = false;
			parentMap.set(parent, count);

			if (count === renderList.size && !isHostElementFn(parent.type)) {
				renderList.clear();
				cleanReuse(parent.return);
				return parent;
			}

			parent = parent.return;
		}
	}
};

function forceRender() {
	// console.clear();
	const cursorFix = genCursorFix();
	const ancestorFiber = getAncestorFuncFiber();

	FiberMap.clear();
	walkInnerFiber(ancestorFiber, (f) => {
		FiberMap.set(f.key, f);
	});

	const keys = [...FiberMap.keys()];
	// console.log('FiberMap:', keys, keys.length);

	// 记录旧位置， 更新完成后还原
	const { index, previous, sibling, return: return1 } = ancestorFiber;

	const fiber = innerRender(
		jsx(ancestorFiber.type, ancestorFiber.props, ancestorFiber.key)
	);

	fiber.index = index;
	fiber.previous = previous;
	fiber.sibling = sibling;
	fiber.return = return1;

	cursorFix();
}

const createRoot = (container) => {
	const key = container.id || (Date.now() + Math.random()).toString(36);

	return {
		render(element) {
			// console.clear();

			element.key = element.key || key;

			FiberMap.clear();
			const fiber = innerRender(element);
			container.appendChild(fiber.stateNode);
		}
	};
};

window.WhyReact = { Fragment, createRoot, jsx };
