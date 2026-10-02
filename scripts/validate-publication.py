import json, pathlib, re, sys, hashlib
from urllib.parse import urlsplit, unquote
from lxml import html, etree

root=pathlib.Path(__file__).resolve().parents[1]
dist=root/'dist'
config=json.loads((root/'data/publication.json').read_text())
origin=config['origin']
errors=[]
links=0
def check(condition,message):
    if not condition: errors.append(message)
def local_target(url):
    parsed=urlsplit(url)
    if parsed.scheme or parsed.netloc: return None
    route=unquote(parsed.path)
    if not route: return None
    target=dist/route.lstrip('/')
    if route.endswith('/'): target=target/'index.html'
    return target
fixtures={}
for file in sorted(dist.rglob('*.html')):
    relative=file.relative_to(dist)
    doc=html.fromstring(file.read_text())
    canonical=doc.xpath('//link[@rel="canonical"]/@href')
    check(len(canonical)==1, f'{relative}: missing/duplicate canonical')
    check(bool(doc.xpath('//title/text()')),f'{relative}: missing title')
    check(bool(doc.xpath('//meta[@name="viewport"]')),f'{relative}: missing viewport')
    check(doc.xpath('//meta[@name="robots"]/@content')==(['noindex, nofollow, noarchive'] if config['private'] else ['index, follow']) or bool(doc.xpath('//meta[@http-equiv="refresh"]')),f'{relative}: private indexing guard missing')
    ids=doc.xpath('//*[@id]/@id')
    check(len(ids)==len(set(ids)),f'{relative}: duplicate element IDs')
    is_alias=bool(doc.xpath('//meta[@http-equiv="refresh"]'))
    if not is_alias:
        check(len(doc.xpath('//h1'))==1,f'{relative}: must have one H1')
        check(bool(doc.xpath('//main[@id="main"]')),f'{relative}: missing main landmark')
        check(bool(doc.xpath('//meta[@name="description"]/@content')),f'{relative}: missing description')
        for script in doc.xpath('//script[@type="application/ld+json"]/text()'):
            graph=json.loads(script)['@graph']
            check(any(x['@type']=='WebPage' or x['@type']=='CollectionPage' or x['@type']=='Article' for x in graph),f'{relative}: missing page schema')
            for obj in graph:
                if obj.get('@type')=='VideoObject':
                    check(bool(obj.get('uploadDate') and obj.get('thumbnailUrl') and obj.get('embedUrl')),f'{relative}: incomplete video schema')
        for input_element in doc.xpath('//form//input | //form//select | //form//textarea'):
            check(bool(input_element.xpath('ancestor::label')),f'{relative}: unlabeled field')
    for image in doc.xpath('//img'):
        check('alt' in image.attrib,f'{relative}: image missing alt')
        check('width' in image.attrib and 'height' in image.attrib,f'{relative}: image dimensions missing')
    for element in doc.xpath('//*[@href or @src]'):
        for attr in ['href','src']:
            url=element.get(attr)
            if not url:continue
            links+=1
            parsed=urlsplit(url)
            target=local_target(url)
            if target:
                check(target.is_file(),f'{relative}: broken {attr} {url}')
                if target.is_file() and parsed.fragment and target.suffix=='.html':
                    targetdoc=html.fromstring(target.read_text())
                    check(parsed.fragment in targetdoc.xpath('//*[@id]/@id'),f'{relative}: missing anchor {url}')
            elif parsed.fragment and not parsed.path and not parsed.scheme:
                check(parsed.fragment in ids,f'{relative}: missing on-page anchor {url}')
            elif parsed.scheme:
                check(parsed.scheme in ['https','mailto','data'],f'{relative}: invalid external protocol {url}')
    nodes=doc.xpath('//*[@data-discovery]')
    if nodes:
        discovery=nodes[0]
        controls={}
        for select in discovery.xpath('.//select'):
            options=[o.get('value','') for o in select.xpath('./option')]
            selected=select.xpath('./option[@selected]/@value')
            controls[select.get('name')]={'options':options,'value':selected[0] if selected else options[0],'disabled':'disabled' in select.attrib}
        controls['q']={'options':[],'value':'','disabled':False}
        fixtures['/'+str(relative).replace('index.html','')]={'controls':controls,'fixedFormat':discovery.get('data-fixed-format'),'cards':[{key:node.get('data-'+key,'') for key in ['video','make','year','type','format','search','published','url']} for node in discovery.xpath('.//*[@data-video]')]}

for name in ['sitemap.xml','video-sitemap.xml']:
    tree=etree.parse(str(dist/name))
    for loc in tree.xpath('//*[local-name()="loc"]/text()'):
        check(loc.startswith(origin),name+': wrong origin')
        target=local_target(loc[len(origin):])
        check(target is not None and target.is_file(),name+': missing route '+loc)
check(('Disallow: /' if config['private'] else 'Allow: /') in (dist/'robots.txt').read_text(),'Robots guard incorrect')
check(('X-Robots-Tag: noindex' if config['private'] else 'X-Robots-Tag: index') in (dist/'_headers').read_text(),'Robots header incorrect')
if not config['private']:
    redirects=(dist/'_redirects').read_text().splitlines()
    check(len(redirects)==7,'Legacy redirects missing')
    for line in redirects:
        old,new,status=line.split()
        check(status=='301!','Legacy redirect must override pretty URL handling')
        check(not local_target(old).exists(),'Legacy HTML file can shadow a canonical route')
        check(local_target(new).is_file(),'Legacy redirect destination missing')
css=(dist/'assets/publication.css').read_text()
for width in [1050,800,560]:check(f'@media(max-width:{width}px)' in css,f'Responsive breakpoint {width} missing')
check('repeat(2,minmax(0,1fr))' in css and 'grid-template-columns:1fr' in css,'Mobile columns missing')
check('prefers-reduced-motion:reduce' in css,'Reduced-motion support missing')
check('.brief-form{grid-template-columns:1fr' in css,'Mobile form layout missing')
check('.primary-nav.is-open{display:flex}' in css,'Mobile menu layout missing')
check('max-width:100%' in css and 'min-width:0' in css,'Width containment missing')
check(not re.search(r'(?:^|[;{])(?:min-width|width):(?:[5-9]\d\d|\d{4,})px',css),'Large fixed content width risks mobile overflow')
provenance={v['id']:v for v in json.loads((root/'data/cover-provenance.json').read_text())}
for video in config['videos']:
    record=provenance.get(video['id'],{})
    check(record.get('kind')=='YouTube video thumbnail',video['id']+': unverified thumbnail')
    check('/vi/'+video['id']+'/' in record.get('source',''),video['id']+': wrong thumbnail source')
    check(record.get('title')==video['originalTitle'],video['id']+': thumbnail title mismatch')
    cover=dist/'assets/thumbnails'/ (video['id']+'.jpg')
    check(cover.is_file(),video['id']+': thumbnail missing')
    if cover.is_file():
        check(hashlib.sha256(cover.read_bytes()).hexdigest()==record.get('sha256'),video['id']+': thumbnail hash mismatch')
fixtures_path=root/'.sites-runtime/publication-fixtures.json'
fixtures_path.parent.mkdir(parents=True,exist_ok=True)
fixtures_path.write_text(json.dumps(fixtures))
report={'htmlPages':len(list(dist.rglob('*.html'))),'linkAndAssetReferences':links,'videoPages':len(config['videos']),'indexingGuards':'private' if config['private'] else 'public','responsiveSourceChecks':'passed' if not errors else 'failed','scope':'source checks; live browser checks are separate','errors':errors}
print(json.dumps(report,indent=2))
if errors:sys.exit(1)
