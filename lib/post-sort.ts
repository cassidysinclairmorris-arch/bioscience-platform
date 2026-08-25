// One ordering for posts, used by every view in both portals so a date change
// moves a post to the same place in the Calendar, the Library, and the client's
// approval queue.
//
// Work you still have to do comes first, in the order it happens:
//
//   1. Not yet published, soonest scheduled date first.
//   2. Not yet published with no date set, after those, newest activity first.
//   3. Already published, most recent first, below the live queue.
//
// Published posts read backwards from today because that is how you review
// them; unpublished posts read forwards because that is the order they go out.

type SortablePost = {
  status?: string | null;
  scheduled_at?: string | null;
  posted_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  id?: number;
};

// Timestamps are stored either as a datetime-local value ("2026-09-14T10:30")
// or as SQLite text ("2026-09-14 10:30:00"). Normalising the separator makes
// them directly comparable as strings.
function key(v: string | null | undefined): string | null {
  if (!v) return null;
  return String(v).replace(" ", "T");
}

// The date a post is placed by: when it is set to go live, else when it did.
function scheduleKey(p: SortablePost): string | null {
  return key(p.scheduled_at) ?? key(p.posted_at);
}

function activityKey(p: SortablePost): string {
  return key(p.updated_at) ?? key(p.created_at) ?? "";
}

// 0 upcoming and dated, 1 upcoming and undated, 2 published.
function bucket(p: SortablePost): 0 | 1 | 2 {
  if (p.status === "posted") return 2;
  return scheduleKey(p) ? 0 : 1;
}

export function comparePostsBySchedule(a: SortablePost, b: SortablePost): number {
  const ba = bucket(a);
  const bb = bucket(b);
  if (ba !== bb) return ba - bb;

  if (ba === 0) {
    // Upcoming: soonest first.
    const ka = scheduleKey(a)!;
    const kb = scheduleKey(b)!;
    if (ka !== kb) return ka < kb ? -1 : 1;
  } else if (ba === 2) {
    // Published: most recent first.
    const ka = scheduleKey(a) ?? "";
    const kb = scheduleKey(b) ?? "";
    if (ka !== kb) return ka > kb ? -1 : 1;
  }

  // Same slot, or both undated: newest activity first.
  const ua = activityKey(a);
  const ub = activityKey(b);
  if (ua !== ub) return ua > ub ? -1 : 1;

  return (b.id ?? 0) - (a.id ?? 0);
}

export function sortPostsBySchedule<T extends SortablePost>(posts: T[]): T[] {
  return [...posts].sort(comparePostsBySchedule);
}
