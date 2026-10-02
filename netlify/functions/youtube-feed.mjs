import { loadChannelFeed } from '../lib/youtube.mjs';
import savedFeed from '../../data/site-content.json' with { type: 'json' };
import publication from '../../data/publication.json' with { type: 'json' };
import { feedVideos } from '../lib/catalogue.mjs';

const FRESH_SECONDS = 300;
let lastGood = null;       // survives between requests on a warm instance

const json = (body, status, cacheHeaders) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=UTF-8', ...cacheHeaders }
});

export default async () => {
  try {
    const feed = await loadChannelFeed({ previous: lastGood?.archive ?? feedVideos(savedFeed), vehicles: publication.vehicles });
    lastGood = { updatedAt: new Date().toISOString(), source: 'youtube-rss', ...feed };
    const { archive, ...publicFeed } = lastGood;
    return json(publicFeed, 200, {
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': `public, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=60, durable`
    });
  } catch (error) {
    console.warn(`youtube-feed: ${error.message}`);
    if (lastGood) {
      const { archive, ...publicFeed } = lastGood;
      return json({ ...publicFeed, stale: true }, 200, {
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
