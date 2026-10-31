import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { statusCounts } from './digest/counts.js';
import { readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard, type NightLink } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) => {
    const status = readStatus(config);
    const nights: NightLink[] = status.nights.map((night) => {
      const digest = readNight(config.runsDir, night);
      return { night, counts: digest ? statusCounts(digest) : null };
    });
    return c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={status} nights={nights} />
      </Layout>,
    );
  });

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    const digest = readNight(config.runsDir, night);
    if (!digest) return c.text('not found', 404);
    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <DigestPage digest={digest} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    const digest = readNight(config.runsDir, night);
    if (!digest) return c.json({ error: 'not found' }, 404);
    return c.json(digest.rows);
  });

  return app;
}
