import { readFile, writeFile } from 'node:fs/promises';
import { CHANNEL_HANDLE, loadChannelFeed } from '../netlify/lib/youtube.mjs';

const fileUrl = new URL('../data/site-content.json', import.meta.url);
const content = JSON.parse(await readFile(fileUrl, 'utf8'));
const { updatedAt: _ignored, ...previousComparable } = content;
const previous = JSON.stringify(previousComparable);

try {
  const feed = await loadChannelFeed({ previous: [...(content.latestVideos || []), ...(content.latestLongVideos || []), ...(content.latestShorts || [])] });
  // Never replace a populated tab with an empty one.
  if (feed.latestLongVideos.length) content.latestLongVideos = feed.latestLongVideos;
  else console.warn('No long videos detected; keeping the previous long-video list.');
  if (feed.latestShorts.length) content.latestShorts = feed.latestShorts;
  else console.warn('No Shorts detected; keeping the previous Shorts list.');
  content.latestVideos = feed.latestVideos;
} catch (error) {
  console.warn(`Keeping the existing video list: ${error.message}`);
}

try {
  const response = await fetch(`https://www.youtube.com/${CHANNEL_HANDLE}`, {
    headers: { 'user-agent': 'Mozilla/5.0 AutoTechReviewSiteUpdater/2.0', 'accept-language': 'en-CA,en;q=0.9' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Channel page returned ${response.status}`);
  const html = await response.text();
  const match = html.match(/"subscriberCountText":\{"simpleText":"([^"]+) subscribers"/)
    || html.match(/"content":"([\d.,]+[KM]?) subscribers"/);
  if (match?.[1]) {
    content.metrics = { ...(content.metrics || {}), subscribers: match[1] };
  }
} catch (error) {
  console.warn(`Keeping the existing subscriber count: ${error.message}`);
}

const { updatedAt: _unused, ...nextComparable } = content;
if (JSON.stringify(nextComparable) !== previous) {
  content.updatedAt = new Date().toISOString();
  await writeFile(fileUrl, `${JSON.stringify(content, null, 2)}\n`);
  console.log(`Updated: ${content.latestLongVideos.length} long videos, ${content.latestShorts.length} Shorts, subscribers ${content.metrics?.subscribers}.`);
} else {
  console.log('No content change; data/site-content.json left untouched.');
}
