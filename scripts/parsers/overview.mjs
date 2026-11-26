import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// overview.md is written for developers in private repos, but this site is
// public. Publish only the intro and these sections; anything else, including
// sections added later, stays out.
const PUBLIC_SECTIONS = new Set(['소개', '앱 소개', '주요 기능', '핵심 기능']);

// The intro is everything before the first level-2 heading, with the document
// title. Each later level-1/2 heading opens a section that is kept only when
// allowed; deeper headings belong to their section.
function publicTokens(tokens) {
  let keep = true;
  const kept = tokens.filter((token, index) => {
    const isTitle = index === 0 && token.depth === 1;
    if (token.type === 'heading' && token.depth <= 2 && !isTitle) {
      keep = PUBLIC_SECTIONS.has(token.text.trim());
    }
    return keep;
  });
  kept.links = tokens.links;
  return kept;
}

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

  const rawHtml = marked.parser(publicTokens(marked.lexer(markdown)), { renderer });
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
