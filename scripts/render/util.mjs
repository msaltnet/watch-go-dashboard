export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatBuiltAt(iso) {
  if (!iso) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return '—';
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]} KST`;
}

export function daysSince(isoDate, referenceIso) {
  if (!isoDate || !referenceIso) return null;
  const a = new Date(isoDate);
  const b = new Date(referenceIso);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export function categoryFromId(id) {
  return id < 200 ? 'watchface' : 'app';
}

export function detailPath(app) {
  const slug = app.variant ? `${app.id}-${app.variant}` : String(app.id);
  return `app/${slug}.html`;
}

// Badge for Play version collection state. ok / unknown -> ''.
export function renderPlayBadge(app, tag = 'span') {
  const st = app.play_status;
  if (st === 'parse_failed' || st === 'error') {
    const label = st === 'parse_failed' ? 'Play 파싱 실패' : 'Play 조회 실패';
    const note = app.play_version ? ` title="마지막 성공 값(${escapeHtml(app.play_version)})을 표시 중"` : '';
    return `<${tag} class="badge badge-failed"${note}>⚠ ${label}</${tag}>`;
  }
  if (st === 'partial') {
    return `<${tag} class="badge badge-stale" title="버전은 읽었지만 설치 수 또는 업데이트 날짜를 못 읽었습니다">⚠ Play 일부 파싱 실패</${tag}>`;
  }
  if (st === 'not_found') {
    return `<${tag} class="badge badge-no-docs">Play 미등록</${tag}>`;
  }
  return '';
}

// "★ 4.3 (79) · 설치 10K+" ; '' when nothing to show.
export function renderPlayStats(app) {
  const parts = [];
  if (app.play_rating != null) {
    const count = app.play_rating_count != null ? ` <span class="stat-sub">(${escapeHtml(app.play_rating_count.toLocaleString('en-US'))})</span>` : '';
    parts.push(`<span class="stat"><span class="stat-star" aria-hidden="true">★</span> ${escapeHtml(app.play_rating.toFixed(1))}${count}</span>`);
  }
  if (app.play_installs) {
    parts.push(`<span class="stat"><span class="stat-key">설치</span> ${escapeHtml(app.play_installs)}</span>`);
  }
  return parts.length ? `<div class="card-stats">${parts.join('')}</div>` : '';
}

// "10K+" -> 10000, "1.5M+" -> 1500000, "500+" -> 500; null when unknown.
export function parseInstalls(label) {
  const m = /^([\d,.]+)\s*([KMB]?)\+?$/i.exec(String(label ?? '').trim());
  if (!m) return null;
  const mult = { '': 1, K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()];
  const n = parseFloat(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * mult) : null;
}

// data-* attributes the client-side sort reads. Missing values are omitted.
export function sortAttrs(app) {
  const pairs = {
    'data-sort-id': app.id,
    'data-sort-installs': parseInstalls(app.play_installs),
    'data-sort-rating': app.play_rating,
    'data-sort-reviews': app.play_rating_count,
    'data-sort-updated': app.play_updated ?? app.latest_update_date,
  };
  return Object.entries(pairs)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
    .join(' ');
}
