import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export function parseOverview(markdown, repo, branch = 'main', subdir = null) {
  const docsBase = subdir ? `docs/${subdir}` : 'docs';
  const rawBase = `https://raw.githubusercontent.com/${repo}/${branch}/${docsBase}`;

  const renderer = new marked.Renderer();
  renderer.image = ({ href, title, text }) => {
    if (href && !/^https?:\/\//.test(href) && !href.startsWith('/')) {
      const cleaned = href.replace(/^\.\//, '');
      href = `${rawBase}/${cleaned}`;
    }
    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${title}"`;
    }
    out += '>';
    return out;
  };

  const rawHtml = marked.parse(markdown, { renderer });
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
