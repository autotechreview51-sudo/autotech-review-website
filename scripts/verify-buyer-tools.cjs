const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../dist/assets/buyer-tools.js'), 'utf8');
class Node {
  constructor(value = '') { this.value = value; this.events = {}; this.hidden = false; this.textContent = ''; }
  addEventListener(type, fn) { this.events[type] = fn; }
  fire(type) { return this.events[type]?.({preventDefault() {}}); }
  focus() { this.focused = true; } select() { this.selected = true; }
}
function fuel(query = '') {
  const defaults = {units:'metric',currency:'CAD',distance:'20000',price:'1.65',a:'8',b:'6.5',nameA:'Vehicle A',nameB:'Vehicle B'};
  const controls = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, new Node(value)]));
  for (const [key, min, max] of [['distance',0,200000],['price',0,100],['a',0.1,1000],['b',0.1,1000]]) Object.assign(controls[key], {min, max});
  const form = new Node(); form.elements = {namedItem:key => controls[key]};
  form.reportValidity = () => ['distance','price','a','b'].every(key => controls[key].value !== '' && Number.isFinite(Number(controls[key].value)) && Number(controls[key].value) >= controls[key].min && Number(controls[key].value) <= controls[key].max);
  const nodes = {'[data-fuel-form]':form};
  for (const key of ['fuel-output','fuel-status','comparison-link','copy-status','distance-label','price-label','name-a','name-b','month-a','month-b','year-a','year-b','fuel-difference','fuel-summary','copy-comparison']) nodes[`[data-${key}]`] = new Node();
  const linkInput = new Node(); nodes['[data-comparison-link]'].querySelector = () => linkInput;
  const labels = [new Node(), new Node()], pending = [];
  let current = new URL('https://www.autotechreview.ca/tools/fuel-cost-calculator/' + query);
  const document = {querySelector:selector => nodes[selector] || null, querySelectorAll:() => labels};
  const history = {replaceState(a,b,url) { current = new URL(url, current); }};
  const context = {document,location:{href:current.href,search:current.search},history,URL,URLSearchParams,Intl,navigator:{clipboard:{writeText:async value => {context.copied = value;}}},setTimeout:fn => pending.push(fn)};
  vm.runInNewContext(source, context);
  return {controls,form,nodes,linkInput,context,url:() => current,reset() {form.fire('reset'); for (const [key,value] of Object.entries(defaults)) controls[key].value = value; pending.splice(0).forEach(fn => fn());}};
}
async function main() {
  let t = fuel(); t.form.fire('submit');
  assert.match(t.nodes['[data-year-a]'].textContent, /2,640/); assert.match(t.nodes['[data-year-b]'].textContent, /2,145/);
  assert.match(t.nodes['[data-month-a]'].textContent, /220/); assert.match(t.nodes['[data-fuel-difference]'].textContent, /495/);
  t.controls.units.value = 'us'; t.controls.units.fire('change');
  assert(Math.abs(Number(t.controls.distance.value) - 12427.4238447467) < 0.0001);
  assert.match(t.nodes['[data-year-a]'].textContent, /2,640/); assert.match(t.nodes['[data-price-label]'].textContent, /US gallon/);
  t.controls.units.value = 'metric'; t.controls.units.fire('change');
  assert(Math.abs(Number(t.controls.a.value) - 8) < 1e-10);
  assert(Math.abs(Number(t.controls.distance.value) - 20000) < 1e-8);
  t.controls.a.value = ''; t.form.fire('input'); assert(t.nodes['[data-fuel-output]'].hidden); t.form.fire('submit'); assert(t.nodes['[data-fuel-output]'].hidden);
  t.reset(); assert.equal(t.controls.units.value, 'metric'); assert.match(t.nodes['[data-year-a]'].textContent, /2,640/);
  t = fuel('?units=us&currency=USD&distance=12000&price=3.5&a=30&b=40&nameA=Car%20A&nameB=Car%20B');
  assert.match(t.nodes['[data-year-a]'].textContent, /USD.*1,400/); assert.match(t.nodes['[data-year-b]'].textContent, /USD.*1,050/);
  assert.match(t.nodes['[data-fuel-difference]'].textContent, /Car B.*350/);
  await t.nodes['[data-copy-comparison]'].fire('click'); assert.equal(new URL(t.context.copied).searchParams.get('b'), '40');
  const restored = fuel(new URL(t.context.copied).search); assert.equal(restored.nodes['[data-year-a]'].textContent, t.nodes['[data-year-a]'].textContent);
  t.context.navigator.clipboard.writeText = async () => {throw Error('unavailable');};
  await t.nodes['[data-copy-comparison]'].fire('click'); assert(t.linkInput.focused && t.linkInput.selected);
  t.controls.distance.value = '0'; t.form.fire('submit'); assert.match(t.nodes['[data-fuel-difference]'].textContent, /equal/);
  t = fuel('?units=evil&currency=bad&a=0&price=-4&nameA=%3Cimg%20onerror%3Dalert(1)%3E');
  assert.equal(t.controls.units.value, 'metric'); assert.equal(t.controls.currency.value, 'CAD'); assert.equal(t.controls.a.value, '8');
  assert.equal(t.nodes['[data-name-a]'].textContent, '<img onerror=alert(1)>'); // Labels are text, never HTML.
  const checks = Array.from({length:16}, () => Object.assign(new Node(), {checked:false}));
  const checklist = new Node(), notes = new Node(), progress = new Node(), printed = new Node(), pending = [], window = new Node();
  checklist.elements = {namedItem:() => notes}; checklist.querySelectorAll = () => checks;
  const document = {querySelector:s => ({'[data-drive-checklist]':checklist,'[data-check-progress]':progress,'[data-print-notes]':printed}[s] || null)};
  vm.runInNewContext(source, {document,window,setTimeout:fn => pending.push(fn)});
  checks[0].checked = checks[15].checked = true; notes.value = 'Try the stroller.\nAsk about the exact trim.'; checklist.fire('input');
  assert.equal(progress.textContent, '2 of 16 items checked'); window.fire('beforeprint'); assert.equal(printed.textContent, notes.value);
  checklist.fire('reset'); checks.forEach(c => c.checked = false); notes.value = ''; pending.splice(0).forEach(fn => fn()); assert.equal(progress.textContent, '0 of 16 items checked');
  console.log(JSON.stringify({result:'passed',checks:['independent metric and US cost examples','unit conversion and round trip','invalid and zero inputs','bookmark restoration','copy fallback','untrusted labels rendered as text','checklist progress, print notes and reset']}));
}
main().catch(error => {console.error(error);process.exit(1);});
