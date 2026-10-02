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
    // Keep discovery current between the existing daily publication rebuilds.
    if (typeof fetch === 'function' && ['/', '/reviews/', '/long-videos/', '/shorts/'].includes(location.pathname)) {
      (async () => {
        try {
          const catalogueResponse = await fetch('/data/publication.json', {signal:AbortSignal.timeout(8000)});
          if (!catalogueResponse.ok) return;
          const catalogue = await catalogueResponse.json();
          let feedResponse;
          try { feedResponse = await fetch('/api/youtube-feed', {signal:AbortSignal.timeout(10000)}); }
          catch { feedResponse = await fetch('/data/site-content.json'); }
          if (!feedResponse.ok) feedResponse = await fetch('/data/site-content.json');
          if (!feedResponse.ok) return;
          const feed = await feedResponse.json();
          const seen = new Set(cards.map(c => c.dataset.video));
          const latest = new Map([...(feed.latestVideos || []), ...(feed.latestLongVideos || []), ...(feed.latestShorts || [])].map(v => [v.id, v]));
          const models = {'GLC 300': /\bGLC\s*300\b/i, 'Camry XSE AWD': /\bCamry\b/i, 'Corolla Cross Hybrid': /\bCorolla\s*Cross\b/i, 'RAV4': /\bRAV4\b/i, 'iX3': /\biX3\b/i};
          for (const v of latest.values()) {
            if (seen.has(v.id) || !/^[\w-]{11}$/.test(v.id) || typeof v.isShort !== 'boolean' || typeof v.title !== 'string' || !Number.isFinite(Date.parse(v.published))) continue;
            const contentFormat = v.isShort ? 'short' : 'long';
            if (fixedFormat && contentFormat !== fixedFormat) continue;
            const title = v.title.replace(/\s*#\S+/g, '').trim();
            const year = title.match(/\b20\d{2}\b/)?.[0] || '';
            const vehicles = catalogue.vehicles.filter(vehicle => year && String(vehicle.year) === year && models[vehicle.model]?.test(title));
            const makes = [...new Set(vehicles.map(vehicle => vehicle.make))];
            if (!makes.length) {
              if (/\bToyota|Camry|RAV4|Corolla\b/i.test(title)) makes.push('Toyota');
              else if (/\bMercedes|GLC\b/i.test(title)) makes.push('Mercedes-Benz');
              else if (/\bBMW\b/i.test(title)) makes.push('BMW');
            }
            const knownVideo = catalogue.videos.find(video => video.id === v.id);
            const videoUrl = knownVideo ? `/videos/${knownVideo.slug}/` : v.isShort ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
            const node = document.createElement('article');
            node.className = 'video-card' + (v.isShort ? ' short-card' : '');
            Object.assign(node.dataset, {video:v.id,published:v.published,make:makes.join('|'),year,type:[...new Set(vehicles.map(vehicle => vehicle.type))].join('|'),format:contentFormat,search:v.title,url:videoUrl});
            const link = document.createElement('a'); link.className='card-image';link.href=videoUrl;link.setAttribute('aria-label', title);
            const img=document.createElement('img');img.src=`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;img.alt='YouTube thumbnail for '+title;img.width=480;img.height=360;img.loading='lazy';img.dataset.thumbnailId=v.id;protectThumbnail(img);
            const badge=document.createElement('span');badge.className='image-label';badge.textContent=v.isShort?'Short':'Long video';link.append(img,badge);
            const copy=document.createElement('div');copy.className='card-copy';
            const meta=document.createElement('div');meta.className='meta';const label=document.createElement('span');label.textContent='New upload';const timestamp=document.createElement('time');timestamp.dateTime=v.published;timestamp.textContent=new Date(v.published).toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Toronto'});meta.append(label,timestamp);
            const heading=document.createElement('h3');const headingLink=document.createElement('a');headingLink.href=videoUrl;headingLink.textContent=title;heading.append(headingLink);
            copy.append(meta,heading);node.append(link,copy);discovery.querySelector('.video-grid').append(node);cards.push(node);seen.add(v.id);
          }
          const grid=discovery.querySelector('.video-grid');
          [...cards].sort((a,b)=>(b.dataset.published||'').localeCompare(a.dataset.published||'')).forEach(card=>grid.append(card));
          applyFilters(false);
        } catch { /* The existing structured collection stays available if the feed fails. */ }
      })();
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
