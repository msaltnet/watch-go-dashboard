import { readFile, writeFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { fetchDocFile } from './github.mjs';
import { parseUpdates } from './parsers/updates.mjs';
import { parseOverview } from './parsers/overview.mjs';
import { mergeFetchResults } from './merge.mjs';

export async function collectAppDocs({ appsYml, token, fetchFn }) {
  if (!token) {
    throw new Error('DOCS_FETCH_TOKEN environment variable is required');
  }

  const { apps } = parseYaml(appsYml);
  const results = [];

  for (const meta of apps) {
    const subdir = meta.docs_subdir;
    const basePath = subdir ? `docs/${subdir}` : 'docs';
    const overviewPath = `${basePath}/overview.md`;
    const updatesPath = `${basePath}/updates.md`;

    const [overview, updates] = await Promise.all([
      fetchDocFile({ repo: meta.repo, path: overviewPath, token, fetchFn }),
      fetchDocFile({ repo: meta.repo, path: updatesPath, token, fetchFn }),
    ]);

    if (overview.status === 'auth_failed' || updates.status === 'auth_failed') {
      results.push({ meta, status: 'fetch_failed' });
      continue;
    }
    if (overview.status === 'error' || updates.status === 'error') {
      results.push({ meta, status: 'fetch_failed' });
      continue;
    }
    if (overview.status === 'not_found' && updates.status === 'not_found') {
      results.push({ meta, status: 'no_docs' });
      continue;
    }

    const overview_html = overview.status === 'ok'
      ? parseOverview(overview.content, meta.repo, 'main', subdir ?? null)
      : null;
    const updatesArr = updates.status === 'ok' ? parseUpdates(updates.content) : [];

    results.push({
      meta,
      status: 'ok',
      overview_html,
      updates: updatesArr,
    });
  }

  return results;
}

function nowIsoKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const iso = kst.toISOString().replace('Z', '+09:00');
  return iso;
}

async function main() {
  const token = process.env.DOCS_FETCH_TOKEN;
  const appsYml = await readFile('apps.yml', 'utf8');
  const previousRaw = await readFile('data/apps.json', 'utf8');
  const previous = JSON.parse(previousRaw);

  const fresh = await collectAppDocs({ appsYml, token, fetchFn: fetch });
  const merged = mergeFetchResults({ previous, fresh, builtAt: nowIsoKst() });

  await writeFile('data/apps.json', JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`built_at=${merged.built_at} stats=${JSON.stringify(merged.stats)}`);
}

const isEntry = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`
  || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isEntry) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
