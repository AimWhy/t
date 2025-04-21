export interface Dependency {
	subs: Link | undefined;
	subsTail: Link | undefined;
}

export interface Subscriber {
	flags: SubscriberFlags;
	deps: Link | undefined;
	depsTail: Link | undefined;
}

export interface Link {
	dep: Dependency | (Dependency & Subscriber);
	sub: Subscriber | (Dependency & Subscriber);
	prevSub: Link | undefined;
	nextSub: Link | undefined;
	nextDep: Link | undefined;
}

interface OneWayLink<T> {
	target: T;
	linked: OneWayLink<T> | undefined;
}

export const enum SubscriberFlags {
	Computed = 1 << 0,
	Effect = 1 << 1,

	Tracking = 1 << 2,

	Notified = 1 << 3,
	Recursed = 1 << 4,

	Dirty = 1 << 5,
	PendingComputed = 1 << 6,
	PendingEffect = 1 << 7,
	Propagated = Dirty | PendingComputed | PendingEffect,
}

export function createReactiveSystem({
	updateComputed,
	notifyEffect,
}: {
	updateComputed(computed: Dependency & Subscriber): boolean;
	notifyEffect(effect: Subscriber): boolean;
}) {
	const notifyBuffer: (Subscriber | undefined)[] = [];

	let notifyIndex = 0;
	let notifyBufferLength = 0;

	return {
		link,
		propagate,
		updateDirtyFlag,
		startTracking,
		endTracking,
		processEffectNotifications,
		processComputedUpdate,
		processPendingInnerEffects,
	};

	function propagate(link: Link, targetFlag = SubscriberFlags.Dirty): void {
		do {
			let shouldNotify = false;
			const sub = link.sub;
			const subFlags = sub.flags;

			if (!(sub.flags & (SubscriberFlags.Tracking | SubscriberFlags.Recursed | SubscriberFlags.Propagated))) {
				sub.flags |= targetFlag | SubscriberFlags.Notified;
				shouldNotify = true;
			} else if ((sub.flags & SubscriberFlags.Recursed) && !(sub.flags & SubscriberFlags.Tracking)) {
				sub.flags &= ~SubscriberFlags.Recursed;
				sub.flags |= targetFlag | SubscriberFlags.Notified;
				shouldNotify = true;
			} else if (!(sub.flags & SubscriberFlags.Propagated) && _isValidLink(link, sub)) {
				sub.flags |= SubscriberFlags.Recursed;
				sub.flags |= targetFlag | SubscriberFlags.Notified;
				shouldNotify = (sub as Dependency).subs !== void 0;
			}

			if (shouldNotify) {
				const subSubs = (sub as Dependency).subs;
				if (subSubs !== void 0) {
					propagate(
						subSubs,
						(sub.flags & SubscriberFlags.Effect)
							? SubscriberFlags.PendingEffect
							: SubscriberFlags.PendingComputed
					);
				} else if (sub.flags & SubscriberFlags.Effect) {
					notifyBuffer[notifyBufferLength++] = sub;
				}
			} else if (!(subFlags & (SubscriberFlags.Tracking | targetFlag))) {
				sub.flags = subFlags | targetFlag | SubscriberFlags.Notified;
				if ((subFlags & (SubscriberFlags.Effect | SubscriberFlags.Notified)) === SubscriberFlags.Effect) {
					notifyBuffer[notifyBufferLength++] = sub;
				}
			} else if (!(subFlags & targetFlag) && (subFlags & SubscriberFlags.Propagated) && _isValidLink(link, sub)) {
				sub.flags = subFlags | targetFlag;
			}

			link = link.nextSub!;
		} while (link !== void 0);
	}

	/*************************************************/

	function _isValidLink(checkLink: Link, sub: Subscriber): boolean {
		if (sub.depsTail === void 0) {
			return false;
		}

		let link = sub.deps!;
		do {
			if (link === checkLink) {
				return true;
			}
			if (link === sub.depsTail) {
				break;
			}
			link = link.nextDep!;
		} while (link !== void 0);

		return false;
	}

	function _linkNewDep(dep: Dependency, sub: Subscriber, nextDep: Link | undefined, depsTail: Link | undefined): Link {
		const newLink: Link = {
			dep,
			sub,
			nextDep,
			prevSub: void 0,
			nextSub: void 0,
		};
		if (depsTail === void 0) {
			sub.deps = newLink;
		} else {
			depsTail.nextDep = newLink;
		}

		if (dep.subs === void 0) {
			dep.subs = newLink;
		} else {
			const oldTail = dep.subsTail!;
			newLink.prevSub = oldTail;
			oldTail.nextSub = newLink;
		}

		sub.depsTail = newLink;
		dep.subsTail = newLink;
		return newLink;
	}

	function link(dep: Dependency, sub: Subscriber): Link | undefined {
		if (sub.depsTail !== void 0 && sub.depsTail.dep === dep) {
			return;
		}

		const nextDep = sub.depsTail !== void 0 ? sub.depsTail.nextDep : sub.deps;
		if (nextDep !== void 0 && nextDep.dep === dep) {
			sub.depsTail = nextDep;
			return;
		}

		const depLastSub = dep.subsTail;
		if (depLastSub !== void 0 && depLastSub.sub === sub && _isValidLink(depLastSub, sub)) {
			return;
		}

		return _linkNewDep(dep, sub, nextDep, sub.depsTail);
	}

	function _clearTracking(head: Link): void {
		let link = head;
		do {
			const dep = link.dep;
			const nextDep = link.nextDep;

			if (link.nextSub !== void 0) {
				link.nextSub.prevSub = link.prevSub;
			} else {
				dep.subsTail = link.prevSub;
			}

			if (link.prevSub !== void 0) {
				link.prevSub.nextSub = link.nextSub;
			} else {
				dep.subs = link.nextSub;
			}

			// link 同位置替换，避免递归清理
			if (dep.subs === void 0 && 'deps' in dep) {
				const computed = dep;
				if (!(computed.flags & SubscriberFlags.Dirty)) {
					computed.flags = computed.flags | SubscriberFlags.Dirty;
				}

				if (computed.deps !== void 0) {
					link = computed.deps;
					computed.depsTail!.nextDep = nextDep;
					computed.deps = void 0;
					computed.depsTail = void 0;
					continue;
				}
			}
			link = nextDep!;
		} while (link !== void 0);
	}

	function startTracking(sub: Subscriber): void {
		sub.depsTail = void 0;
		sub.flags &= ~(SubscriberFlags.Notified | SubscriberFlags.Recursed | SubscriberFlags.Propagated);
		sub.flags |= SubscriberFlags.Tracking;
	}

	function endTracking(sub: Subscriber): void {
		if (sub.depsTail !== void 0) {
			const nextDep = sub.depsTail.nextDep;
			if (nextDep !== void 0) {
				_clearTracking(nextDep);
				sub.depsTail.nextDep = void 0;
			}
		} else if (sub.deps !== void 0) {
			_clearTracking(sub.deps);
			sub.deps = void 0;
		}
		sub.flags &= ~SubscriberFlags.Tracking;
	}

	function _shallowPropagate(head: Link): void {
		let link = head;
		do {
			const sub = link.sub;
			if ((sub.flags & (SubscriberFlags.PendingComputed | SubscriberFlags.Dirty)) === SubscriberFlags.PendingComputed) {
				sub.flags |= SubscriberFlags.Dirty | SubscriberFlags.Notified;
				if ((sub.flags & (SubscriberFlags.Effect | SubscriberFlags.Notified)) === SubscriberFlags.Effect) {
					notifyBuffer[notifyBufferLength++] = sub;
				}
			}
			link = link.nextSub!;
		} while (link !== void 0);
	}

	function _checkDirty(link: Link): boolean {
		do {
			if (link.sub.flags & SubscriberFlags.Dirty) {
				return true;
			}

			const isComputed = ('flags' in link.dep) && (link.dep.flags & SubscriberFlags.Computed);
			if (isComputed) {
				const computed = link.dep as (Dependency & Subscriber);
				const needUpdate = (computed.flags & SubscriberFlags.Dirty)
					|| (computed.flags & SubscriberFlags.PendingComputed) && _checkDirty(computed.deps!);

				if (needUpdate) {
					if (updateComputed(computed)) {
						const subs = computed.subs!;
						if (subs.nextSub !== void 0) {
							_shallowPropagate(subs);
						}
						return true;
					}
				} else {
					computed.flags &= ~SubscriberFlags.PendingComputed;
				}
			}

			link = link.nextDep!;
		} while (link !== void 0);

		return false;
	}

	// 如果订阅者有任何 PendingComputed，此函数将设置 Dirty 标志。否则，它将清除 PendingComputed 标志
	function updateDirtyFlag(sub: Subscriber): boolean {
		if (_checkDirty(sub.deps!)) {
			sub.flags |= SubscriberFlags.Dirty;
			return true;
		} else {
			sub.flags &= ~SubscriberFlags.PendingComputed;
			return false;
		}
	}

	function processPendingInnerEffects(sub: Subscriber, flags: SubscriberFlags): void {
		if (flags & SubscriberFlags.PendingEffect) {
			sub.flags = flags & ~SubscriberFlags.PendingEffect;

			let link = sub.deps!;
			do {
				const dep = link.dep;
				if ('flags' in dep && dep.flags & SubscriberFlags.Effect && dep.flags & SubscriberFlags.Propagated) {
					notifyEffect(dep);
				}
				link = link.nextDep!;
			} while (link !== void 0);
		}
	}

	function processEffectNotifications(): void {
		while (notifyIndex < notifyBufferLength) {
			const effect = notifyBuffer[notifyIndex]!;
			notifyBuffer[notifyIndex++] = void 0;
			if (!notifyEffect(effect)) {
				effect.flags &= ~SubscriberFlags.Notified;
			}
		}
		notifyIndex = 0;
		notifyBufferLength = 0;
	}

	function processComputedUpdate(computed: Dependency & Subscriber, flags: SubscriberFlags): void {
		if (flags & SubscriberFlags.Dirty || _checkDirty(computed.deps!)) {
			if (updateComputed(computed)) {
				if (computed.subs !== void 0) {
					_shallowPropagate(computed.subs);
				}
			}
		} else {
			computed.flags = flags & ~SubscriberFlags.PendingComputed;
		}
	}
}