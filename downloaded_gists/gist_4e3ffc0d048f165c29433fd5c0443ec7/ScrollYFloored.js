// A memoized constant fn prevents unsubscribe/resubscribe
// In practice it is not a big deal
function subscribe(onStoreChange) {
  global.window?.addEventListener("scroll", onStoreChange);
  return () =>
    global.window?.removeEventListener(
      "scroll",
      onStoreChange
    );
}

function useScrollY(selector = (id) => id) {
  return useSyncExternalStore(
    subscribe,
    () => selector(global.window?.scrollY),
    () => undefined
  );
}

function ScrollY() {
  const scrollY = useScrollY();
  return <div>{scrollY}</div>;
}

function ScrollYFloored() {
  const to = 100;
  const scrollYFloored = useScrollY((y) =>
    y ? Math.floor(y / to) * to : undefined
  );
  return <div>{scrollYFloored}</div>;
}