import { loadChannelFeed } from '../lib/youtube.mjs';
import savedFeed from '../../data/site-content.json' with { type: 'json' };

const FRESH_SECONDS = 900; // ~15 minutes
let lastGood = null;       // survives between requests on a warm instance

const json = (body, status, cacheHeaders) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=UTF-8', ...cacheHeaders }
});

export default async () => {
  try {
    const feed = await loadChannelFeed({ previous: lastGood?.latestVideos ?? [...savedFeed.latestVideos, ...savedFeed.latestLongVideos, ...savedFeed.latestShorts] });
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
    return json({ updatedAt: savedFeed.updatedAt, source: 'saved-catalogue', stale: true,
      latestVideos: savedFeed.latestVideos, latestLongVideos: savedFeed.latestLongVideos,
      latestShorts: savedFeed.latestShorts }, 200, {
      'cache-control': 'public, max-age=60',
      'netlify-cdn-cache-control': 'public, s-maxage=60'
    });
  }
};
