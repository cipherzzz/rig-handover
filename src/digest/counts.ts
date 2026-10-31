import type { NightDigest } from './types.js';

export type StatusCounts = { ok: number; retry: number; fail: number };

/** Counts of jobs by last status (one per row). */
export function statusCounts(digest: NightDigest): StatusCounts {
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of digest.rows) counts[row.lastStatus] += 1;
  return counts;
}
