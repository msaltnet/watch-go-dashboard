import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { renderIndexPage } from './render/index-page.mjs';
import { renderDetailPage } from './render/detail-page.mjs';
import { detailPath } from './render/util.mjs';

async function main() {
  const dataRaw = await readFile('data/apps.json', 'utf8');
  const data = JSON.parse(dataRaw);

  const indexTpl = await readFile('templates/index.html', 'utf8');
  const detailTpl = await readFile('templates/app-detail.html', 'utf8');

  await rm('dist', { recursive: true, force: true });
  await mkdir('dist/app', { recursive: true });

  const indexHtml = renderIndexPage(data, indexTpl);
  await writeFile('dist/index.html', indexHtml, 'utf8');

  for (const app of data.apps) {
    const html = renderDetailPage(app, data, detailTpl);
    await writeFile(`dist/${detailPath(app)}`, html, 'utf8');
  }

  await cp('public', 'dist', { recursive: true });

  console.log(`rendered ${data.apps.length} app pages to dist/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
