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
  let versionLine;
  if (app.latest_version) {
    const versionLabel = app.latest_update_label
      ? `${app.latest_version} (${app.latest_update_label})`
      : app.latest_version;
    const trailing = app.latest_update_date
      ? ` · ${escapeHtml(app.latest_update_date)}`
      : '';
    versionLine = `<div class="card-version">${escapeHtml(versionLabel)}${trailing}</div>`;
  } else {
    versionLine = `<div class="card-version empty">버전 정보 없음</div>`;
  }

  const landing = (app.landing || '').replace(/^https?:\/\//, '');
  const icon = app.icon_url
    ? `<img class="card-icon" src="${escapeHtml(app.icon_url)}" alt="" loading="lazy" width="64" height="64">`
    : `<div class="card-icon card-icon-placeholder" aria-hidden="true">⌚</div>`;
  const categoryLabel = categoryFromId(app.id) === 'watchface' ? 'Watch Face' : 'App';
  const variantTag = app.variant ? `<span class="card-variant">${escapeHtml(app.variant)}</span>` : '';
  return `
<a class="card" href="${escapeHtml(detailPath(app))}" data-category="${escapeHtml(categoryFromId(app.id))}">
  <span class="card-no" aria-hidden="true">${escapeHtml(app.id)}</span>
  <div class="card-head">
    ${icon}
    <div class="card-head-text">
      <span class="card-kicker"><span class="card-cat">${escapeHtml(categoryLabel)}</span>${variantTag}</span>
      <h2 class="card-name">${escapeHtml(app.name)}</h2>
    </div>
  </div>
  <p class="card-identity">${escapeHtml(app.identity)}</p>
  <div class="card-foot">
    ${versionLine}
    ${renderBadge(app, builtAt)}
  </div>
  <div class="card-links">
    <span class="card-link"><span class="card-link-key">link</span> ${escapeHtml(landing)}</span>
    <span class="card-link"><span class="card-link-key">repo</span> ${escapeHtml(app.repo)}</span>
  </div>
  <span class="card-arrow" aria-hidden="true">→</span>
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
