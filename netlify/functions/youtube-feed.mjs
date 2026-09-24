import { loadChannelFeed } from '../lib/youtube.mjs';

const FRESH_SECONDS = 900; // ~15 minutes
let lastGood = null;       // survives between requests on a warm instance

const json = (body, status, cacheHeaders) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=UTF-8', ...cacheHeaders }
});

export default async () => {
  try {
    const feed = await loadChannelFeed({ previous: lastGood?.latestVideos ?? [] });
    lastGood = { updatedAt: new Date().toISOString(), source: 'youtube-rss', ...feed };
    return json(lastGood, 200, {
      'cache-control': `public, max-age=${FRESH_SECONDS}`,
      'netlify-cdn-cache-control': `public, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=3600, durable`
    });
  } catch (error) {
    console.warn(`youtube-feed: ${error.message}`);
    if (lastGood) {
      return json({ ...lastGood, stale: true }, 200, {
        'cache-control': 'public, max-age=60',
        'netlify-cdn-cache-control': 'public, s-maxage=60'
      });
    }
    return json({ error: 'YouTube feed temporarily unavailable', fallback: '/data/site-content.json' }, 503, {
      'cache-control': 'no-store'
    });
  }
};
