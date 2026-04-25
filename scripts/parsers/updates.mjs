import { marked } from 'marked';

// `## v1.2.3` optionally followed by either:
//   ` — YYYY-MM-DD` (release date), or
//   ` (label)` (status like "개발 중", "준비 중")
// Captures: 1=version, 2=date|undefined, 3=label|undefined
const HEADER_RE = /^##\s+(v\S+)(?:\s*[—–-]+\s*(\d{4}-\d{2}-\d{2})|\s*\(([^)]+)\))?\s*$/;

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

  // Sort: labeled (unreleased) first, then dated desc, then undated by version desc.
  parsed.sort((a, b) => {
    const aGroup = a.label ? 0 : a.date ? 1 : 2;
    const bGroup = b.label ? 0 : b.date ? 1 : 2;
    if (aGroup !== bGroup) return aGroup - bGroup;
    if (aGroup === 1) {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
    }
    return b.version.localeCompare(a.version, undefined, { numeric: true });
  });

  return parsed;
}
