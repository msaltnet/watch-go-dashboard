import { fillTemplate } from './layout.mjs';
import { escapeHtml, formatBuiltAt, daysSince } from './util.mjs';

function renderStatusBadge(app, builtAt) {
  if (app.fetch_status === 'ok') return '';
  if (app.fetch_status === 'no_docs') {
    return '<p><span class="badge badge-no-docs">데이터 없음</span></p>';
  }
  const days = daysSince(app.last_successful_fetch, builtAt);
  if (days == null) {
    return '<p><span class="badge badge-failed">⚠ 문서 수집 실패</span></p>';
  }
  return `<p><span class="badge badge-stale">⚠ ${days}일 전 데이터</span></p>`;
}

function renderOverviewBlock(app) {
  if (!app.overview_html) {
    return '<p class="empty-state">데이터 없음</p>';
  }
  return app.overview_html;
}

function renderUpdatesBlock(app) {
  if (!app.updates || app.updates.length === 0) {
    return '<p class="empty-state">데이터 없음</p>';
  }
  const items = app.updates.slice(0, 5).map(u => `
<li>
  <span class="update-version">${escapeHtml(u.version)}</span>
  <span class="update-date">${escapeHtml(u.date)}</span>
  ${u.items_html}
</li>`).join('');
  const branch = app.branch ?? 'main';
  const subdirPath = app.docs_subdir ? `docs/${app.docs_subdir}` : 'docs';
  const moreHref = `https://github.com/${app.repo}/blob/${branch}/${subdirPath}/updates.md`;
  const more = app.updates.length > 5
    ? `<p class="empty-state"><a href="${escapeHtml(moreHref)}">전체 업데이트 이력 보기 ↗</a></p>`
    : '';
  return `<ul class="updates-list">${items}</ul>${more}`;
}

export function renderDetailPage(app, data, template) {
  return fillTemplate(template, {
    id: escapeHtml(app.id),
    name: escapeHtml(app.name),
    identity: escapeHtml(app.identity),
    package: escapeHtml(app.package),
    landing: escapeHtml(app.landing),
    repo: escapeHtml(app.repo),
    status_badge: renderStatusBadge(app, data.built_at),
    overview_block: renderOverviewBlock(app),
    updates_block: renderUpdatesBlock(app),
    built_at_display: escapeHtml(formatBuiltAt(data.built_at)),
  });
}
