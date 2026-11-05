// Anonymous feature counters for the owner's admin panel (see public/jt-stats.js).
// Counting must never break the app, so every call is wrapped and does nothing when the script isn't there.
type Counter = { jtEvent?: (name: string, value?: number) => void; jtFeedback?: () => void };

export function trackEvent(name: string, value?: number) {
  try {
    if (typeof window === "undefined") return;
    (window as unknown as Counter).jtEvent?.(name, value);
  } catch {
    /* ignore */
  }
}

export function openFeedback() {
  try {
    if (typeof window === "undefined") return;
    (window as unknown as Counter).jtFeedback?.();
  } catch {
    /* ignore */
  }
}
