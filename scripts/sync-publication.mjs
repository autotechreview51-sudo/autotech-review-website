import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const data=read('data/publication.json'),feed=read('data/site-content.json'),provenance=read('data/cover-provenance.json');
const known=new Set(data.videos.map(v=>v.id));
const candidates=new Map([...(feed.latestVideos||[]),...(feed.latestLongVideos||[]),...(feed.latestShorts||[])].map(v=>[v.id,v]));
const matches=(title,vehicle)=>{
 const year=title.match(/\b20\d{2}\b/)?.[0];
 if(!year)return false;
 if(year && Number(year)!==vehicle.year)return false;
 const aliases={'GLC 300':/\bGLC\s*300\b/i,'Camry XSE AWD':/\bCamry\b/i,'Corolla Cross Hybrid':/\bCorolla\s*Cross\b/i,'RAV4':/\bRAV4\b/i,'iX3':/\biX3\b/i};
 return aliases[vehicle.model]?.test(title)||false;
};
let added=0;
for(const v of candidates.values()){
 if(known.has(v.id)||!/^[-\w]{11}$/.test(v.id)||typeof v.isShort!=='boolean'||typeof v.title!=='string'||!Number.isFinite(Date.parse(v.published)))continue;
 const vehicles=data.vehicles.filter(x=>matches(v.title,x)).map(x=>x.slug);
 const title=String(v.title).replace(/\s*#\S+/g,'').trim();
 const entry={id:v.id,slug:'channel-'+v.id,title,originalTitle:v.title,published:v.published,format:v.isShort?'short':'long',kind:v.isShort?'Quick look':'Channel video',vehicles,description:`Watch ${v.isShort?'this Short':'the full video'} from AutoTech Review: ${title}.`};
 if(!v.isShort)Object.assign(entry,{question:'Watch the complete discussion.',topics:['Published channel coverage','Vehicle details','Related coverage'],checks:['Confirm the exact model year and local-market trim.','Check current pricing and availability with the manufacturer or retailer.','Watch the full video for the complete context.']});
 provenance.push({id:v.id,kind:'YouTube remote thumbnail',source:`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`});
 data.videos.push(entry);known.add(v.id);added++;
}
if(added){data.contentChecked=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto'}).format(new Date(feed.updatedAt||Date.now()));fs.writeFileSync(path.join(root,'data/publication.json'),JSON.stringify(data,null,2)+'\n');fs.writeFileSync(path.join(root,'data/cover-provenance.json'),JSON.stringify(provenance,null,2)+'\n');}
console.log(`Publication sync: ${added} new videos; ${data.videos.length} total.`);
