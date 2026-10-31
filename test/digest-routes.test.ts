import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function appWithRuns(runsDir: string) {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
}

describe('digest routes', () => {
  const fixture = appWithRuns('runs');

  it('GET /digest/2026-10-28 renders the jobs', async () => {
    const res = await fixture.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest · 2026-10-28');
    expect(html).toContain('notes/backup');
    expect(html).toContain('digest/render');
    expect(html).toContain('—'); // null owner
  });

  it('GET /api/digest/2026-10-28 matches page job order', async () => {
    const page = await (await fixture.request('/digest/2026-10-28')).text();
    const json = (await (await fixture.request('/api/digest/2026-10-28')).json()) as { job: string }[];
    expect(json.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    for (const job of json.map((r) => r.job)) expect(page).toContain(job);
    // same order in the page table body
    let pos = 0;
    for (const job of json.map((r) => r.job)) {
      const next = page.indexOf(job, pos);
      expect(next).toBeGreaterThan(pos);
      pos = next;
    }
  });

  it('404 when the night file is missing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    const app = appWithRuns(dir);
    expect((await app.request('/digest/2026-10-28')).status).toBe(404);
    expect((await app.request('/api/digest/2026-10-28')).status).toBe(404);
  });

  it('empty night renders nothing ran', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-10-28.jsonl'), '');
    const app = appWithRuns(dir);
    const res = await app.request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
    expect(await (await app.request('/api/digest/2026-10-28')).json()).toEqual([]);
  });

  it('night with a bad line still renders', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(
      join(dir, '2026-10-28.jsonl'),
      [
        '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
        '{not json',
        '',
      ].join('\n'),
    );
    const app = appWithRuns(dir);
    const html = await (await app.request('/digest/2026-10-28')).text();
    expect(html).toContain('rig/rotate-logs');
    expect(html).toContain('1 bad line');
    const rows = await (await app.request('/api/digest/2026-10-28')).json();
    expect(rows).toHaveLength(1);
  });
});

describe('status board digest links', () => {
  it('links both nights on disk to a digest', async () => {
    const res = await appWithRuns('runs').request('/');
    const html = await res.text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toMatch(/ok\s*\/\s*\d+\s*retry\s*\/\s*\d+\s*fail/);
  });
});
