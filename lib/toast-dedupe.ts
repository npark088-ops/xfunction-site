// Client-side "have I already shown this toast today" tracking for
// triggers that don't need server-side history — just enough to keep
// a celebration/reminder from repeating every time the same page
// loads. Shared by components/ToastWatcher.tsx and any page-level
// trigger (e.g. the Grades page's "grade trending up" toast).
function todayKey(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`;
}

export function alreadyShownToday(prefix: string): boolean {
  try {
    return localStorage.getItem(todayKey(prefix)) === "1";
  } catch {
    return false;
  }
}

export function markShownToday(prefix: string) {
  try {
    localStorage.setItem(todayKey(prefix), "1");
  } catch {
    // Private browsing or storage disabled — worst case a toast can
    // reappear next load, which is harmless.
  }
}
