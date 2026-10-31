import type { DigestRow, NightDigest } from '../digest/types.js';

function markRow(row: DigestRow): boolean {
  return row.lastStatus === 'fail' || row.retries >= 3;
}

function DigestTable({ rows }: { rows: DigestRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>job</th>
          <th>owner</th>
          <th>runs</th>
          <th>retries</th>
          <th>last status</th>
          <th>last error</th>
          <th>first</th>
          <th>last</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr class={markRow(row) ? 'warn' : undefined}>
            <td>{row.job}</td>
            <td>{row.owner ?? '—'}</td>
            <td>{row.runs}</td>
            <td>{row.retries}</td>
            <td>{row.lastStatus}</td>
            <td>{row.lastError ?? '—'}</td>
            <td>{row.firstAt}</td>
            <td>{row.lastAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DigestPage({ digest }: { digest: NightDigest }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <DigestTable rows={digest.rows} />
      )}
      {digest.badLines > 0 ? (
        <p class="mute">{digest.badLines} bad line{digest.badLines === 1 ? '' : 's'} skipped</p>
      ) : null}
    </>
  );
}
