// One app-wide scheduler, independent of the currently visible receipt screen.
export function startReceiptSyncSession({ queue, sync, assertAccount, subscribeNetwork, subscribeAppState, getAppState, interval = setInterval, clear = clearInterval, retryMs = 30000 }) {
  let stopped = false, running = false, online = true;
  const guard = () => { if (stopped) throw new Error("The receipt account changed."); assertAccount(); };
  const trigger = async () => {
    if (stopped || running || !online || getAppState() !== "active") return;
    running = true;
    try {
      guard();
      const rows = await queue.list();
      guard();
      if (rows.some((row) => row.phase !== "sent" && row.uploadRequested)) await sync(guard);
    } catch { /* The durable queue retains its error and original operation for the receipt screen. */ }
    finally { running = false; }
  };
  const stopNetwork = subscribeNetwork((state) => { online = state.isConnected !== false && state.isInternetReachable !== false; if (online) trigger(); });
  const stopAppState = subscribeAppState((state) => { if (state === "active") trigger(); });
  const timer = interval(trigger, retryMs);
  trigger();
  return () => { stopped = true; stopNetwork(); stopAppState(); clear(timer); };
}
