function getComponentName(reactElement) {
  if (typeof reactElement.type === 'function') {
    return reactElement.type.displayName || reactElement.type.name || 'Anonymous';
  }
  if (typeof reactElement.type === 'string') {
    return reactElement.type;
  }
  return '';
}

function getComponentKey(reactElement) {
  return reactElement.key;
}

function getChildren(reactElement) {
  if (reactElement.child) {
    const children = [];
    for (let child = reactElement.child; child; child = child.sibling) {
      children.push(child);
    }
    return children;
  }
  return [];
}

function getProps(reactElement) {
  const props = reactElement.memoizedProps;
  if (!props || typeof props === 'string') {
    return props;
  }
  const result = { ...props };
  delete result.children;
  return result;
}

export function buildComponentsTree(reactElement) {
  const treeNode = {
    key: getComponentKey(reactElement),
    name: getComponentName(reactElement),
    children: getChildren(reactElement).map(buildComponentsTree),
    rootElements: [],
    props: getProps(reactElement),
    state: reactElement.memoizedState
  };

  const rootElement = reactElement.stateNode;
  if (rootElement instanceof Element) {
    treeNode.rootElements.push(rootElement);
  } else {
    for (const child of treeNode.children) {
      treeNode.rootElements.push(...child.rootElements);
    }
  }
  return treeNode;
}

export function filterComponentsTree(treeNode, searchFn, result = []) {
  if (searchFn(treeNode)) {
    result.push(treeNode);
  }
  for (const child of treeNode.children) {
    filterComponentsTree(child, searchFn, result);
  }
  return result;
}

export function findReactRoots(root, roots = []) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  do {
    const node = walker.currentNode;
    if (node.hasOwnProperty('_reactRootContainer')) {
      roots.push(node._reactRootContainer._internalRoot.current);
    }

    // Pre-react 16: rely on `data-reactroot`
    // @see https://github.com/facebook/react/issues/10971
    if ((node instanceof Element) && node.hasAttribute('data-reactroot')) {
      for (const key of Object.keys(node)) {
        if (key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')) {
          roots.push(node[key]);
        }
      }
    }
    const shadowRoot = node instanceof Element ? node.shadowRoot : null;
    if (shadowRoot) {
      findReactRoots(shadowRoot, roots);
    }
  } while (walker.nextNode());
  return roots;
}