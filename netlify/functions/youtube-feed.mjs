const CHANNEL_ID = 'UCNmOAbN5owAdafiNTgiOWDw';

const decodeXml = (value) => String(value ?? '')
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>');

const getTag = (entry, tag) =>
  entry.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1];

const classifyVideo = async (video) => {
  try {
    const response = await fetch(
      `https://www.youtube.com/shorts/${video.id}`,
      { redirect: 'follow' }
    );

    return {
      ...video,
      isShort: new URL(response.url).pathname.startsWith('/shorts/')
    };
  } catch {
    return { ...video, isShort: false };
  }
};

export default async () => {
  try {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
    );

    if (!response.ok) {
      throw new Error(`YouTube returned ${response.status}`);
    }

    const xml = await response.text();

    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
      .map(([, entry]) => ({
        id: getTag(entry, 'yt:videoId'),
        title: decodeXml(getTag(entry, 'title') || 'AutoTech Review video'),
        published: getTag(entry, 'published')
      }))
      .filter((video) => video.id && video.published);

    const classified = await Promise.all(
      videos.slice(0, 12).map(classifyVideo)
    );

    return new Response(JSON.stringify({
      updatedAt: new Date().toISOString(),
      latestVideos: classified.slice(0, 6),
      latestLongVideos: classified.filter((video) => !video.isShort).slice(0, 3),
      latestShorts: classified.filter((video) => video.isShort).slice(0, 3)
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'cache-control':
          'public, max-age=900, s-maxage=900, stale-while-revalidate=3600'
      }
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'YouTube feed temporarily unavailable' }),
      {
        status: 503,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'cache-control': 'no-store'
        }
      }
    );
  }
};
