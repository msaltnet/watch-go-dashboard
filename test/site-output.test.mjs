import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const execFileAsync = promisify(execFile);

test('static build publishes crawler files for the public origin', async () => {
  await execFileAsync(process.execPath, ['scripts/render-site.mjs']);
  const [robots, sitemap, socialCard] = await Promise.all([
    readFile('dist/robots.txt', 'utf8'),
    readFile('dist/sitemap.xml', 'utf8'),
    readFile('dist/social-card.png'),
  ]);

  assert.match(robots, /Sitemap: https:\/\/now\.watch-go\.com\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/now\.watch-go\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/now\.watch-go\.com\/app\/208\.html<\/loc>/);
  assert.equal(socialCard.readUInt32BE(0), 0x89504e47);
  assert.equal(socialCard.readUInt32BE(16), 1200);
  assert.equal(socialCard.readUInt32BE(20), 630);
});
