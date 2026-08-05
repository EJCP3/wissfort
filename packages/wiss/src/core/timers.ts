import { removeToast, subscribe } from './store';

interface TimerEntry {
  timer: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
}

const timers = new Map<string, TimerEntry>();

/**
 * Why the countdown is currently held. Pointer and keyboard are tracked
 * separately: with a single boolean, tabbing out of the action button
 * (`focusout`) resumed every timer even though the pointer was still
 * resting on the toast.
 */
export type PauseReason = 'pointer' | 'focus';
const pausedBy = new Set<PauseReason>();

function isPaused(): boolean {
  return pausedBy.size > 0;
}

// A toast can leave the store through paths that never call cancelDismiss:
// swipe-to-dismiss, the maxToasts overflow, clear(). Without this, their
// timers stay armed and later fire removeToast() on whatever toast has
// since taken that id.
subscribe((toasts) => {
  if (timers.size === 0) return;
  const live = new Set(toasts.map((t) => t.id));
  for (const id of [...timers.keys()]) {
    if (!live.has(id)) cancelDismiss(id);
  }
});

export function scheduleDismiss(id: string, durationMs: number): void {
  // Re-scheduling an id that already has a timer (toast.update, and every
  // promise that settles) must drop the old one — Map.set alone would leak
  // it, and the loading toast's 9999999ms timer would outlive the toast.
  cancelDismiss(id);

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return;
  }

  if (isPaused()) {
    timers.set(id, { timer: null, remaining: durationMs, startedAt: Date.now() });
    return;
  }

  const timer = setTimeout(() => {
    timers.delete(id);
    removeToast(id);
  }, durationMs);

  timers.set(id, { timer, remaining: durationMs, startedAt: Date.now() });
}

export function cancelDismiss(id: string): void {
  const entry = timers.get(id);
  if (!entry) {
    return;
  }

  if (entry.timer !== null) {
    clearTimeout(entry.timer);
  }
  timers.delete(id);
}

/** Cancel a pending auto-dismiss and drop the toast right away. */
export function dismissToast(id: string): void {
  cancelDismiss(id);
  removeToast(id);
}

export function pauseAll(reason: PauseReason = 'pointer'): void {
  const wasPaused = isPaused();
  pausedBy.add(reason);
  if (wasPaused) return;

  for (const [id, entry] of timers) {
    if (entry.timer === null) {
      continue;
    }

    clearTimeout(entry.timer);
    const elapsed = Date.now() - entry.startedAt;
    const remaining = entry.remaining - elapsed;

    timers.set(id, { timer: null, remaining, startedAt: entry.startedAt });
  }
}

export function resumeAll(reason: PauseReason = 'pointer'): void {
  pausedBy.delete(reason);
  if (isPaused()) return;

  for (const [id, entry] of timers) {
    if (entry.timer !== null) {
      continue;
    }

    if (entry.remaining <= 0) {
      timers.delete(id);
      removeToast(id);
      continue;
    }

    const startedAt = Date.now();
    const timer = setTimeout(() => {
      timers.delete(id);
      removeToast(id);
    }, entry.remaining);

    timers.set(id, { timer, remaining: entry.remaining, startedAt });
  }
}
