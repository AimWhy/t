export function getBoundingRect(node) {
  const rect = node.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function setupIntersectionObserver(targets, callback, options) {
  const rectRatioCache = new Map();
  targets.forEach(target => {
    rectRatioCache.set(target, {
      rect: getBoundingRect(target),
      ratio: 0,
    });
  });
  const handleIntersection = (entries) => {
    entries.forEach(entry => {
      const { boundingClientRect, intersectionRatio, target } = entry;
      rectRatioCache.set(target, {
        rect: {
          x: boundingClientRect.left,
          y: boundingClientRect.top,
          width: boundingClientRect.width,
          height: boundingClientRect.height,
        },
        ratio: intersectionRatio,
      });
    });
    callback(Array.from(rectRatioCache.values()));
  };
  const observer = new IntersectionObserver(handleIntersection, options);
  targets.forEach(target => {
    observer.observe(target);
  });
  return {
    disconnect: () => observer.disconnect(),
    observe: target => {
      rectRatioCache.set(target, {
        rect: getBoundingRect(target),
        ratio: 0,
      });
      observer.observe(target);
    },
    unobserve: target => {
      rectRatioCache.delete(target);
      observer.unobserve(target);
    },
  };
}
