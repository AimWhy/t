/* eslint-disable no-underscore-dangle */
const ForwardRef = Symbol.for('react.forward_ref');

const isDOMNode = e => e && typeof e.tagName === 'string' && e.nodeType === Node.ELEMENT_NODE;

export function getReactFiberFromNode(elm) {
  if (!elm) {
    return null;
  }

  for (const k in elm) {
    if (k.indexOf('__reactInternalInstance$') === 0 || k.indexOf('__reactFiber$') === 0) {
      return elm[k];
    }
  }

  throw new Error('getReactFiber(): Failed to find a React Fiber on a node');
}

export class FiberNavigator {
  // TODO: Fibers can become stale.
  //      The only current fiber is the one found on the DOM node.
  //      There is no way to start at a React Component fiber, go the DOM node,
  //      get the current fiber, and find your way back to the React Component fiber.
  //      Probably need to remove fromFiber and re-implement using only DOM node weak map.
  static {
    this.fromFiber = fiber => {
      if (!fiber) {
        return null;
      }

      const fiberNavigator = new FiberNavigator();
      Object.defineProperty(fiberNavigator, '__fiber', {
        value: fiber,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      return fiberNavigator;
    };
  }

  static {
    this.fromDOMNode = domNode => {
      const fiber = getReactFiberFromNode(domNode);
      if (!fiber) {
        return null;
      }

      const fiberNavigator = new FiberNavigator();
      Object.defineProperty(fiberNavigator, '__fiber', {
        value: fiber,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      return fiberNavigator;
    };
  }

  get key() {
    return this.__fiber.key;
  }

  get name() {
    if (this.isClassComponent || this.isFunctionComponent) {
      return this.__fiber.type.displayName || this.__fiber.type.name;
    }

    if (this.isForwardRef) {
      return (this.__fiber.type.displayName ||
        this.__fiber.type.name ||
        this.__fiber.type.return?.displayName ||
        this.__fiber.type.return?.name);
    }

    return this.isHostComponent ? this.__fiber.stateNode.constructor.name : null;
  }

  get parent() {
    return FiberNavigator.fromFiber(this.__fiber.return);
  }

  get owner() {
    // this also works, but is __DEV__ only
    // return FiberNavigator.fromFiber(this.__fiber._debugOwner); 

    let fiber = this.__fiber.return;
    do {
      if (typeof fiber.type !== 'string') {
        return FiberNavigator.fromFiber(fiber);
      }
      fiber = fiber.return;
    } while (fiber);
    return null;
  }

  get domNode() {
    let fiber = this.__fiber;
    do {
      if (isDOMNode(fiber.stateNode)) {
        return fiber.stateNode;
      }
      fiber = fiber.child;
    } while (fiber);
    return null;
  }

  get instance() {
    if (this.isClassComponent) {
      return this.__fiber.stateNode;
    }
    if (this.isFunctionComponent || this.isForwardRef) {
      // assumes functional component w/useRef
      return this.findHookState(this.__fiber.memoizedState);
    }
    return null;
  }

  get props() {
    return this.__fiber.memoizedProps;
  }

  get state() {
    return this.__fiber.memoizedState;
  }

  /**
   * Hooks state is represented by a recursive structure where:
   * - `memoizedState` is a current value if applicable
   * - `next` is next hook in order
   * @param node - fiber
   */

  findHookState(node) {
    if (node && node.memoizedState && node.memoizedState.current) {
      return node.memoizedState.current;
    }
    if (node === null || node.next === null) {
      return null;
    }
    return this.findHookState(node.next);
  }

  get reactComponent() {
    return this.isHostComponent ? this.owner.elementType : this.elementType;
  }

  get elementType() {
    return this.__fiber.elementType;
  }

  get jsxString() {
    return `<${this.name} />`;
  }

  find(condition, move) {
    let fiberNav = FiberNavigator.fromFiber(this.__fiber);
    while (fiberNav) {
      if (condition(fiberNav)) {
        return fiberNav;
      }
      fiberNav = move(fiberNav);
    }
    return null;
  }

  findOwner(condition) {
    return this.find(condition, fiberNav => fiberNav.owner);
  }

  findParent(condition) {
    return this.find(condition, fiberNav => fiberNav.parent);
  }

  get isClassComponent() {
    return typeof this.__fiber.type === 'function' && !!this.__fiber.type.prototype?.isReactComponent;
  }

  get isFunctionComponent() {
    return typeof this.__fiber.type === 'function' && !this.__fiber.type.prototype?.isReactComponent;
  }

  get isForwardRef() {
    return this.__fiber.type?.$$typeof === ForwardRef;
  }

  get isHostComponent() {
    return typeof this.__fiber.type === 'string';
  }

  get isDOMComponent() {
    return !!this.__fiber.child && FiberNavigator.fromFiber(this.__fiber.child).isHostComponent;
  }

  // https://github.com/facebook/react/blob/16.8.6/packages/react-dom/src/test-utils/ReactTestUtils.js#L193
  get isCompositeComponent() {
    return this.isDOMComponent ? false : !!this.instance && !!this.instance.render && !!this.instance.setState;
  }
}