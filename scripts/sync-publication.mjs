import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cleanTitle, feedVideos, matchingVehicles, videoMetadata } from '../netlify/lib/catalogue.mjs';

export function syncPublication(data, feed, provenance, now = new Date()) {
  const before = JSON.stringify(data);
  const known = new Map(data.videos.map(v => [v.id,v]));
  let added = 0;
  for (const source of feedVideos(feed)) {
    let entry = known.get(source.id);
    const contentFormat = source.isShort === true ? 'short' : source.isShort === false ? 'long' : 'unclassified';
    const title = cleanTitle(source.title);
    if (!entry) {
      entry = {id:source.id,slug:'channel-'+source.id,title,originalTitle:source.title,published:source.published,format:contentFormat,kind:'Channel video',vehicles:matchingVehicles(source.title,data.vehicles).map(v=>v.slug),automatic:true};
      data.videos.push(entry); known.set(entry.id,entry); added++;
      provenance.push({id:entry.id,kind:'YouTube remote thumbnail',source:`https://img.youtube.com/vi/${entry.id}/hqdefault.jpg`,title:source.title,format:contentFormat});
    }
    entry.originalTitle = source.title;
    entry.published = source.published;
    if (contentFormat !== 'unclassified' || !['long','short'].includes(entry.format)) entry.format = contentFormat;
    if (entry.automatic) {
      entry.title = title;
      entry.kind = entry.format === 'short' ? 'Quick look' : 'Channel video';
      entry.vehicles = matchingVehicles(source.title,data.vehicles).map(v=>v.slug);
      entry.description = `Watch ${entry.format === 'short' ? 'this Short' : entry.format === 'long' ? 'the full video' : 'this video'} from AutoTech Review: ${title}.`;
    }
    if (entry.format !== 'short' && !entry.topics) Object.assign(entry,{question:'Watch the complete discussion.',topics:['Published channel coverage','Related coverage'],checks:['Confirm the exact model year and local-market trim.','Check current pricing and availability with the manufacturer or retailer.','Watch the video for the complete context.']});
  }
  for (const entry of data.videos) Object.assign(entry,videoMetadata(entry.originalTitle,data.vehicles.filter(v=>entry.vehicles.includes(v.slug))));
  if (feed.metrics?.subscribers) data.subscribers = feed.metrics.subscribers;
  const changed = JSON.stringify(data) !== before;
  if (changed) data.contentChecked = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto'}).format(now);
  return { added, changed, total:data.videos.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
  const data = read('data/publication.json'), feed = read('data/site-content.json'), provenance = read('data/cover-provenance.json');
  const result = syncPublication(data,feed,provenance);
  if (result.changed) {
    fs.writeFileSync(path.join(root,'data/publication.json'),JSON.stringify(data,null,2)+'\n');
    fs.writeFileSync(path.join(root,'data/cover-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  }
  console.log(`Publication sync: ${result.added} new videos; ${result.total} total; ${result.changed?'updated':'unchanged'}.`);
}
