# AutoTech Review redesign

## Automatic YouTube updates

- **Live feed:** `/api/youtube-feed` (Netlify function `netlify/functions/youtube-feed.mjs`) reads the channel RSS feed, separates Shorts from long videos and returns `latestVideos`, `latestLongVideos` and `latestShorts`. Responses are cached for ~15 minutes, so a new upload appears on the homepage without a redeploy.
- **Fallback:** `script.js` requests the live feed first and falls back to `data/site-content.json` if the function is unavailable.
- **Hourly refresh:** `.github/workflows/refresh-youtube.yml` runs `scripts/update-youtube.mjs` every hour (and on **Run workflow**). It keeps the last reliable data when YouTube is down and commits only when content actually changes.
- **Deploys:** Netlify is connected to this repository, so each content commit redeploys automatically. The optional `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` repository secrets are only needed if the site is ever switched back to manual deploys; leave them unset while Git-connected to avoid double deploys.

Shared YouTube logic lives in `netlify/lib/youtube.mjs`.

Responsive static implementation of the approved AutoTech Review Figma concept.

## Preview

Run any static server in this directory, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deployment

The site is configured for Netlify as a zero-build static site. The repository root is the publish directory and no build command is required.

## Before production

- Connect live channel statistics to a maintained data source.
- Confirm vehicle prices and specifications before publication.
- Add Analytics and Search Console IDs through the production environment.
