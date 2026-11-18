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
  if (st === 'not_found') {
    return `<${tag} class="badge badge-no-docs">Play 미등록</${tag}>`;
  }
  return '';
}
