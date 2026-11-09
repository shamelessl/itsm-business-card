const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { existsSync } = require('node:fs');
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before starting the API. See .env.example.');
const prismaCli = require.resolve('prisma/build/index.js');
for (const [file, args] of [[prismaCli, ['migrate', 'deploy']], [path.resolve('prisma/seed.cjs'), []]]) {
  const result = spawnSync(process.execPath, [file, ...args], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
require(path.resolve('dist/main.js'));
