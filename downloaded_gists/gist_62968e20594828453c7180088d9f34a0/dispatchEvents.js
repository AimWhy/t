function delay(duration) {
  return new Promise(function (resolve) {
    setTimeout(resolve, duration);
  });
}

function waitElementReady(selector, callback) {
  const elem = document.querySelector(selector);
  if (elem !== null) {
    callback(elem);
    return;
  }
  setTimeout(function () {
    waitElementReady(selector, callback);
  }, 50);
}

function waitElement(selector, timeout = 3e3) {
  const waitPromise = new Promise(function (resolve) {
    waitElementReady(selector, function (elem) {
      return resolve(elem);
    });
  });
  return Promise.race([delay(timeout), waitPromise]);
}

const reactEvents = [
  'onAbort',
  'onAnimationCancel',
  'onAnimationEnd',
  'onAnimationIteration',
  'onAuxClick',
  'onBlur',
  'onChange',
  'onClick',
  'onClose',
  'onContextMenu',
  'onDoubleClick',
  'onError',
  'onFocus',
  'onGotPointerCapture',
  'onInput',
  'onKeyDown',
  'onKeyPress',
  'onKeyUp',
  'onLoad',
  'onLoadEnd',
  'onLoadStart',
  'onLostPointerCapture',
  'onMouseDown',
  'onMouseMove',
  'onMouseOut',
  'onMouseOver',
  'onMouseUp',
  'onPointerCancel',
  'onPointerDown',
  'onPointerEnter',
  'onPointerLeave',
  'onPointerMove',
  'onPointerOut',
  'onPointerOver',
  'onPointerUp',
  'onReset',
  'onResize',
  'onScroll',
  'onSelect',
  'onSelectionChange',
  'onSelectStart',
  'onSubmit',
  'onTouchCancel',
  'onTouchMove',
  'onTouchStart',
  'onTouchEnd',
  'onTransitionCancel',
  'onTransitionEnd',
  'onDrag',
  'onDragEnd',
  'onDragEnter',
  'onDragExit',
  'onDragLeave',
  'onDragOver',
  'onDragStart',
  'onDrop',
  'onFocusOut',
];

const divergentNativeEvents = {
  onDoubleClick: 'dblclick',
};

const mimickedReactEvents = {
  onInput: 'onChange',
  onFocusOut: 'onBlur',
  onSelectionChange: 'onSelect',
};

function getNativeEventName(reactEventName) {
  if (divergentNativeEvents[reactEventName]) {
    return divergentNativeEvents[reactEventName];
  }
  return reactEventName.replace(/^on/, '').toLowerCase();
}

function composedPath(el) {
  const path = [];
  while (el) {
    path.push(el);
    if (el.tagName === 'HTML') {
      path.push(document);
      path.push(window);
      return path;
    }
    el = el.parentElement;
  }
}

function findReactEventHandlers(item) {
  return findReactProperty(item, '__reactEventHandlers');
}

function findReactComponent(item) {
  return findReactProperty(item, '_reactInternal');
}

function findReactProperty(item, propertyPrefix) {
  for (const key in item) {
    if (hasOwn(item, key) && key.indexOf(propertyPrefix) !== -1) {
      return item[key];
    }
  }
}

function findReactProps(component) {
  if (!component)
    return void 0;
  if (component.memoizedProps)
    return component.memoizedProps;
  if (component._currentElement && component._currentElement.props)
    return component._currentElement.props;
}

function dispatchEvent(event, eventType, componentProps) {
  event.persist = function () {
    event.isPersistent = () => true;
  };
  if (componentProps[eventType]) {
    componentProps[eventType](event);
  }
}

function dispatchEvents(shadowRoot) {
  const removeEventListeners = [];

  reactEvents.forEach(function (reactEventName) {
    const nativeEventName = getNativeEventName(reactEventName);

    function retargetEvent(event) {
      const path = event.path || event.composedPath && event.composedPath() || composedPath(event.target);
      for (let i = 0; i < path.length; i++) {
        const el = path[i];
        const reactComponent = findReactComponent(el);
        const eventHandlers = findReactEventHandlers(el);
        const props = eventHandlers || findReactProps(reactComponent);

        if (reactComponent && props) {
          dispatchEvent(event, reactEventName, props);
        }

        if (reactComponent && props && mimickedReactEvents[reactEventName]) {
          dispatchEvent(event, mimickedReactEvents[reactEventName], props);
        }

        if (event.cancelBubble) {
          break;
        }

        if (el === shadowRoot) {
          break;
        }
      }
    }
    shadowRoot.addEventListener(nativeEventName, retargetEvent, false);
    removeEventListeners.push(function () {
      shadowRoot.removeEventListener(nativeEventName, retargetEvent, false);
    });
  });
  return function () {
    removeEventListeners.forEach(function (removeEventListener) {
      removeEventListener();
    });
  };
}