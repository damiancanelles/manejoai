// Pure aggregation helpers for the Team member hours view - same spirit as
// invoiceStats.ts's monthly grouping, just day/week buckets of worked hours
// instead of month buckets of invoiced cents.

export interface StatsTimeEntry {
  clockIn: string;
  clockOut: string | null;
}

export interface TimeBucket {
  key: string; // sortable, e.g. "2026-03-14" (day) or the Monday of the week
  label: string;
  hours: number;
}

// An open entry (still clocked in) contributes 0 hours until it's closed.
function hoursOf(entry: StatsTimeEntry): number {
  if (!entry.clockOut) return 0;
  return (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3_600_000;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The Monday (local time, midnight) of the week `d` falls in. */
function weekStart(d: Date): Date {
  const day = d.getDay(); // 0 = Sun .. 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return monday;
}

/** Worked hours per calendar day, most recent first. */
export function groupByDay(entries: StatsTimeEntry[], locale = 'en-US'): TimeBucket[] {
  const byKey = new Map<string, TimeBucket>();
  for (const e of entries) {
    const d = new Date(e.clockIn);
    const key = dayKey(d);
    if (!byKey.has(key)) {
      byKey.set(key, { key, label: d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' }), hours: 0 });
    }
    byKey.get(key)!.hours += hoursOf(e);
  }
  return [...byKey.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/** Worked hours per Monday-start week, most recent first. */
export function groupByWeek(entries: StatsTimeEntry[], locale = 'en-US'): TimeBucket[] {
  const byKey = new Map<string, TimeBucket>();
  for (const e of entries) {
    const monday = weekStart(new Date(e.clockIn));
    const key = dayKey(monday);
    if (!byKey.has(key)) {
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      const label = `${monday.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
      byKey.set(key, { key, label, hours: 0 });
    }
    byKey.get(key)!.hours += hoursOf(e);
  }
  return [...byKey.values()].sort((a, b) => b.key.localeCompare(a.key));
}
