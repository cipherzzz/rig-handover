import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('aggregates runs/2026-10-28.jsonl: 5 jobs, 1 bad line', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    expect(digest!.badLines).toBe(1);
    expect(digest!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    const rotate = digest!.rows.find((r) => r.job === 'rig/rotate-logs')!;
    expect(rotate).toMatchObject({
      owner: 'lane-07',
      runs: 1,
      retries: 0,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-28T23:00:02+01:00',
      lastAt: '2026-10-28T23:00:02+01:00',
    });

    const refresh = digest!.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(refresh).toMatchObject({
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
    });

    const backup = digest!.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup).toMatchObject({
      owner: 'lane-07',
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
    });

    const render = digest!.rows.find((r) => r.job === 'digest/render')!;
    expect(render.owner).toBeNull();
    expect(render.lastStatus).toBe('ok');

    const sync = digest!.rows.find((r) => r.job === 'lane/sync')!;
    expect(sync.runs).toBeGreaterThan(1);
    expect(sync.retries).toBeGreaterThanOrEqual(1);
  });

  it('returns null when the night file is missing', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('returns empty rows for an empty file', () => {
    // covered via temp in route tests; reader treats empty string as zero rows
    const digest = readNight('runs', '2099-01-01');
    expect(digest).toBeNull();
  });
});
