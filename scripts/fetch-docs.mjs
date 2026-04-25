import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { fetchDocFile } from './github.mjs';
import { parseUpdates } from './parsers/updates.mjs';
import { parseOverview } from './parsers/overview.mjs';
import { mergeFetchResults } from './merge.mjs';
import { fetchIconUrl } from './landing.mjs';

function describeFetch(r) {
  const detail = [r.http && `http=${r.http}`, r.reason && `reason=${r.reason}`].filter(Boolean).join(' ');
  return detail ? `${r.status}(${detail})` : r.status;
}

export async function collectAppDocs({ appsYml, token, fetchFn }) {
  if (!token) {
    throw new Error('DOCS_FETCH_TOKEN environment variable is required');
  }

  const { apps } = parseYaml(appsYml);
  const results = [];

  for (const meta of apps) {
    const subdir = meta.docs_subdir;
    const basePath = subdir ? `${subdir}/docs/app` : 'docs/app';
    const overviewPath = `${basePath}/overview.md`;
    const updatesPath = `${basePath}/updates.md`;
    const branch = meta.branch ?? 'main';

    const [overview, updates, icon_url] = await Promise.all([
      fetchDocFile({ repo: meta.repo, path: overviewPath, token, ref: branch, fetchFn }),
      fetchDocFile({ repo: meta.repo, path: updatesPath, token, ref: branch, fetchFn }),
      fetchIconUrl({ landing: meta.landing, id: meta.id, fetchFn }),
    ]);

    const probe = `[${meta.id}${meta.variant ? '-' + meta.variant : ''} ${meta.repo}@${branch}] overview=${describeFetch(overview)} updates=${describeFetch(updates)}`;

    if (overview.status === 'auth_failed' || updates.status === 'auth_failed') {
      console.warn(`fetch_failed (auth) ${probe}`);
      results.push({ meta, status: 'fetch_failed', icon_url });
      continue;
    }
    if (overview.status === 'error' || updates.status === 'error') {
      console.warn(`fetch_failed (error) ${probe}`);
      results.push({ meta, status: 'fetch_failed', icon_url });
      continue;
    }
    if (overview.status === 'not_found' && updates.status === 'not_found') {
      console.warn(`no_docs ${probe}`);
      results.push({ meta, status: 'no_docs', icon_url });
      continue;
    }

    const overview_html = overview.status === 'ok'
      ? parseOverview(overview.content, meta.repo, branch, subdir ?? null)
      : null;
    const updatesArr = updates.status === 'ok' ? parseUpdates(updates.content) : [];

    results.push({
      meta,
      status: 'ok',
      overview_html,
      updates: updatesArr,
      icon_url,
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

  for (const status of ['ok', 'no_docs', 'fetch_failed']) {
    const apps = merged.apps.filter(a => a.fetch_status === status);
    if (apps.length === 0) continue;
    console.log(`\n${status} (${apps.length}):`);
    for (const a of apps) {
      const slug = a.variant ? `${a.id}-${a.variant}` : a.id;
      const sub = a.docs_subdir ? ` [docs/app/${a.docs_subdir}/]` : '';
      const version = status === 'ok'
        ? `  ${a.latest_version ?? '(버전 정보 없음)'}${a.latest_update_label ? ` (${a.latest_update_label})` : ''}${a.latest_update_date ? ` · ${a.latest_update_date}` : ''}`
        : '';
      console.log(`  #${slug}  ${a.name}  →  ${a.repo}${sub}${version}`);
    }
  }
}

const isEntry = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
