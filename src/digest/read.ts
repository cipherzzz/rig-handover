import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, NightDigest, ReadNight } from './types.js';

type LogLine = {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error?: string;
};

function isJobStatus(v: unknown): v is JobStatus {
  return v === 'ok' || v === 'retry' || v === 'fail';
}

function parseLine(raw: string): LogLine | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string' || !isJobStatus(o.status)) {
    return null;
  }
  if (!(o.owner === null || typeof o.owner === 'string')) return null;
  const line: LogLine = {
    at: o.at,
    job: o.job,
    status: o.status,
    owner: o.owner,
  };
  if (typeof o.error === 'string') line.error = o.error;
  return line;
}

export const readNight: ReadNight = (runsDir, night) => {
  const path = join(runsDir, `${night}.jsonl`);
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return null;
  }

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const raw of text.split('\n')) {
    if (raw === '') continue;
    const line = parseLine(raw);
    if (!line) {
      badLines += 1;
      continue;
    }
    const existing = byJob.get(line.job);
    if (!existing) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error ?? null,
        firstAt: line.at,
        lastAt: line.at,
      });
      continue;
    }
    existing.runs += 1;
    if (line.status === 'retry') existing.retries += 1;
    existing.owner = line.owner;
    existing.lastStatus = line.status;
    existing.lastError = line.error ?? null;
    existing.lastAt = line.at;
  }

  const rows = [...byJob.values()].sort((a, b) => a.job.localeCompare(b.job));
  return { night, rows, badLines };
};
