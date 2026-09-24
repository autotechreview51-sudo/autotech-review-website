// Shared YouTube feed logic used by the Netlify function and the GitHub Actions updater.
export const CHANNEL_ID = 'UCNmOAbN5owAdafiNTgiOWDw';
export const CHANNEL_HANDLE = '@autotechreview51';
export const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const USER_AGENT = 'Mozilla/5.0 (compatible; AutoTechReviewSite/2.0; +https://www.autotechreview.ca/)';
const REQUEST_TIMEOUT_MS = 8000;

export const decodeXml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
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
  .filter((video) => video.id && /^[\w-]{11}$/.test(video.id) && video.published);

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
      if (location.includes('/watch')) return false;
      if (location.includes('/shorts/')) return true;
      return null; // consent or other interstitial: unknown
    }
    return null;
  } catch {
    return null;
  }
};

// Fetches the channel RSS feed and splits it into long videos and Shorts.
// Throws if the feed itself is unavailable or empty so callers can keep their last good data.
export const loadChannelFeed = async ({ fetchImpl = fetch, previous = [] } = {}) => {
  const response = await timedFetch(fetchImpl, FEED_URL);
  if (!response.ok) throw new Error(`YouTube RSS returned ${response.status}`);
  const entries = parseFeed(await response.text());
  if (!entries.length) throw new Error('YouTube RSS returned no videos');

  const known = new Map(previous.filter((video) => typeof video?.isShort === 'boolean').map((video) => [video.id, video.isShort]));
  const classified = await Promise.all(entries.map(async (video) => {
    let isShort = await detectShort(video.id, fetchImpl);
    if (isShort === null) isShort = known.has(video.id) ? known.get(video.id) : /#shorts?\b/i.test(video.title);
    return { ...video, isShort };
  }));

  return {
    latestVideos: classified.slice(0, 6),
    latestLongVideos: classified.filter((video) => !video.isShort).slice(0, 3),
    latestShorts: classified.filter((video) => video.isShort).slice(0, 3)
  };
};
