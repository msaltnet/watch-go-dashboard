# now.watch-go.com SEO · AI Discovery · Social Metadata Design

**Date:** 2026-09-20  
**Status:** Approved for implementation  
**Canonical origin:** `https://now.watch-go.com`

## Goal

Make the Watch-Go app dashboard understandable, indexable, and shareable by search engines, AI agents, and social platforms without adding a runtime service. Every generated page must describe the brand or the specific app in machine-readable form and advertise exactly one canonical public URL.

## Current gaps

- The index and generated app pages have only a title; they do not expose a canonical URL, description, Open Graph, Twitter Card, or structured data.
- The deployed static artifact does not publish `robots.txt` or a sitemap.
- The dashboard title and visible copy describe an "Atelier" but omit search terms such as Wear OS, Android apps, watch faces, and the application catalogue.
- A social link has no guaranteed 1200×630 preview image.

## Scope

### Included

- Set `https://now.watch-go.com` as the sole canonical origin.
- Generate page-specific HTML metadata for the catalogue and every app detail page.
- Generate deployable `robots.txt` and `sitemap.xml` from the same app data used to render pages.
- Add JSON-LD for the brand catalogue and applications, using only facts already stored in `apps.yml`/`data/apps.json`.
- Add a brand-consistent 1200×630 PNG social preview and use it as the reliable default social image.
- Make Korean human-facing copy more explicit about the catalogue's Wear OS and Android focus.
- Add deterministic tests for generated metadata, structured data, crawler files, and URL encoding.

### Excluded

- Analytics, Search Console verification, paid search, backlink outreach, or third-party SEO services.
- Claims not supported by the existing app data: ratings, download counts, pricing, availability, or screenshots.
- Per-app raster artwork generation. Detail pages use the reliable brand social image; app icons remain visible in the page body and structured data where their URLs are available.
- Modifying the primary `watch-go.com` site or individual product repositories.

## Architecture

Create a small SEO rendering module that owns the public origin, canonical URL construction, text normalization, JSON-LD serialization, and crawler-file generation. The index and detail renderers ask this module for escaped template values; `render-site.mjs` writes the resulting HTML plus `robots.txt` and `sitemap.xml` into `dist/`.

This keeps the data flow static and deterministic:

```
data/apps.json ──> SEO helpers ──> index/app HTML metadata + JSON-LD
       │                                  │
       └──────────────────────────────> sitemap.xml + robots.txt
public/social-card.png ───────────────> OG/Twitter image URL
```

The domain must be a code constant rather than inferred from the GitHub Pages preview URL. All URL joins must preserve the `/` root and encode dynamic detail path segments safely.

## Page metadata

### Index (`/`)

- Title: `Watch-Go Wear OS Apps & Watch Faces | now.watch-go.com`
- Description: concise Korean catalogue description that names Wear OS watch faces and Android companion apps.
- Canonical and `og:url`: `https://now.watch-go.com/`
- Open Graph: `website`, site name, title, description, image, image width/height/type, and Korean locale.
- Twitter/X: `summary_large_image`, title, description, image, and image alt text.
- JSON-LD: `Organization`, `WebSite`, and `ItemList` entries linking to the generated detail URLs.

### Detail (`/app/<id-or-id-variant>.html`)

- Unique title combines app name with the Watch-Go brand.
- Unique description combines the app's identity and its Wear OS/Android catalogue context; it never copies overview HTML or unverified marketing claims.
- Canonical and `og:url` are the generated public detail URL.
- Open Graph/Twitter values use the same share image as the catalogue, while their title/description identify the specific app.
- JSON-LD: `SoftwareApplication` with name, description, application category, operating system (`Wear OS / Android`), package identifier, product landing page, optional icon image, and `isPartOf` the catalogue. `BreadcrumbList` exposes catalogue → app hierarchy.
- Use `dateModified` only if a valid latest-update date exists.

## Crawler and AI discovery

`robots.txt` permits general crawlers and named AI agents but contains no crawl directives that override access controls (the site has none). It points to the generated absolute sitemap URL.

`sitemap.xml` contains the catalogue URL and every generated detail page. Each entry includes `lastmod` only when the underlying app has a valid ISO update date; otherwise it omits the optional field. It must XML-escape every URL.

The static HTML remains fully server-rendered, supplies meaningful headings and prose, and avoids `noindex`, login walls, or client-side-only content, so it is usable by crawlers that do not run JavaScript.

## Social asset

Add `public/social-card.png`: a 1200×630 brand image with the Watch-Go mark, slogan, and clear "Wear OS Apps & Watch Faces" label. It is copied unchanged to `dist/` and referenced with an absolute `https://now.watch-go.com/social-card.png` URL. The static default deliberately favors consistent previews across social crawlers over a brittle, dynamically generated image endpoint.

## Security and quality constraints

- Escape all HTML attribute and text values through existing `escapeHtml` before template insertion.
- Serialize JSON-LD with `<` escaped as `\\u003c` so external data cannot terminate its script element.
- Escape XML output independently.
- Retain the project's dependency-free rendering approach; do not add a server, browser automation, or metadata SaaS.
- Update generated output only; `dist/` remains ignored.

## Verification

- Unit tests prove index/detail metadata values, canonical root/detail URLs, JSON-LD contents, and safe serialization.
- Unit tests prove sitemap entries, optional `lastmod`, and crawler sitemap reference.
- The existing full Node test suite and static build must pass.
- Inspect generated HTML and crawler files for the confirmed `now.watch-go.com` origin and expected social metadata.
