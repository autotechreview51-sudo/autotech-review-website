// Shared YouTube feed logic used by the Netlify function and the GitHub Actions updater.
import { matchingVehicles, videoMetadata, validVideo } from './catalogue.mjs';
export const CHANNEL_ID = 'UCNmOAbN5owAdafiNTgiOWDw';
export const CHANNEL_HANDLE = '@autotechreview51';
export const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const USER_AGENT = 'Mozilla/5.0 (compatible; AutoTechReviewSite/2.0; +https://www.autotechreview.ca/)';
const REQUEST_TIMEOUT_MS = 8000;

const codePoint = code => Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\uFFFD';
export const decodeXml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => codePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => codePoint(parseInt(code, 16)))
  .replaceAll('&quot;', '"')
  .replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&amp;', '&');

const getTag = (entry, tag) =>
  entry.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim();

export const parseFeed = (xml) => [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
  .map(([, entry]) => ({
    id: getTag(entry, 'yt:videoId'),
    title: decodeXml(getTag(entry, 'title') || 'AutoTech Review video'),
    published: getTag(entry, 'published')
  }))
  .filter(validVideo);

const timedFetch = (fetchImpl, url, options = {}) =>
  fetchImpl(url, {
    ...options,
    headers: { 'user-agent': USER_AGENT, 'accept-language': 'en-CA,en;q=0.9', ...(options.headers || {}) },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

// youtube.com/shorts/<id> answers 200 for a Short and redirects (3xx) to /watch for a long video.
// Returns true, false, or null when YouTube gave no usable answer.
export const detectShort = async (id, fetchImpl = fetch) => {
  try {
    const response = await timedFetch(fetchImpl, `https://www.youtube.com/shorts/${id}`, {
      method: 'HEAD',
      redirect: 'manual'
    });
    if (response.status === 200) return true;
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') || '';
      const target = new URL(location, 'https://www.youtube.com');
      if (!['www.youtube.com', 'youtube.com'].includes(target.hostname)) return null;
      if (target.pathname === '/watch' && target.searchParams.get('v') === id) return false;
      if (target.pathname === `/shorts/${id}`) return true;
      return null; // consent or other interstitial: unknown
    }
    return null;
  } catch {
    return null;
  }
};

// Fetches the channel RSS feed and splits it into long videos and Shorts.
// Throws if the feed itself is unavailable or empty so callers can keep their last good data.
export const loadChannelFeed = async ({ fetchImpl = fetch, previous = [], vehicles = [] } = {}) => {
  const response = await timedFetch(fetchImpl, FEED_URL);
  if (!response.ok) throw new Error(`YouTube RSS returned ${response.status}`);
  const entries = [...new Map(parseFeed(await response.text()).map(v => [v.id,v])).values()];
  if (!entries.length) throw new Error('YouTube RSS returned no videos');

  const known = new Map(previous.filter((video) => typeof video?.isShort === 'boolean').map((video) => [video.id, video.isShort]));
  const classified = await Promise.all(entries.map(async (video) => {
    let isShort = await detectShort(video.id, fetchImpl);
    if (isShort === null && known.has(video.id)) isShort = known.get(video.id);
    // An unavailable format probe is not evidence that a new upload is a long video.
    return { ...video, isShort, ...videoMetadata(video.title, matchingVehicles(video.title, vehicles)) };
  }));

  const archive = [...new Map([...previous.filter(validVideo), ...classified].map(v => [v.id,v])).values()].sort((a,b) => Date.parse(b.published) - Date.parse(a.published));
  return {
    archive,
    latestVideos: classified,
    latestLongVideos: archive.filter(video => video.isShort === false).slice(0, 6),
    latestShorts: archive.filter(video => video.isShort === true).slice(0, 6)
  };
};
