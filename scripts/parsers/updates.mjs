import { marked } from 'marked';

// `## v1.2.3` optionally followed by either:
//   ` — YYYY-MM-DD` (release date), or
//   ` (label)` (status like "개발 중", "준비 중")
// Captures: 1=version, 2=date|undefined, 3=label|undefined
const HEADER_RE = /^##\s+(v\S+)(?:\s*[—–-]+\s*(\d{4}-\d{2}-\d{2})|\s*\(([^)]+)\))?\s*$/;
const UNRELEASED_LABEL_RE = /^(개발 중|준비 중|미출시|unreleased|in progress|coming soon)$/i;

function sortGroup(update) {
  if (update.label && UNRELEASED_LABEL_RE.test(update.label.trim())) return 0;
  if (update.date) return 1;
  return 2;
}

export function parseUpdates(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(HEADER_RE);
    if (match) {
      if (current) sections.push(current);
      current = {
        version: match[1],
        date: match[2] ?? null,
        label: match[3] ?? null,
        body: [],
      };
    } else if (line.startsWith('## ')) {
      if (current) {
        sections.push(current);
        current = null;
      }
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  const parsed = sections.map(s => ({
    version: s.version,
    date: s.date,
    label: s.label,
    items_html: marked.parse(s.body.join('\n').trim()),
  }));

  // Sort: unreleased status labels first, then dated desc, then undated by version desc.
  // Historical labels such as "초기 출시" are descriptive, not release freshness.
  parsed.sort((a, b) => {
    const aGroup = sortGroup(a);
    const bGroup = sortGroup(b);
    if (aGroup !== bGroup) return aGroup - bGroup;
    if (aGroup === 1) {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
    }
    return b.version.localeCompare(a.version, undefined, { numeric: true });
  });

  return parsed;
}
