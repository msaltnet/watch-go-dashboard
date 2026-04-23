import { fillTemplate } from './layout.mjs';
import { escapeHtml, formatBuiltAt, daysSince, categoryFromId, detailPath } from './util.mjs';

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

function renderCard(app, builtAt) {
  const versionLine = app.latest_version
    ? `<div class="card-version">${escapeHtml(app.latest_version)} · ${escapeHtml(app.latest_update_date)}</div>`
    : `<div class="card-version empty">버전 정보 없음</div>`;

  return `
<a class="card" href="${detailPath(app)}" data-category="${categoryFromId(app.id)}">
  <span class="card-id">#${escapeHtml(app.id)}${app.variant ? ` · ${escapeHtml(app.variant)}` : ''}</span>
  <h2 class="card-name">${escapeHtml(app.name)}</h2>
  <p class="card-identity">${escapeHtml(app.identity)}</p>
  ${versionLine}
  ${renderBadge(app, builtAt)}
  <div class="card-links">
    <span>🔗 ${escapeHtml(app.landing.replace(/^https?:\/\//, ''))}</span>
    <span>💻 ${escapeHtml(app.repo)}</span>
  </div>
</a>`.trim();
}

export function renderIndexPage(data, template) {
  const cards = data.apps.map(a => renderCard(a, data.built_at)).join('\n');
  return fillTemplate(template, {
    total: escapeHtml(data.stats.total),
    succeeded: escapeHtml(data.stats.succeeded),
    no_docs: escapeHtml(data.stats.no_docs),
    failed: escapeHtml(data.stats.failed),
    built_at_display: escapeHtml(formatBuiltAt(data.built_at)),
    cards,
  });
}
