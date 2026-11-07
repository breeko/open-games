interface Lifecycle {
  document: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

/** The game captures a consistent snapshot; this helper only schedules saves. */
export function startAutosave(save: () => void, options: { intervalMs?: number; lifecycle?: Lifecycle } = {}) {
  const lifecycle = options.lifecycle ?? { document, window };
  const intervalMs = options.intervalMs ?? 2000;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) throw new Error('Autosave interval must be positive');
  let stopped = false;
  const flush = () => { if (!stopped) save(); };
  const onVisibility = () => { if (lifecycle.document.hidden) flush(); };
  const timer = setInterval(flush, intervalMs);
  lifecycle.document.addEventListener('visibilitychange', onVisibility);
  lifecycle.window.addEventListener('pagehide', flush);
  return {
    flush,
    stop() {
      stopped = true;
      clearInterval(timer);
      lifecycle.document.removeEventListener('visibilitychange', onVisibility);
      lifecycle.window.removeEventListener('pagehide', flush);
    },
  };
}
