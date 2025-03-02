export default class Utilities {
  static escape(s) {
    return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  static onRemoved(node, callback) {
    const observer = new MutationObserver((mutations) => {
      for (let m = 0; m < mutations.length; m++) {
        const mutation = mutations[m];
        const nodes = Array.from(mutation.removedNodes);
        const directMatch = nodes.indexOf(node) > -1;
        const parentMatch = nodes.some(parent => parent.contains(node));
        if (directMatch || parentMatch) {
          observer.disconnect();
          callback();
        }
      }
    });

    observer.observe(document.body, { subtree: true, childList: true });
  }

  static onAdded(selector, callback) {
    if (document.body.querySelector(selector)) {
      return callback(document.body.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      for (let m = 0; m < mutations.length; m++) {
        for (let i = 0; i < mutations[m].addedNodes.length; i++) {
          const mutation = mutations[m].addedNodes[i];
          if (mutation.nodeType !== 3) {
            const directMatch = mutation.matches(selector) && mutation;
            const childrenMatch = mutation.querySelector(selector);
            if (directMatch || childrenMatch) {
              observer.disconnect();
              return callback(directMatch ?? childrenMatch);
            }
          }
        }
      }
    });

    observer.observe(document.body, { subtree: true, childList: true });

    return () => { observer.disconnect(); };
  }

  static findInTree(tree, searchFilter, { walkable = null, ignore = [] } = {}) {
    if (typeof searchFilter === "string") {
      if (tree.hasOwnProperty(searchFilter)) {
        return tree[searchFilter];
      }
    } else if (searchFilter(tree)) {
      return tree;
    }

    if (typeof tree !== "object" || tree == null) {
      return undefined;
    }

    let tempReturn;
    if (tree instanceof Array) {
      for (const value of tree) {
        tempReturn = this.findInTree(value, searchFilter, { walkable, ignore });
        if (typeof tempReturn != "undefined") {
          return tempReturn;
        }
      }
    } else {
      const toWalk = walkable == null ? Object.keys(tree) : walkable;
      for (const key of toWalk) {
        if (typeof tree[key] !== "undefined" && !ignore.includes(key)) {

          tempReturn = this.findInTree(tree[key], searchFilter, { walkable, ignore });
          if (typeof tempReturn != "undefined") {
            return tempReturn;
          }
        }
      }
    }
    return tempReturn;
  }

  /**
   * Finds a value, subobject, or array from a tree that matches a specific filter. Great for patching render functions.
   * @param {object} tree React tree to look through. Can be a rendered object or an internal instance.
   * @param {callable} searchFilter Filter function to check subobjects against.
   */

  static findInRenderTree(tree, searchFilter, { walkable = ["props", "children", "child", "sibling"], ignore = [] } = {}) {
    return this.findInTree(tree, searchFilter, { walkable, ignore });
  }

  /**
   * Finds a value, subobject, or array from a tree that matches a specific filter. Great for patching render functions.
   * @param {object} tree React tree to look through. Can be a rendered object or an internal instance.
   * @param {callable} searchFilter Filter function to check subobjects against.
   */

  static findInReactTree(tree, searchFilter) {
    return this.findInTree(tree, searchFilter, { walkable: ["props", "children", "return", "stateNode"] });
  }

  static getReactInstance(node) {
    if (node.__reactInternalInstance$) {
      return node.__reactInternalInstance$;
    }
    return node[Object.keys(node).find(k => k.startsWith("__reactInternalInstance") || k.startsWith("__reactFiber"))] || null;
  }

  /**
   * Grabs a value from the react internal instance. Allows you to grab
   * long depth values safely without accessing no longer valid properties.
   * @param {HTMLElement} node - node to obtain react instance of
   * @param {object} options - options for the search
   * @param {array} [options.include] - list of items to include from the search
   * @param {array} [options.exclude=["Popout", "Tooltip", "Scroller", "BackgroundFlash"]] - list of items to exclude from the search
   * @param {callable} [options.filter=_=>_] - filter to check the current instance with (should return a boolean)
   * @return {(*|null)} the owner instance or undefined if not found.
   */
  static getOwnerInstance(node, { include, exclude = ["Popout", "Tooltip", "Scroller", "BackgroundFlash"], filter = _ => _ } = {}) {
    if (node === undefined) return undefined;
    const excluding = include === undefined;
    const nameFilter = excluding ? exclude : include;

    function getDisplayName(owner) {
      const type = owner.type;
      if (!type) return null;
      return type.displayName || type.name || null;
    }

    function classFilter(owner) {
      const name = getDisplayName(owner);
      return (name !== null && !!(nameFilter.includes(name) ^ excluding));
    }

    let curr = this.getReactInstance(node);
    for (curr = curr && curr.return; curr !== null; curr = curr.return) {
      const owner = curr.stateNode;
      if (!(owner instanceof HTMLElement) && classFilter(curr) && filter(owner)) {
        return owner;
      }
    }

    return null;
  }
}