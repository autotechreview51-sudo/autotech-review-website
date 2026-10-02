(() => {
  'use strict';
  function protectThumbnail(img) {
    const id = img.dataset.thumbnailId;
    if (!/^[\w-]{11}$/.test(id || '')) return;
    const remote = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    function fallback() { img.src = '/assets/new-channel-cover.svg'; img.classList.add('image-unavailable'); img.alt = 'Thumbnail unavailable; open the video to watch.'; }
    const recover = () => {
      if (img.getAttribute('src') === remote) return fallback();
      img.addEventListener('error', fallback, { once: true });
      img.src = remote;
    };
    img.addEventListener('error', recover, { once: true });
    if (img.complete && img.naturalWidth === 0) recover();
  }
  document.querySelectorAll('[data-thumbnail-id]').forEach(protectThumbnail);
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  if (menu && nav) {
    menu.hidden = false;
    nav.classList.add('is-collapsed');
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        menu.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        menu.focus();
      }
    });
  }

  const discovery = document.querySelector('[data-discovery]');
  if (discovery) {
    const form = discovery.querySelector('.filters');
    const fields = ['make', 'type', 'year', 'format'];
    const controls = Object.fromEntries(fields.map(key => [key, form.elements.namedItem(key)]));
    const cards = [...discovery.querySelectorAll('[data-video]')];
    const fixedFormat = discovery.dataset.fixedFormat || '';
    const baseMake = controls.make.value;
    const count = discovery.querySelector('[data-result-count]');
    const empty = discovery.querySelector('[data-empty]');
    const search = form.elements.namedItem('q');
    const sort = form.elements.namedItem('sort');
    const grid = discovery.querySelector('.video-grid');
    const sortLabel = discovery.querySelector('[data-sort-label]');
    const pick = discovery.querySelector('[data-pick]');
    const params = new URLSearchParams(location.search);
    if (search) search.value = (params.get('q') || '').slice(0, 120);
    if (sort) sort.value = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
    for (const key of fields) {
      const value = params.get(key);
      if (value && !controls[key].disabled && [...controls[key].options].some(o => o.value === value)) controls[key].value = value;
    }
    function applyFilters(updateUrl = true) {
      const state = Object.fromEntries(fields.map(key => [key, key === 'format' && fixedFormat ? fixedFormat : controls[key].value]));
      let found = 0;
      const query = (search?.value || '').trim().toLocaleLowerCase();
      for (const card of cards) {
        const matches = fields.every(key => !state[key] || (card.dataset[key] || '').split('|').includes(state[key])) &&
          query.split(/\s+/).every(word => (card.dataset.search || card.textContent || '').toLocaleLowerCase().includes(word));
        card.hidden = !matches;
        if (matches) found++;
      }
      count.textContent = `${found} ${found === 1 ? 'video' : 'videos'}`;
      empty.hidden = found !== 0;
      const oldest = sort?.value === 'oldest';
      cards.sort((a,b) => (oldest ? 1 : -1) * (Date.parse(a.dataset.published) - Date.parse(b.dataset.published)));
      if (grid) cards.forEach(card => grid.append(card));
      if (sortLabel) sortLabel.textContent = oldest ? 'Oldest first' : 'Newest first';
      if (pick) { pick.hidden = false; pick.disabled = found === 0; }
      if (updateUrl) {
        const url = new URL(location.href);
        fields.forEach(key => {
          if (state[key] && !(key === 'format' && fixedFormat)) url.searchParams.set(key, state[key]);
          else url.searchParams.delete(key);
        });
        if (query) url.searchParams.set('q', search.value.trim()); else url.searchParams.delete('q');
        if (oldest) url.searchParams.set('sort', 'oldest'); else url.searchParams.delete('sort');
        history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
      return { filters: {...state,q:search?.value||'',sort:sort?.value||'newest'}, count: found, videos: cards.filter(card => !card.hidden).map(card => card.dataset.video) };
    }
    function reset() {
      fields.forEach(key => { controls[key].value = key === 'format' ? fixedFormat : key === 'make' ? baseMake : ''; });
      if (search) search.value = '';
      if (sort) sort.value = 'newest';
      applyFilters();
    }
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('change', () => applyFilters());
    search?.addEventListener('input', () => applyFilters());
    pick?.addEventListener('click', () => {
      const choices = cards.filter(card => !card.hidden);
      if (!choices.length) return;
      const target = choices[Math.floor(Math.random() * choices.length)].dataset.url;
      if (target && (target.startsWith('/videos/') || /^https:\/\/www\.youtube\.com\/(watch\?|shorts\/)/.test(target))) window.location.assign(target + (target.startsWith('/') ? '#watch' : ''));
    });
    form.addEventListener('reset', event => { event.preventDefault(); reset(); });
    discovery.querySelector('[data-clear]').addEventListener('click', () => { reset(); controls.make.focus(); });
    applyFilters(false);
    // Live updates supplement the crawlable catalogue between hourly rebuilds.
    if (typeof fetch === 'function' && ['/', '/reviews/', '/long-videos/', '/shorts/'].includes(location.pathname)) {
      let refreshing = false;
      const feedStatus = discovery.querySelector('[data-feed-status]');
      const titleText = v => (v.automatic || !v.slug ? v.title.replace(/\s*#\S+/g, '').trim() : v.title);
      const videoUrl = v => v.slug ? `/videos/${v.slug}/` : v.isShort === true ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
      const dateText = value => new Date(value).toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Toronto'});
      function createCard(v) {
        const title = titleText(v), url = videoUrl(v);
        const node = document.createElement('article');
        node.className = 'video-card' + (v.format === 'short' ? ' short-card' : '');
        Object.assign(node.dataset,{video:v.id,published:v.published,make:(v.makes||[]).join('|'),year:(v.years||[]).join('|'),type:(v.types||[]).join('|'),format:v.format,search:(v.originalTitle||v.title)+' '+(v.description||''),url});
        const link=document.createElement('a');link.className='card-image';link.href=url+(url.startsWith('/')?'#watch':'');link.setAttribute('aria-label','Watch '+title);
        const img=document.createElement('img');
        const saved=document.querySelector(`[data-thumbnail-id="${v.id}"]`);
        img.src=saved?.getAttribute('src')||`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
        img.alt='YouTube thumbnail for '+(v.originalTitle||v.title);img.width=480;img.height=360;img.loading='lazy';img.dataset.thumbnailId=v.id;protectThumbnail(img);
        const badge=document.createElement('span');badge.className='image-label';badge.textContent=v.format==='short'?'Short':v.format==='long'?'Long video':'Video';
        const play=document.createElement('span');play.className='play-icon';play.setAttribute('aria-hidden','true');play.textContent='▶';link.append(img,badge,play);
        const copy=document.createElement('div');copy.className='card-copy';
        const meta=document.createElement('div');meta.className='meta';const label=document.createElement('span');label.textContent=v.kind||'New upload';const timestamp=document.createElement('time');timestamp.dateTime=v.published;timestamp.textContent=dateText(v.published);meta.append(label,timestamp);
        const heading=document.createElement('h3');const headingLink=document.createElement('a');headingLink.href=url;headingLink.textContent=title;heading.append(headingLink);copy.append(meta,heading);
        if(v.format==='long'&&v.description){const description=document.createElement('p');description.textContent=v.description;copy.append(description);}
        const tags=document.createElement('div');tags.className='card-tags';
        for(const make of v.makes||[]){const tag=document.createElement('a');tag.href='/reviews/?make='+encodeURIComponent(make);tag.textContent=make;tags.append(tag);}
        for(const year of v.years||[]){const tag=document.createElement('a');tag.href='/reviews/?year='+encodeURIComponent(year);tag.textContent=year;tags.append(tag);}
        copy.append(tags);
        node.append(link,copy);return node;
      }
      function addFilterOptions() {
        for(const key of ['make','type','year']) {
          const selected=controls[key].value;
          const values=[...new Set(cards.flatMap(card=>(card.dataset[key]||'').split('|').filter(Boolean)))].sort((a,b)=>key==='year'?Number(b)-Number(a):a.localeCompare(b));
          for(const value of values) if(![...controls[key].options].some(option=>option.value===value)) {
            const option=document.createElement('option');option.value=value;option.textContent=value;controls[key].append(option);
          }
          // Honour a bookmarked new make/year once its upload has arrived.
          const requested=new URLSearchParams(location.search).get(key);
          if(!selected&&requested&&values.includes(requested)) controls[key].value=requested;
        }
      }
      async function refreshChannel() {
        if(refreshing||document.visibilityState==='hidden')return;
        refreshing=true;
        try {
          const catalogueResponse=await fetch('/data/publication.json',{signal:AbortSignal.timeout(10000)});
          if(!catalogueResponse.ok)throw new Error('Catalogue unavailable');
          const catalogue=await catalogueResponse.json();
          let response;
          try{response=await fetch('/api/youtube-feed',{signal:AbortSignal.timeout(12000)});}catch{}
          if(!response?.ok)response=await fetch('/data/site-content.json',{signal:AbortSignal.timeout(8000)});
          if(!response.ok)throw new Error('Feed unavailable');
          const feed=await response.json();
          const merged=new Map(catalogue.videos.map(v=>[v.id,{...v,isShort:v.format==='short'?true:v.format==='long'?false:null}]));
          const live=new Map([...(feed.latestLongVideos||[]),...(feed.latestShorts||[]),...(feed.latestVideos||[])].map(v=>[v.id,v]));
          for(const v of live.values()) {
            if(!/^[\w-]{11}$/.test(v.id)||typeof v.title!=='string'||!Number.isFinite(Date.parse(v.published)))continue;
            const old=merged.get(v.id);
            const contentFormat=v.isShort===true?'short':v.isShort===false?'long':old?.format||'unclassified';
            merged.set(v.id,{...old,...v,format:contentFormat,originalTitle:v.title,title:old&&!old.automatic?old.title:v.title,makes:old&&!old.automatic?old.makes:v.makes||old?.makes||[],years:old&&!old.automatic?old.years:v.years||old?.years||[],types:old&&!old.automatic?old.types:v.types||old?.types||[]});
          }
          const current=[...merged.values()].sort((a,b)=>Date.parse(b.published)-Date.parse(a.published));
          for(const v of current) {
            const existing=cards.find(card=>card.dataset.video===v.id);
            if(existing) {
              // Refresh renamed automatic imports, format and link without losing the current filters.
              const fresh=createCard(v);
              if(Object.entries(fresh.dataset).every(([key,value])=>existing.dataset[key]===value)&&existing.querySelector('h3')?.textContent===titleText(v))continue;
              if(typeof existing.replaceWith==='function'){existing.replaceWith(fresh);cards[cards.indexOf(existing)]=fresh;}
              continue;
            }
            if(fixedFormat&&v.format!==fixedFormat)continue;
            const node=createCard(v);grid.append(node);cards.push(node);
          }
          addFilterOptions();applyFilters(false);
          document.querySelectorAll('[data-latest-format]').forEach(section=>{
            const strip=section.querySelector('.video-grid');
            const items=current.filter(v=>v.format===section.dataset.latestFormat).slice(0,Number(section.dataset.limit));
            const old=[...strip.querySelectorAll('[data-video]')];
            if(old.length===items.length&&old.every((card,index)=>card.dataset.video===items[index].id&&card.querySelector('h3')?.textContent===titleText(items[index])))return;
            strip.replaceChildren(...items.map(createCard));
          });
          const lead=document.querySelector('[data-lead-video]');
          const newest=current.find(v=>v.format==='long');
          if(lead&&newest&&(newest.id!==lead.dataset.leadVideo||newest.automatic)) {
            const url=videoUrl(newest),imageLink=lead.querySelector('.lead-image'),img=createCard(newest).querySelector('img');
            img.loading='eager';img.fetchPriority='high';imageLink.href=url;imageLink.querySelector('img').replaceWith(img);
            lead.querySelector('.lead-index').textContent='01 / LATEST LONG VIDEO';
            lead.querySelector('.kicker').textContent='LATEST FULL VIDEO';lead.querySelector('h1').textContent=titleText(newest);
            lead.querySelector('.lead-copy p').textContent=newest.description||'The newest full video from AutoTech Review. Watch the complete discussion on YouTube.';
            lead.querySelector('.lead-actions .button').href=url+(url.startsWith('/')?'#watch':'');lead.querySelector('.lead-actions .button').textContent='Watch the full video';lead.querySelector('.lead-date').textContent=dateText(newest.published)+' · Long video';lead.dataset.leadVideo=newest.id;lead.dataset.published=newest.published;
          }
          if(feedStatus)feedStatus.textContent=feed.stale||feed.source==='saved-catalogue'||!feed.source?'Showing saved coverage. Live channel checks retry automatically.':'Channel checked '+new Date(feed.updatedAt).toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit',timeZone:'America/Toronto'})+' ET · Updates automatically';
        } catch {if(feedStatus)feedStatus.textContent='Showing saved coverage. Live channel checks retry automatically.';}
        finally{refreshing=false;}
      }
      refreshChannel();
      if(typeof setInterval==='function') {
        const timer=setInterval(refreshChannel,300000);
        document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshChannel();});
        window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
      }
    }
    window.addEventListener('popstate', () => {
      const next = new URLSearchParams(location.search);
      if (search) search.value = (next.get('q') || '').slice(0,120);
      if (sort) sort.value = next.get('sort') === 'oldest' ? 'oldest' : 'newest';
      fields.forEach(key => { const val=next.get(key)||''; controls[key].value=key==='format'&&fixedFormat?fixedFormat:[...controls[key].options].some(o=>o.value===val)?val:''; });
      applyFilters(false);
    });
    if (document.modelContext?.registerTool) {
      const lifecycle = new AbortController();
      const validInput = input => {
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a filters object.');
        for (const [key, value] of Object.entries(input)) {
          if (key === 'q' && typeof value === 'string' && value.length <= 120) continue;
          if (key === 'sort' && ['newest','oldest'].includes(value)) continue;
          if (!fields.includes(key) || typeof value !== 'string' || ![...controls[key].options].some(o => o.value === value)) throw new Error('Unsupported filter: ' + key);
          if (key === 'format' && fixedFormat && value !== fixedFormat) throw new Error('This library has a fixed content format.');
        }
        return input;
      };
      try {
        Promise.resolve(document.modelContext.registerTool({
          name: 'filter_review_library', title: 'Filter AutoTech Review videos',
          description: 'Set the visible library filters and return matching video IDs. Changes only this page’s filters; does not publish or submit data.',
          inputSchema: { type: 'object', properties: { ...Object.fromEntries(fields.map(key=>[key,{type:'string',enum:key==='format'&&fixedFormat?[fixedFormat]:[...controls[key].options].map(o=>o.value)}])),q:{type:'string',maxLength:120},sort:{type:'string',enum:['newest','oldest']} }, additionalProperties:false },
          annotations: { readOnlyHint:false, untrustedContentHint:false },
          execute(input) { const parsed=validInput(input);Object.entries(parsed).forEach(([key,value])=>{const control=key==='q'?search:key==='sort'?sort:controls[key];if(control)control.value=value;});return applyFilters(); }
        }, {signal:lifecycle.signal})).catch(() => {});
        window.addEventListener('pagehide', () => lifecycle.abort(), {once:true});
      } catch { /* Browsers without the proposed API keep the normal controls. */ }
    }
  }

  document.querySelectorAll('[data-load-video]').forEach(button => {
    button.addEventListener('click', () => {
      const player = button.closest('[data-player]');
      const id = player.dataset.id;
      if (!/^[\w-]{11}$/.test(id)) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
      iframe.title = document.querySelector('h1')?.textContent || 'AutoTech Review video';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      player.replaceChildren(iframe);
    });
  });

  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());

  const brief = document.querySelector('#partner-form');
  if (brief) {
    brief.addEventListener('submit', event => {
      event.preventDefault();
      if (!brief.reportValidity()) return;
      const fd = new FormData(brief);
      const read = key => String(fd.get(key) || '').trim();
      const subject = `AutoTech Review partnership — ${read('company').replace(/[\r\n]/g, ' ')}`;
      const body = ['Hi Rishi,', '', 'We would like to discuss a campaign with AutoTech Review.', '', ...[['Name','name'],['Work email','email'],['Brand / agency','company'],['Website','website'],['Campaign type','campaign'],['Primary market','market'],['Budget and currency','budget'],['Timing','timing'],['Campaign details','details'],['Usage rights / exclusivity','rights']].map(([label,key])=>`${label}: ${read(key)||'Not specified'}`), '', 'We understand that paid campaigns use 50% before production and 50% after delivery or publication, as agreed. Usage rights and exclusivity are scoped separately.'].join('\n');
      document.querySelector('#prepared-brief').value = body;
      document.querySelector('#open-brief').href = `mailto:autotechreview51@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      document.querySelector('.draft-result').hidden = false;
      document.querySelector('.draft-result').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
    });
    document.querySelector('#copy-brief')?.addEventListener('click', async () => {
      const text = document.querySelector('#prepared-brief');
      const status = document.querySelector('.copy-status');
      try { await navigator.clipboard.writeText(text.value); status.textContent = 'Brief copied. Paste it into your email.'; }
      catch { text.focus();text.select();status.textContent = 'Copy is unavailable here. The draft is selected so you can copy it manually.'; }
    });
  }
})();
