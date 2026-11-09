const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { getIntrospectionQuery } = require('graphql');
const { PrismaClient } = require('@prisma/client');
const { CardService } = require('../dist/card/card.service');

test('fresh start, full GraphQL card, safe restart and query cost', { timeout: 90000 }, async (t) => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a local test PostgreSQL database');
  const url = new URL(process.env.TEST_DATABASE_URL);
  const schema = `card_e2e_${Date.now()}`;
  url.searchParams.set('schema', schema);
  const port = process.env.TEST_PORT || '33031';
  const env = { ...process.env, DATABASE_URL: url.toString(), PORT: port, HOST: '127.0.0.1' };
  const endpoint = `http://127.0.0.1:${port}`;
  let server;
  let logs = '';
  const db = new PrismaClient({ datasourceUrl: url.toString(), log: [{ emit: 'event', level: 'query' }] });
  async function stop() {
    if (server && server.exitCode === null) {
      const exited = once(server, 'exit');
      server.kill('SIGTERM');
      await exited;
    }
  }
  t.after(async () => { await stop(); await db.$disconnect(); });
  async function start() {
    server = spawn(process.execPath, ['scripts/start.cjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', (chunk) => { logs += chunk; });
    server.stderr.on('data', (chunk) => { logs += chunk; });
    for (let attempt = 0; attempt < 150; attempt++) {
      if (server.exitCode !== null) assert.fail(`Startup exited: ${logs}`);
      try {
        const response = await fetch(`${endpoint}/health`);
        if (response.ok) return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.fail(`Server did not become healthy: ${logs}`);
  }
  async function query(query) {
    const response = await fetch(`${endpoint}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
    return { status: response.status, body: await response.json() };
  }
  await start();
  const full = await query('{ profile { id name description links { label url } skills { name } experience { company position period achievements } projects { name description link } } }');
  assert.equal(full.status, 200);
  assert.equal(full.body.errors, undefined);
  const profile = full.body.data.profile;
  assert.equal(profile.name, 'Степан Кузьмин');
  assert.equal(profile.links[0].url, 'https://t.me/ocniligo');
  assert.deepEqual(profile.links[1], {
    label: 'Портфолио',
    url: 'https://drive.google.com/file/d/190evRut3d3Qg3h5WDPJzknQTvE7x60M-/view'
  });
  assert.equal(profile.skills.length, 8);
  assert.equal(profile.experience[0].company, 'Самостоятельные проекты');
  assert.equal(profile.experience[0].period, 'Проектная работа с июня 2026 по настоящее время');
  assert.equal(profile.projects.length, 3);
  for (const project of profile.projects) {
    assert.match(project.link, /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/view$/);
  }
  assert.equal(new Set(profile.projects.map((project) => project.link)).size, 3);
  assert.equal((await query(getIntrospectionQuery())).body.errors, undefined);
  const landing = await fetch(`${endpoint}/graphql`, { headers: { accept: 'text/html' } });
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /apollo|sandbox/i);
  assert.ok((await query('{ profile { unknownField } }')).body.errors);
  assert.ok((await query('mutation { deleteProfile }')).body.errors);
  const oversized = await fetch(`${endpoint}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: ' '.repeat(70000) }) });
  assert.equal(oversized.status, 413);
  const huge = `{ ${Array.from({ length: 1001 }, (_, i) => `p${i}:profile { name }`).join(' ')} }`;
  assert.ok((await query(huge)).body.errors);
  const queries = [];
  db.$on('query', (event) => queries.push(event.query));
  await db.$connect();
  queries.length = 0;
  await new CardService(db).getProfile();
  assert.equal(queries.length, 1, 'all nested relations must use one SQL query');
  const expectedCounts = [1, 2, 8, 1, 3];
  const counts = () => Promise.all([db.profile.count(), db.professionalLink.count(), db.skill.count(), db.experience.count(), db.project.count()]);
  assert.deepEqual(await counts(), expectedCounts);
  await db.profile.update({ where: { id: 'stepan' }, data: { description: 'Preserved after restart' } });
  await db.professionalLink.update({ where: { id: 'telegram' }, data: { label: 'Edited contact' } });
  await db.skill.update({ where: { id: 'skill-0' }, data: { name: 'Edited skill' } });
  await db.experience.update({ where: { id: 'independent-projects' }, data: { period: 'Edited period', achievements: ['Edited achievement'] } });
  await db.project.update({ where: { id: 'studygram' }, data: { description: 'Edited project', link: 'https://example.com/user-project' } });
  await db.project.create({ data: { id: 'user-added-project', name: 'User project', description: 'User content', link: null, sortOrder: 10, profileId: 'stepan' } });
  const snapshot = async () => Promise.all([
    db.profile.findMany({ orderBy: { id: 'asc' } }),
    db.professionalLink.findMany({ orderBy: { id: 'asc' } }),
    db.skill.findMany({ orderBy: { id: 'asc' } }),
    db.experience.findMany({ orderBy: { id: 'asc' } }),
    db.project.findMany({ orderBy: { id: 'asc' } })
  ]);
  const editedData = await snapshot();
  await stop();
  await start();
  assert.deepEqual(await counts(), [1, 2, 8, 1, 4]);
  assert.deepEqual(await snapshot(), editedData, 'restart must preserve every edited field and user-added row');
  assert.equal((await query('{ profile { description } }')).body.data.profile.description, 'Preserved after restart');
  console.log(`Verified fresh PostgreSQL schema ${schema}: migration/seed, HTTP GraphQL, introspection, landing page, input limits, one SQL query, safe restart.`);
});
