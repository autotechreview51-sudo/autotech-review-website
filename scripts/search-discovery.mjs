import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
export function writeSearchDiscovery({out, origin, routes, videos, href, view, absoluteImage, esc, privateSite, key}) {
  const manifestPath = path.join(out, 'data/search-manifest.json');
  let previous = {pages:[]};
  try { previous = JSON.parse(fs.readFileSync(manifestPath,'utf8')); } catch {}
  const old = new Map(previous.pages.map(page=>[page.url,page]));
  const changed = [];
  const today = new Date().toISOString().slice(0,10);
  const pages = routes.filter(route=>route!='/404.html').map(route=>{
    const file = path.join(out,route==='/'?'index.html':route.slice(1)+'index.html');
    // A catalogue check is not a material edit to every article.
    const content = fs.readFileSync(file,'utf8').replace(/Content catalogue checked [^<]+/g,'Content catalogue checked');
    const digest = hash(content), url = origin+route, prior = old.get(url);
    if (digest !== prior?.digest) changed.push(url);
    return {url,digest,modified:digest===prior?.digest?prior.modified:today};
  });
  for (const url of old.keys()) if(!pages.some(page=>page.url===url)) changed.push(url);
  const version = hash(JSON.stringify({origin,privateSite,pages})).slice(0,24);
  const manifest = {origin,private:privateSite,version,pages,changed:version===previous.version?previous.changed:changed};
  fs.mkdirSync(path.join(out,'data'),{recursive:true});
  fs.writeFileSync(manifestPath,JSON.stringify(manifest));
  fs.writeFileSync(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p=>`<url><loc>${esc(p.url)}</loc><lastmod>${p.modified}</lastmod></url>`).join('')}</urlset>`);
  fs.writeFileSync(path.join(out,'sitemap-index.xml'),`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['sitemap.xml','video-sitemap.xml','image-sitemap.xml'].map(name=>`<sitemap><loc>${origin}/${name}</loc></sitemap>`).join('')}</sitemapindex>`);
  fs.writeFileSync(path.join(out,'video-sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${videos.map(v=>`<url><loc>${origin+view(v)}</loc><video:video><video:thumbnail_loc>${esc(absoluteImage(v))}</video:thumbnail_loc><video:title>${esc(v.originalTitle)}</video:title><video:description>${esc(v.description)}</video:description><video:player_loc>https://www.youtube-nocookie.com/embed/${v.id}</video:player_loc><video:publication_date>${v.published}</video:publication_date></video:video></url>`).join('')}</urlset>`);
  fs.writeFileSync(path.join(out,'image-sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${videos.map(v=>`<url><loc>${origin+href(v)}</loc><image:image><image:loc>${esc(absoluteImage(v))}</image:loc></image:image></url>`).join('')}</urlset>`);
  const feed = (name,items,label) => {
    const entries = items.map(v=>`<item><title>${esc(v.originalTitle)}</title><link>${origin+href(v)}</link><guid isPermaLink="true">${origin+href(v)}</guid><pubDate>${new Date(v.published).toUTCString()}</pubDate><category>${v.format==='short'?'Short':v.format==='long'?'Long video':'Video'}</category><description>${esc(v.description)}</description><media:thumbnail url="${esc(absoluteImage(v))}"/><media:player url="${origin+view(v)}"/></item>`).join('');
    fs.writeFileSync(path.join(out,name),`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>AutoTech Review — ${label}</title><link>${origin}/</link><description>Automotive videos with Canadian buyer context.</description><language>en-ca</language><atom:link href="${origin}/${name}" rel="self" type="application/rss+xml"/>${entries}</channel></rss>`);
  };
  feed('feed.xml',videos,'latest videos');
  feed('long-videos-feed.xml',videos.filter(v=>v.format==='long'),'Long Videos');
  feed('shorts-feed.xml',videos.filter(v=>v.format==='short'),'Shorts');
  fs.writeFileSync(path.join(out,'robots.txt'),privateSite?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap-index.xml\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/video-sitemap.xml\n`);
  if(!privateSite) fs.writeFileSync(path.join(out,key+'.txt'),key);
  else if(fs.existsSync(path.join(out,key+'.txt'))) fs.unlinkSync(path.join(out,key+'.txt'));
  return manifest;
}
