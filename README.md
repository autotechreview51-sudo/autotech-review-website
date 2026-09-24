# AutoTech Review redesign

## Automatic YouTube updates

The homepage reads `data/site-content.json`. GitHub Actions runs `scripts/update-youtube.mjs` every hour, separates the latest long videos and Shorts, refreshes subscriber text when available, commits only real feed changes, and then deploys to Netlify when the optional secrets are configured.

There are two supported deployment paths:

1. Connect the Netlify site to this GitHub repository. A content commit will trigger a Netlify deploy automatically.
2. If the Netlify site is a manual-drop site, add these GitHub repository secrets so the workflow can deploy directly:
   - `NETLIFY_AUTH_TOKEN`
   - `NETLIFY_SITE_ID`

The workflow can also be started manually from GitHub Actions with **Run workflow**. If YouTube is temporarily unavailable, the updater preserves the last reliable content file instead of replacing it with an empty feed.

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
