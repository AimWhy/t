const config = { attributes: true, childList: true, subtree: true };

const traverseFiber = (fiber, call, param1) => {
  if (fiber) {
    call(fiber, param1);
    let child = fiber.child;
    while (child) {
      traverseFiber(child, call, param1);
      child = child.sibling;
    }
  }
}

const addClass = (fiber, className) => {
  if (fiber.stateNode && fiber.stateNode.containerInfo) {
    fiber.stateNode.containerInfo.classList.toggle(className, true);
  }
  if (fiber.stateNode && fiber.stateNode.classList) {
    fiber.stateNode.classList.toggle(className, true);
  }
}

const storageArr = [];

const callback = () => {
  for (const [selector, className] of storageArr) {
    const targetNode = document.querySelector(selector);
    if (!targetNode) {
      return;
    }
    const nodeFiberKey = Object.keys(targetNode).find(
      (key) => key.startsWith("__reactContainere$") || key.startsWith("__reactInternalInstance$")
    );
    if (!nodeFiberKey) {
      return;
    }
    const hash = nodeFiberKey.split('$')[1];
    const rootFiber = targetNode[`__reactContainere$${hash}`] || targetNode[`__reactInternalInstance$${hash}`];
    traverseFiber(rootFiber, addClass, className);
  }
};

const observer = new MutationObserver(callback);
observer.observe(document.body, config);

export const scopeFix = (selector = '[class^="layoutBody"]', className = 'why') => {
  storageArr.push([selector, className]);
};

scopeFix();
scopeFix('#workflow-create', 'nll');