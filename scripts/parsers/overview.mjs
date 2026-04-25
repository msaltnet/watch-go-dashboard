import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export function parseOverview(markdown, repo, branch = 'main', subdir = null) {
  const docsBase = subdir ? `${subdir}/docs/app` : 'docs/app';
  const rawBase = `https://raw.githubusercontent.com/${repo}/${branch}/${docsBase}`;

  const renderer = new marked.Renderer();
  const origImage = renderer.image.bind(renderer);
  renderer.image = ({ href, title, text }) => {
    const isAbsolute = /^([a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(href);
    if (href && !isAbsolute) {
      const cleaned = href.replace(/^\.\//, '');
      href = `${rawBase}/${cleaned}`;
    }
    return origImage({ href, title, text });
  };

  const rawHtml = marked.parse(markdown, { renderer });
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
