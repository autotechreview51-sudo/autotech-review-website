import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(fs.readFileSync(path.join(root,'data/search-discovery.json'),'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root,'dist/data/search-manifest.json'),'utf8'));
const publication = JSON.parse(fs.readFileSync(path.join(root,'data/publication.json'),'utf8'));
const expectedOrigin = 'https://www.autotechreview.ca';
if(publication.private || manifest.private) { console.log('Private publication: no search-engine notification.'); process.exit(0); }
if(manifest.origin!==expectedOrigin || publication.origin.replace(/\/$/,'')!==expectedOrigin) throw new Error('Origin is outside the authorized website.');
if(!/^[a-f0-9]{32}$/.test(config.indexNowKey)) throw new Error('Invalid verification key.');
const all = process.argv.includes('--all');
const urls = all ? manifest.pages.map(page=>page.url) : manifest.changed;
if(!urls.length) { console.log('No changed URLs.'); process.exit(0); }
for(const address of urls) {
  const url = new URL(address);
  if(url.origin!==expectedOrigin || url.search || url.hash || !url.pathname.endsWith('/')) throw new Error('Invalid canonical URL.');
}
const body = {host:new URL(expectedOrigin).host,key:config.indexNowKey,keyLocation:expectedOrigin+'/'+config.indexNowKey+'.txt',urlList:[...new Set(urls)]};
if(process.argv.includes('--dry-run')) { console.log(JSON.stringify({dryRun:true,host:body.host,urlCount:body.urlList.length,version:manifest.version})); process.exit(0); }
const retries = process.argv.includes('--wait') ? 24 : 1;
let ready=false;
for(let attempt=0;attempt<retries;attempt++) {
  try {
    const response=await fetch(expectedOrigin+'/data/search-manifest.json',{signal:AbortSignal.timeout(15000),cache:'no-store'});
    const live=await response.json();
    if(response.ok && live.version===manifest.version && live.private===false) {ready=true;break;}
  } catch {}
  if(attempt+1<retries) await new Promise(resolve=>setTimeout(resolve,10000));
}
if(!ready) throw new Error('The matching public version is not live yet; no URLs submitted.');
const keyResponse = await fetch(body.keyLocation,{signal:AbortSignal.timeout(15000),redirect:'error'});
if(!keyResponse.ok || (await keyResponse.text()).trim()!==config.indexNowKey) throw new Error('Live host verification failed.');
const response = await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
console.log(JSON.stringify({engine:'IndexNow',status:response.status,urlCount:body.urlList.length,version:manifest.version,meaning:'Received for processing; does not guarantee indexing or ranking.'}));
if(![200,202].includes(response.status)) throw new Error('Search notification rejected: '+response.status+' '+(await response.text()).slice(0,300));
