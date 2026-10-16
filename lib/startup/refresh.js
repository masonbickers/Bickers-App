export function createRefreshCoalescer({ refresh, schedule = setTimeout, cancel = clearTimeout }) {
  let timer = null, disposed = false;
  return {
    request() {
      if (disposed || timer !== null) return;
      timer = schedule(() => { timer = null; if (!disposed) refresh(); }, 250);
    },
    dispose() { disposed = true; if (timer !== null) cancel(timer); timer = null; },
  };
}
