const phases = new Set(['local-restore', 'first-saved-layout', 'clerk-restore', 'clerk-token', 'bridge', 'firebase-sign-in', 'access', 'terms', 'first-fresh-layout']);
const outcomes = new Set(['ok', 'error', 'cancelled']);
export function createStartupTimings({ now = () => globalThis.performance?.now?.() ?? Date.now(), emit = () => {} } = {}) {
  let start = now(), elapsed = 0, count = 0, cycle = 0, kind = 'cold';
  const marks = new Set();
  const sample = () => { elapsed = Math.max(elapsed, Number(now() - start) || 0); return Math.round(elapsed); };
  const record = (phase, outcome, durationMs) => {
    if (!phases.has(phase) || !outcomes.has(outcome) || count >= 32) return;
    const value = { kind, phase, outcome, elapsedMs: sample(), ...(durationMs == null ? {} : { durationMs }) };
    count++; try { emit(value); } catch { /* Diagnostics never block startup. */ }
  };
  return {
    mark(phase, outcome = 'ok') { if (marks.has(phase) || !phases.has(phase) || !outcomes.has(outcome)) return; marks.add(phase); record(phase, outcome); },
    /** @template T @param {string} phase @param {() => Promise<T>} operation @returns {Promise<T>} */
    async measure(phase, operation) {
      const began = sample(), capturedCycle = cycle;
      try { const result = await operation(); if (cycle === capturedCycle) record(phase, 'ok', sample() - began); return result; }
      catch (error) { if (cycle === capturedCycle) record(phase, error?.name === 'AbortError' ? 'cancelled' : 'error', sample() - began); throw error; }
    },
    reset(next = 'cold') { cycle++; kind = next === 'foreground' ? 'foreground' : 'cold'; start = now(); elapsed = 0; count = 0; marks.clear(); },
  };
}
let cycleStartedAt = Date.now();
const localDiagnostics = (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_CLERK_DEPLOYMENT_ROLE === 'pilot';
export const startupTimings = createStartupTimings({ emit: record => { if (localDiagnostics) console.info('[startup]', JSON.stringify(record)); } });
export function beginForegroundTimings() { cycleStartedAt = Date.now(); startupTimings.reset('foreground'); }
export const isFreshInStartupCycle = updatedAt => Number.isFinite(updatedAt) && updatedAt >= cycleStartedAt;
