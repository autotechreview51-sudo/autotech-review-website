# AutoTech Review publication

Public publication for https://www.autotechreview.ca, continuing the existing GitHub and Netlify project.

## Pages and discovery

Separate Long Videos and Shorts libraries, combined make/type/year/format filters, vehicle and make collections, video companions, related coverage, a campaign-brief email draft, printable media kit, Privacy and Transparency pages. Structured HTML and JSON-LD provide Organization, WebSite, Article, VideoObject, Vehicle, BreadcrumbList and ItemList metadata. URL and video sitemaps use the public canonical origin.

## Deployment

Netlify builds with `node scripts/sync-publication.mjs && node scripts/build-publication.mjs` and publishes `dist/`. Existing Netlify YouTube-feed functions are retained. The daily GitHub content-refresh workflow updates the source feed and structured publication pages. Libraries also check `/api/youtube-feed` between rebuilds; new uploads link to YouTube until their companion pages have been built.

Pushing `main` deploys through the existing Netlify project. Legacy URLs use forced 301 redirects so they cannot shadow the canonical directory pages. The feed returns the saved catalogue if YouTube is temporarily unavailable.

## Content

Edit `data/publication.json` for curated coverage and vehicle classifications. The sync script imports new source-feed videos, attaches a vehicle only when a model and model year match, and avoids inventing scores or driving experiences. Existing creator photographs serve as collection covers. The media kit uses a dated rounded subscriber snapshot and requests other current analytics instead of claiming unverified metrics.

## Checks

`python scripts/validate-publication.py` (requires lxml), `node scripts/verify-interactions.cjs`, `node scripts/verify-feed-fallback.mjs`, and `node --check dist/assets/publication.js` check local links, anchors, assets, metadata, schemas, sitemaps, redirects, public indexing guards, responsive source rules, filters, format separation, empty states, resets, menu behavior, email-draft encoding, click-to-load playback and feed outage recovery. Deployment also checks live routes and desktop browser filtering. Mobile layouts have source checks; a physical-device check remains useful.

No new analytics, advertising, payments or account services are added. The campaign brief creates an email draft and does not send it or submit visitor information to a website database.
