import { fillTemplate } from './layout.mjs';
import { indexSeo } from './seo.mjs';
import { escapeHtml, formatBuiltAt, daysSince, categoryFromId, detailPath, renderPlayBadge, renderPlayStats } from './util.mjs';

function renderBadge(app, builtAt) {
  if (app.fetch_status === 'ok') return '';
  if (app.fetch_status === 'no_docs') {
    return '<span class="badge badge-no-docs">데이터 없음</span>';
  }
  // fetch_failed
  const days = daysSince(app.last_successful_fetch, builtAt);
  if (days == null) {
    return '<span class="badge badge-failed">⚠ 문서 수집 실패</span>';
  }
  return `<span class="badge badge-stale">⚠ ${days}일 전 데이터</span>`;
}

const normVersion = v => String(v ?? '').trim().replace(/^v/i, '');

function renderVersionLine(app) {
  const docsLabel = app.latest_version
    ? (app.latest_update_label ? `${app.latest_version} (${app.latest_update_label})` : app.latest_version)
    : null;

  if (app.play_version) {
    const playLabel = `Play v${normVersion(app.play_version)}`;
    if (!app.latest_version || normVersion(app.latest_version) === normVersion(app.play_version)) {
      const trailing = app.latest_update_date ? ` · ${escapeHtml(app.latest_update_date)}` : '';
      return `<div class="card-version">${escapeHtml(playLabel)}${trailing}</div>`;
    }
    return `<div class="card-version">${escapeHtml(playLabel)} <span class="card-version-note">문서 ${escapeHtml(docsLabel)}</span></div>`;
  }

  if (docsLabel) {
    const trailing = app.latest_update_date ? ` · ${escapeHtml(app.latest_update_date)}` : '';
    return `<div class="card-version">${escapeHtml(docsLabel)}${trailing}</div>`;
  }
  return `<div class="card-version empty">버전 정보 없음</div>`;
}

function renderCard(app, builtAt) {
  const versionLine = renderVersionLine(app);

  const icon = app.icon_url
    ? `<img class="card-icon" src="${escapeHtml(app.icon_url)}" alt="" loading="lazy" width="64" height="64">`
    : `<div class="card-icon card-icon-placeholder" aria-hidden="true">⌚</div>`;
  const categoryLabel = categoryFromId(app.id) === 'watchface' ? 'Watch Face' : 'App';
  const variantTag = app.variant ? `<span class="card-variant">${escapeHtml(app.variant)}</span>` : '';
  return `
<a class="card" href="${escapeHtml(detailPath(app))}" data-category="${escapeHtml(categoryFromId(app.id))}">
  <div class="card-head">
    ${icon}
    <div class="card-head-text">
      <span class="card-kicker"><span class="card-no">#${escapeHtml(app.id)}</span><span class="card-cat">${escapeHtml(categoryLabel)}</span>${variantTag}</span>
      <h2 class="card-name">${escapeHtml(app.name)}</h2>
    </div>
  </div>
  <p class="card-identity">${escapeHtml(app.identity)}</p>
  ${renderPlayStats(app)}
  <div class="card-foot">
    ${versionLine}
    <span class="card-badges">${renderPlayBadge(app)}${renderBadge(app, builtAt)}</span>
  </div>
  <span class="card-arrow" aria-hidden="true">→</span>
</a>`.trim();
}

export function renderIndexPage(data, template) {
  const cards = data.apps.map(a => renderCard(a, data.built_at)).join('\n');
  return fillTemplate(template, {
    ...indexSeo(data),
    total: escapeHtml(data.stats.total),
    succeeded: escapeHtml(data.stats.succeeded),
    no_docs: escapeHtml(data.stats.no_docs),
    failed: escapeHtml(data.stats.failed),
    built_at_display: escapeHtml(formatBuiltAt(data.built_at)),
    cards,
  });
}
