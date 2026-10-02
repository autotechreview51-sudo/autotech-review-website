const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/assets/publication.js'),'utf8');
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'../.sites-runtime/publication-fixtures.json'),'utf8'));
class Node {
  constructor(){this.events={};this.hidden=false;this.dataset={};this.attributes={};this.textContent='';this.classes=new Set();this.classList={add:n=>this.classes.add(n),toggle:(n,on)=>on?this.classes.add(n):this.classes.delete(n),remove:n=>this.classes.delete(n)};}
  addEventListener(type,handler){this.events[type]=handler;}
  dispatch(type,extra={}){return this.events[type]?.({preventDefault(){},...extra});}
  getAttribute(name){return this.attributes[name];}setAttribute(name,val){this.attributes[name]=val;}
  focus(){this.focused=true;}select(){this.selected=true;}scrollIntoView(){this.scrolled=true;}
  append(...nodes){this.children=this.children||[];for(const node of nodes){this.children=this.children.filter(n=>n!==node);this.children.push(node);}}
}
function runtime(route='/',query=''){
  const fix=fixtures[route], menu=new Node(),nav=new Node(),count=new Node(),empty=new Node(),clear=new Node(),form=new Node(),document=new Node();
  menu.attributes['aria-expanded']='false';
  const controls=Object.fromEntries(Object.entries(fix.controls).map(([key,value])=>[key,Object.assign(new Node(),{value:value.value,disabled:value.disabled,options:value.options.map(v=>({value:v}))})]));
  form.elements={namedItem:key=>controls[key]};
  const cards=fix.cards.map(card=>Object.assign(new Node(),{dataset:card}));
  const discovery=new Node(),grid=new Node(),pick=new Node(),sortLabel=new Node();discovery.dataset.fixedFormat=fix.fixedFormat;
  discovery.querySelector=selector=>({'.filters':form,'[data-result-count]':count,'[data-empty]':empty,'[data-clear]':clear,'.video-grid':grid,'[data-pick]':pick,'[data-sort-label]':sortLabel}[selector]);
  discovery.querySelectorAll=()=>cards;
  const nodes={'.menu-toggle':menu,'#primary-nav':nav,'[data-discovery]':discovery};
  document.querySelector=s=>nodes[s]||null;document.querySelectorAll=()=>[];
  const window=new Node(),location={href:'https://example.test'+route+query,search:query,pathname:route};window.location={assign:target=>{window.target=target;}};
  const history={replaceState:(a,b,url)=>{history.url=url;}};
  const context={document,window,location,history,URL,URLSearchParams,console,FormData:class{constructor(f){this.values=f.values}get(key){return this.values[key]}}};
  vm.runInNewContext(source,context);
  return {context,document,nodes,controls,form,cards,count,empty,clear,menu,nav,history,grid,pick,sortLabel,rerun:()=>vm.runInNewContext(source,context)};
}
let t=runtime();assert.equal(t.count.textContent,'13 videos');
t.controls.make.value='Toyota';t.controls.type.value='Sedan';t.controls.year.value='2026';t.controls.format.value='long';t.form.dispatch('change');
assert.deepEqual(t.cards.filter(c=>!c.hidden).map(c=>c.dataset.video),['1tx4EhDBoxY']);assert.match(t.history.url,/make=Toyota/);
t.controls.make.value='BMW';t.form.dispatch('change');assert.equal(t.count.textContent,'0 videos');assert.equal(t.empty.hidden,false);
t.clear.dispatch('click');assert.equal(t.count.textContent,'13 videos');assert.equal(t.empty.hidden,true);assert.equal(t.controls.make.focused,true);
t.controls.format.value='short';t.form.dispatch('change');assert.equal(t.count.textContent,'8 videos');assert(t.cards.filter(c=>!c.hidden).every(c=>c.dataset.format==='short'));
t=runtime('/long-videos/','?make=BMW');assert.equal(t.count.textContent,'1 video');assert.equal(t.cards.find(c=>!c.hidden).dataset.video,'GmdUmrDhZSg');
t=runtime('/shorts/','?format=long');assert.equal(t.count.textContent,'8 videos');assert(t.cards.every(c=>c.dataset.format==='short'));
t=runtime('/','?make=NotARealMake');assert.equal(t.count.textContent,'13 videos');
// Search, sorting and suggestions use the current filtered collection.
t.controls.q.value='camry start';t.controls.q.dispatch('input');assert.equal(t.count.textContent,'1 video');
assert.equal(t.cards.find(c=>!c.hidden).dataset.video,'ciwldF2hUn4');t.pick.dispatch('click');assert.match(t.context.window.target,/camry-xse-start-up\/#watch$/);
t.controls.q.value='nonexistent';t.controls.q.dispatch('input');assert.equal(t.pick.disabled,true);
t.clear.dispatch('click');assert.equal(t.controls.q.value,'');assert.equal(t.count.textContent,'13 videos');
t.controls.sort.value='oldest';t.form.dispatch('change');assert.equal(t.grid.children[0].dataset.video,'GmdUmrDhZSg');assert.equal(t.sortLabel.textContent,'Oldest first');
t=runtime('/','?q=glc&sort=oldest');assert.equal(t.count.textContent,'2 videos');assert.equal(t.controls.sort.value,'oldest');
t.menu.dispatch('click');assert.equal(t.menu.attributes['aria-expanded'],'true');assert(t.nav.classes.has('is-open'));
t.document.dispatch('keydown',{key:'Escape'});assert.equal(t.menu.attributes['aria-expanded'],'false');assert.equal(t.menu.focused,true);
// Run the production brief handler against entered values; nothing is sent.
const brief=new Node();brief.reportValidity=()=>true;brief.values={name:'Example Client',email:'client@example.test',company:'Brand & Co\nInjected',website:'https://example.test',campaign:'YouTube integration',market:'Canada',budget:'CAD 3,000',timing:'November 2026',details:'A product demo & two Shorts',rights:'30-day paid usage'};
const result=new Node(),prepared=new Node(),open=new Node(),copy=new Node(),status=new Node();
result.hidden=true;
t=runtime();Object.assign(t.nodes,{'#partner-form':brief,'.draft-result':result,'#prepared-brief':prepared,'#open-brief':open,'#copy-brief':copy,'.copy-status':status});t.context.window.matchMedia=()=>({matches:true});t.rerun();brief.dispatch('submit');
assert.equal(result.hidden,false);assert.match(prepared.value,/50% before production/);assert.match(open.href,/^mailto:autotechreview51@gmail.com\?subject=/);assert.match(open.href,/%26/);assert(!decodeURIComponent(open.href.split('&body=')[0]).includes('\n'));assert.equal(t.context.location.href,'https://example.test/');
// The player stays local until the visitor chooses to load YouTube.
t=runtime();const playButton=new Node(),player=new Node();player.dataset.id='Zl3P77Mk39o';player.replaceChildren=element=>{player.child=element;};playButton.closest=()=>player;t.context.document.querySelectorAll=s=>s==='[data-load-video]'?[playButton]:[];t.context.document.createElement=()=>new Node();t.rerun();assert.equal(player.child,undefined);playButton.dispatch('click');assert.match(player.child.src,/^https:\/\/www.youtube-nocookie.com\/embed\/Zl3P77Mk39o/);
console.log(JSON.stringify({checks:['combined filters','empty results','reset','fixed-format separation','query hydration','search','sorting','filtered suggestions','menu and Escape','campaign draft encoding and no-send behavior','click-to-load privacy-enhanced player'],result:'passed',scope:'DOM fixtures; live browser checks are separate'}));
