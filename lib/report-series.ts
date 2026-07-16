import { LINKEDIN_METRICS, SIGNAL_METRICS } from "./tiers";

// Shared helpers for the over-time chart, so studio and portal aggregate and
// label periods identically. Granularity: monthly, quarterly, or yearly.
export type Granularity = "monthly" | "quarterly" | "yearly";
export type UploadRow = { period: string; metric_key: string; value: number | null };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Rate metrics (percent) are averaged across a bucket; counts are summed.
const RATE_KEYS = new Set(
  [...LINKEDIN_METRICS, ...SIGNAL_METRICS].filter(m => m.unit === "percent").map(m => m.key)
);

export function yearsIn(rows: UploadRow[]): string[] {
  return [...new Set(rows.map(r => r.period.split("-")[0]).filter(Boolean))].sort();
}

// The bucket a given month falls into, for the chosen granularity.
function bucketOf(period: string, gran: Granularity, year: string): { key: string; label: string } {
  const [y, m] = period.split("-");
  if (gran === "yearly") return { key: y, label: y };
  if (gran === "quarterly") {
    const q = Math.floor((Number(m) - 1) / 3) + 1;
    return { key: `${y}-Q${q}`, label: `Q${q} '${y.slice(2)}` };
  }
  return { key: period, label: MONTHS[Number(m) - 1] + (year === "all" ? ` '${y.slice(2)}` : "") };
}

// The full ordered set of buckets to show on the axis, including empty ones so
// every month (or quarter/year) appears, not only the ones that have data.
function displayKeys(rows: UploadRow[], gran: Granularity, year: string): { key: string; label: string }[] {
  const periods = rows.map(r => r.period);
  if (!periods.length) return [];

  if (gran === "yearly") {
    const ys = periods.map(p => Number(p.split("-")[0]));
    const min = Math.min(...ys), max = Math.max(...ys);
    const out = [];
    for (let y = min; y <= max; y++) out.push({ key: String(y), label: String(y) });
    return out;
  }

  if (gran === "quarterly") {
    if (year !== "all") return [1, 2, 3, 4].map(q => ({ key: `${year}-Q${q}`, label: `Q${q} '${year.slice(2)}` }));
    const idx = (p: string) => { const [y, m] = p.split("-").map(Number); return y * 4 + Math.floor((m - 1) / 3); };
    const min = Math.min(...periods.map(idx)), max = Math.max(...periods.map(idx));
    const out = [];
    for (let i = min; i <= max; i++) { const y = Math.floor(i / 4); const q = (i % 4) + 1; out.push({ key: `${y}-Q${q}`, label: `Q${q} '${String(y).slice(2)}` }); }
    return out;
  }

  // monthly — a specific year shows all 12 months; "all" shows the full span.
  if (year !== "all") return Array.from({ length: 12 }, (_, i) => ({ key: `${year}-${String(i + 1).padStart(2, "0")}`, label: MONTHS[i] }));
  const idx = (p: string) => { const [y, m] = p.split("-").map(Number); return y * 12 + (m - 1); };
  const min = Math.min(...periods.map(idx)), max = Math.max(...periods.map(idx));
  const out = [];
  for (let i = min; i <= max; i++) { const y = Math.floor(i / 12); const m = i % 12; out.push({ key: `${y}-${String(m + 1).padStart(2, "0")}`, label: MONTHS[m] + ` '${String(y).slice(2)}` }); }
  return out;
}

// Build chart rows aggregated by granularity, optionally filtered to one year.
// Every bucket in range is present (empty ones carry no metric keys), oldest first.
export function buildSeries(rows: UploadRow[], gran: Granularity, year: string) {
  const filtered = year === "all" ? rows : rows.filter(r => r.period.startsWith(`${year}-`));

  const buckets: Record<string, Record<string, { sum: number; n: number }>> = {};
  for (const r of filtered) {
    if (r.value == null) continue;
    const key = bucketOf(r.period, gran, year).key;
    const sums = (buckets[key] ||= {});
    const s = (sums[r.metric_key] ||= { sum: 0, n: 0 });
    s.sum += r.value;
    s.n += 1;
  }

  return displayKeys(filtered, gran, year).map(({ key, label }) => {
    const row: Record<string, number | string> = { period: label };
    const sums = buckets[key];
    if (sums) for (const [k, s] of Object.entries(sums)) {
      row[k] = RATE_KEYS.has(k) ? Number((s.sum / s.n).toFixed(2)) : s.sum;
    }
    return row;
  });
}
