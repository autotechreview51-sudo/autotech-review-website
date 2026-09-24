import { readFile, writeFile } from 'node:fs/promises';

const channelId = 'UCNmOAbN5owAdafiNTgiOWDw';
const channelHandle = '@autotechreview51';
const fileUrl = new URL('../data/site-content.json', import.meta.url);
const content = JSON.parse(await readFile(fileUrl, 'utf8'));
const previous = JSON.stringify(content);
let feedRefreshed = false;
let subscriberRefreshed = false;

const decodeXml = (value) => value
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>');

try {
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  if (!response.ok) throw new Error(`RSS returned ${response.status}`);
  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => ({
    id: entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1],
    title: decodeXml(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? 'Latest AutoTech Review video'),
    published: entry.match(/<published>([^<]+)<\/published>/)?.[1]
  })).filter((video) => video.id && video.published);
  const classified = await Promise.all(entries.map(async (video) => {
    try {
      const shortResponse = await fetch(`https://www.youtube.com/shorts/${video.id}`, {
        redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 AutoTechReviewSiteUpdater/1.0' }
      });
      return { ...video, isShort: new URL(shortResponse.url).pathname.startsWith('/shorts/') };
    } catch {
      return { ...video, isShort: false };
    }
  }));
  content.latestLongVideos = classified.filter((video) => !video.isShort).slice(0, 3);
  content.latestShorts = classified.filter((video) => video.isShort).slice(0, 3);
  content.latestVideos = classified.slice(0, 6);
  feedRefreshed = true;
} catch (error) {
  console.warn(`Keeping the existing video list: ${error.message}`);
}

try {
  const response = await fetch(`https://www.youtube.com/${channelHandle}`, {
    headers: { 'user-agent': 'Mozilla/5.0 AutoTechReviewSiteUpdater/1.0' }
  });
  if (!response.ok) throw new Error(`Channel page returned ${response.status}`);
  const html = await response.text();
  const match = html.match(/"subscriberCountText":\{"simpleText":"([^"]+) subscribers"/);
    if (match?.[1]) {
      content.metrics.subscribers = match[1];
      subscriberRefreshed = true;
    }
} catch (error) {
  console.warn(`Keeping the existing subscriber count: ${error.message}`);
}

const next = JSON.stringify(content);
if ((feedRefreshed || subscriberRefreshed) && next !== previous) {
  content.updatedAt = new Date().toISOString();
  await writeFile(fileUrl, `${JSON.stringify(content, null, 2)}\n`);
  console.log(`Updated ${content.latestLongVideos.length} long videos, ${content.latestShorts.length} Shorts and subscriber count ${content.metrics.subscribers}.`);
} else {
  console.log('No reliable YouTube feed change detected; keeping the existing content file.');
}
