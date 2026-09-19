# AutoTech Review redesign

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
