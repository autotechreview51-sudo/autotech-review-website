# AutoTech Review publication

Public publication for https://www.autotechreview.ca, continuing the existing GitHub and Netlify project.

## Pages and discovery

Separate Long Videos and Shorts libraries, combined make/type/year/format filters, title search, date sorting, filtered “Surprise me” suggestions, vehicle and make collections, video companions, related coverage, a campaign-brief email draft, printable media kit, Privacy and Transparency pages. Structured HTML and JSON-LD provide Organization, WebSite, Article, VideoObject, Vehicle, BreadcrumbList and ItemList metadata. URL and video sitemaps use the public canonical origin.

## Deployment

Netlify builds with `node scripts/update-youtube.mjs && node scripts/sync-publication.mjs && node scripts/update-thumbnails.mjs && node scripts/build-publication.mjs` and publishes `dist/`. Existing Netlify YouTube-feed functions are retained. The hourly GitHub content-refresh workflow reads all recent RSS entries, retains previously discovered videos, updates exact thumbnails and builds video companions, RSS and sitemaps. It commits only real changes. Known thumbnails are checked for artwork changes daily; new thumbnails are fetched on import. The homepage and libraries check `/api/youtube-feed` when opened, when a tab becomes visible, and every five minutes while visible. Netlify caches successful feeds for five minutes, with up to one minute of stale revalidation. New uploads link to YouTube until their companion pages have been built. YouTube feed publication and GitHub scheduling can delay discovery; this is not an instant-upload guarantee.

Pushing `main` deploys through the existing Netlify project. Legacy URLs use forced 301 redirects so they cannot shadow the canonical directory pages. The feed returns the saved catalogue if YouTube is temporarily unavailable.

## Content

Edit `data/publication.json` for curated coverage and vehicle classifications. The sync script imports new source-feed videos, attaches a vehicle only when the full curated model/trim and model year appear in the title, and avoids inventing scores or driving experiences. Explicit or curated makes, years and vehicle types generate filter choices; new makes also receive collection pages. Unknown details remain unclassified. A failed format probe keeps the previously confirmed format; an unconfirmed new upload receives a neutral video page and appears in the combined library until a later probe resolves it. Existing curated titles are preserved, while imported titles and source metadata follow changes on YouTube. Stable URLs are retained after renaming. Each thumbnail comes from its own YouTube video ID; `data/cover-provenance.json` records the exact source and file hash. New uploads never inherit another video's artwork. The media kit uses a dated rounded subscriber snapshot and requests other current analytics instead of claiming unverified metrics.

## Checks

`python scripts/validate-publication.py` (requires lxml), `node scripts/verify-interactions.cjs`, `node scripts/verify-feed-fallback.mjs`, `node scripts/verify-auto-refresh.mjs`, `node scripts/verify-buyer-tools.cjs`, and `node --check dist/assets/publication.js` check local links, anchors, assets, metadata, schemas, sitemaps, redirects, public indexing guards, responsive source rules, filters, format separation, empty states, resets, menu behavior, email-draft encoding, click-to-load playback and feed outage recovery. Deployment also checks live routes and desktop browser filtering. Mobile layouts have source checks; a physical-device check remains useful.

No new analytics, advertising, payments or account services are added. The campaign brief creates an email draft and does not send it or submit visitor information to a website database.

## Operations

Workflow: `.github/workflows/refresh-youtube.yml`, cron `17 * * * *`, manual dispatch available. Refresh-code changes trigger a verification run too. Concurrent editor changes cause the bot to skip its commit and regenerate on the next run, rather than overwrite them. The updater keeps saved content on upstream failure. GitHub can disable scheduled workflows in public repositories after 60 days without repository activity; check the Actions tab if automatic checks stop. No YouTube API key, account login or Google account changes are required.
