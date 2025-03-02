export function parseAttributeSelector(selector, allowUnquotedStrings) {
  let wp = 0;
  let EOL = selector.length === 0;
  const next = () => selector[wp] || '';
  const eat1 = () => {
    const result = next();
    ++wp;
    EOL = wp >= selector.length;
    return result;
  };
  const syntaxError = (stage) => {
    if (EOL) {
      throw new Error(`Unexpected end of selector while parsing selector \`${selector}\``);
    }
    throw new Error(
      `Error while parsing selector \`${selector}\` - unexpected symbol "${next()}" at position ${wp}` +
        (stage ? ' during ' + stage : '')
    );
  };
  function skipSpaces() {
    while (!EOL && /\s/.test(next())) {
      eat1();
    }
  }
  function isCSSNameChar(char) {
    // https://www.w3.org/TR/css-syntax-3/#ident-token-diagram
    return (
      char >= '\u0080' || // non-ascii
      (char >= '\u0030' && char <= '\u0039') || // digit
      (char >= '\u0041' && char <= '\u005a') || // uppercase letter
      (char >= '\u0061' && char <= '\u007a') || // lowercase letter
      (char >= '\u0030' && char <= '\u0039') || // digit
      char === '\u005f' || // "_"
      char === '\u002d'
    ); // "-"
  }
  function readIdentifier() {
    let result = '';
    skipSpaces();
    while (!EOL && isCSSNameChar(next())) {
      result += eat1();
    }
    return result;
  }
  function readQuotedString(quote) {
    let result = eat1();
    if (result !== quote) {
      syntaxError('parsing quoted string');
    }
    while (!EOL && next() !== quote) {
      if (next() === '\\') {
        eat1();
      }
      result += eat1();
    }
    if (next() !== quote) {
      syntaxError('parsing quoted string');
    }
    result += eat1();
    return result;
  }
  function readRegularExpression() {
    if (eat1() !== '/') {
      syntaxError('parsing regular expression');
    }
    let source = '';
    let inClass = false;
    // https://262.ecma-international.org/11.0/#sec-literals-regular-expression-literals
    while (!EOL) {
      if (next() === '\\') {
        source += eat1();
        if (EOL) {
          syntaxError('parsing regular expressiion');
        }
      } else if (inClass && next() === ']') {
        inClass = false;
      } else if (!inClass && next() === '[') {
        inClass = true;
      } else if (!inClass && next() === '/') {
        break;
      }
      source += eat1();
    }
    if (eat1() !== '/') {
      syntaxError('parsing regular expression');
    }
    let flags = '';
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    while (!EOL && next().match(/[dgimsuy]/)) {
      flags += eat1();
    }
    try {
      return new RegExp(source, flags);
    } catch (e) {
      throw new Error(`Error while parsing selector \`${selector}\`: ${e.message}`);
    }
  }

  function readAttributeToken() {
    let token = '';
    skipSpaces();
    if (next() === "'" || next() === '"') {
      token = readQuotedString(next()).slice(1, -1);
    } else {
      token = readIdentifier();
    }
    if (!token) {
      syntaxError('parsing property path');
    }
    return token;
  }

  function readOperator() {
    skipSpaces();
    let op = '';
    if (!EOL) {
      op += eat1();
    }
    if (!EOL && op !== '=') {
      op += eat1();
    }
    if (!['=', '*=', '^=', '$=', '|=', '~='].includes(op)) {
      syntaxError('parsing operator');
    }
    return op;
  }

  function readAttribute() {
    // skip leading [
    eat1();
    // read attribute name:
    // foo.bar
    // 'foo'  . "ba zz"
    const jsonPath = [];
    jsonPath.push(readAttributeToken());
    skipSpaces();
    while (next() === '.') {
      eat1();
      jsonPath.push(readAttributeToken());
      skipSpaces();
    }
    // check property is truthy: [enabled]
    if (next() === ']') {
      eat1();
      return {
        name: jsonPath.join('.'),
        jsonPath,
        op: '<truthy>',
        value: null,
        caseSensitive: false,
      };
    }
    const operator = readOperator();
    let value;
    let caseSensitive = true;
    skipSpaces();
    if (next() === '/') {
      if (operator !== '=') {
        throw new Error(
          `Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with regular expression`
        );
      }
      value = readRegularExpression();
    } else if (next() === "'" || next() === '"') {
      value = readQuotedString(next()).slice(1, -1);
      skipSpaces();
      if (next() === 'i' || next() === 'I') {
        caseSensitive = false;
        eat1();
      } else if (next() === 's' || next() === 'S') {
        caseSensitive = true;
        eat1();
      }
    } else {
      value = '';
      while (!EOL && (isCSSNameChar(next()) || next() === '+' || next() === '.')) {
        value += eat1();
      }
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else {
        if (!allowUnquotedStrings) {
          value = +value;
          if (Number.isNaN(value)) {
            syntaxError('parsing attribute value');
          }
        }
      }
    }
    skipSpaces();
    if (next() !== ']') {
      syntaxError('parsing attribute value');
    }
    eat1();
    if (operator !== '=' && typeof value !== 'string') {
      throw new Error(
        `Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with non-string matching value - ${value}`
      );
    }
    return { name: jsonPath.join('.'), jsonPath, op: operator, value, caseSensitive };
  }

  const result = {
    name: '',
    attributes: [],
  };

  result.name = readIdentifier();
  skipSpaces();
  while (next() === '[') {
    result.attributes.push(readAttribute());
    skipSpaces();
  }
  if (!EOL) {
    syntaxError(void 0);
  }
  if (!result.name && !result.attributes.length) {
    throw new Error(`Error while parsing selector \`${selector}\` - selector cannot be empty`);
  }
  return result;
}

export function matchesAttributePart(value, attr) {
  const objValue = typeof value === 'string' && !attr.caseSensitive ? value.toUpperCase() : value;
  const attrValue =
    typeof attr.value === 'string' && !attr.caseSensitive ? attr.value.toUpperCase() : attr.value;
  if (attr.op === '<truthy>') {
    return !!objValue;
  }
  if (attr.op === '=') {
    if (attrValue instanceof RegExp) {
      return typeof objValue === 'string' && !!objValue.match(attrValue);
    }
    return objValue === attrValue;
  }
  if (typeof objValue !== 'string' || typeof attrValue !== 'string') {
    return false;
  }
  if (attr.op === '*=') {
    return objValue.includes(attrValue);
  }
  if (attr.op === '^=') {
    return objValue.startsWith(attrValue);
  }
  if (attr.op === '$=') {
    return objValue.endsWith(attrValue);
  }
  if (attr.op === '|=') {
    return objValue === attrValue || objValue.startsWith(attrValue + '-');
  }
  if (attr.op === '~=') {
    return objValue.split(' ').includes(attrValue);
  }
  return false;
}

export function matchesComponentAttribute(obj, attr) {
  for (const token of attr.jsonPath) {
    if (obj !== void 0 && obj !== null) {
      obj = obj[token];
    }
  }
  return matchesAttributePart(obj, attr);
}

export function parentElementOrShadowHost(element) {
  if (element.parentElement) {
    return element.parentElement;
  }
  if (!element.parentNode) {
    return;
  }
  if (
    element.parentNode.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */ &&
    element.parentNode.host
  ) {
    return element.parentNode.host;
  }
}

function enclosingShadowHost(element) {
  while (element.parentElement) {
    element = element.parentElement;
  }
  return parentElementOrShadowHost(element);
}

export function isInsideScope(scope, element) {
  while (element) {
    if (scope.contains(element)) {
      return true;
    }
    element = enclosingShadowHost(element);
  }
  return false;
}

export function closestCrossShadow(element, css) {
  while (element) {
    const closest = element.closest(css);
    if (closest) {
      return closest;
    }
    element = enclosingShadowHost(element);
  }
}

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
  return reactElement.key ?? reactElement._currentElement?.key;
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

function buildComponentsTree(reactElement) {
  const treeNode = {
    key: getComponentKey(reactElement),
    name: getComponentName(reactElement),
    children: getChildren(reactElement).map(buildComponentsTree),
    rootElements: [],
    props: getProps(reactElement),
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
function filterComponentsTree(treeNode, searchFn, result = []) {
  if (searchFn(treeNode)) {
    result.push(treeNode);
  }
  for (const child of treeNode.children) {
    filterComponentsTree(child, searchFn, result);
  }
  return result;
}

function findReactRoots(root, roots = []) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  do {
    const node = walker.currentNode;
    // ReactDOM Legacy client API:
    // @see https://github.com/baruchvlz/resq/blob/5c15a5e04d3f7174087248f5a158c3d6dcc1ec72/src/utils.js#L329
    if (node.hasOwnProperty('_reactRootContainer')) {
      roots.push(node._reactRootContainer._internalRoot.current);
    } else {
      // React 17+
      // React sets rootKey when mounting
      // @see https://github.com/facebook/react/blob/a724a3b578dce77d427bef313102a4d0e978d9b4/packages/react-dom/src/client/ReactDOMComponentTree.js#L62-L64
      const rootKey = Object.keys(node).find((key) => key.startsWith('__reactContainer'));
      if (rootKey) {
        roots.push(node[rootKey].stateNode.current);
      }
    }
    // Pre-react 16: rely on `data-reactroot`
    // @see https://github.com/facebook/react/issues/10971
    if (node instanceof Element && node.hasAttribute('data-reactroot')) {
      for (const key of Object.keys(node)) {
        // @see https://github.com/baruchvlz/resq/blob/5c15a5e04d3f7174087248f5a158c3d6dcc1ec72/src/utils.js#L334
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

export const ReactEngine = {
  queryAll(scope, selector) {
    const { name, attributes } = parseAttributeSelector(selector, false);
    const reactRoots = findReactRoots(document);
    const trees = reactRoots.map((reactRoot) => buildComponentsTree(reactRoot));
    const treeNodes = trees
      .map((tree) =>
        filterComponentsTree(tree, (treeNode) => {
          const props = treeNode.props ?? {};
          if (treeNode.key !== void 0) {
            props.key = treeNode.key;
          }
          if (name && treeNode.name !== name) {
            return false;
          }
          if (treeNode.rootElements.some((domNode) => !isInsideScope(scope, domNode))) {
            return false;
          }
          for (const attr of attributes) {
            if (!matchesComponentAttribute(props, attr)) {
              return false;
            }
          }
          return true;
        })
      )
      .flat();

    const allRootElements = new Set();
    for (const treeNode of treeNodes) {
      for (const domNode of treeNode.rootElements) {
        allRootElements.add(domNode);
      }
    }
    return [...allRootElements];
  },
};
