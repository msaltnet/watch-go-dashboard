import { marked } from 'marked';

const HEADER_RE = /^##\s+(v[^\s]+)\s*[—–-]+\s*(\d{4}-\d{2}-\d{2})\s*$/;

export function parseUpdates(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(HEADER_RE);
    if (match) {
      if (current) sections.push(current);
      current = { version: match[1], date: match[2], body: [] };
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
    items_html: marked.parse(s.body.join('\n').trim() || ''),
  }));

  parsed.sort((a, b) => b.date.localeCompare(a.date));
  return parsed;
}
