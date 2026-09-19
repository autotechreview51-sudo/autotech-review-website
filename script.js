const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');

menuButton.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

navLinks.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    navLinks.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

const matches = {
  value: { title: '2026 RAV4 Hybrid', description: 'A strong all-rounder for Canadian winters, family cargo and long-term efficiency.', price: '$52,880', score: '8.0 / 10', link: 'https://www.youtube.com/watch?v=vsSSqjdFm1Q' },
  comfort: { title: '2026 Honda CR-V Hybrid', description: 'Excellent cabin space and everyday comfort for growing Canadian families.', price: '$55,120', score: '8.2 / 10', link: 'https://www.youtube.com/@autotechreview51/videos' },
  performance: { title: '2027 BMW iX3', description: 'The technology-first choice with premium road manners and a distinctive cabin.', price: '$78,420', score: '8.7 / 10', link: 'https://www.youtube.com/watch?v=GmdUmrDhZSg' },
  tech: { title: '2027 BMW iX3', description: 'The technology-first choice with premium road manners and a distinctive cabin.', price: '$78,420', score: '8.7 / 10', link: 'https://www.youtube.com/watch?v=GmdUmrDhZSg' }
};

document.querySelector('#match-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const priority = data.get('priority');
  let match = matches[priority] || matches.value;
  if (data.get('style') === 'ev') match = matches.tech;
  if (data.get('household') === 'large') match = matches.comfort;
  document.querySelector('#match-kicker').textContent = 'Your personalized match';
  document.querySelector('#match-title').innerHTML = match.title.replace(' ', '<br>');
  document.querySelector('#match-description').textContent = match.description;
  document.querySelector('#match-price').textContent = match.price;
  document.querySelector('#match-score').textContent = match.score;
  document.querySelector('#match-link').href = match.link;
  document.querySelector('.match-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const enableTilt = (card) => {
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-7px)`;
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
};

if (!reduceMotion) {
  document.querySelectorAll('.drive-zone').forEach((zone) => {
    const move = (event) => {
      const rect = zone.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      zone.style.setProperty('--drive-x', (x * 18).toFixed(2));
      zone.style.setProperty('--drive-y', (y * 10).toFixed(2));
      zone.style.setProperty('--drive-tilt', (x * 7).toFixed(2));
      zone.classList.add('is-driving');
    };
    const stop = () => {
      zone.classList.remove('is-driving');
      zone.style.removeProperty('--drive-x');
      zone.style.removeProperty('--drive-y');
      zone.style.removeProperty('--drive-tilt');
    };
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerleave', stop);
    zone.addEventListener('blur', stop);
  });

  document.querySelectorAll('.tilt-card').forEach(enableTilt);

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  document.querySelectorAll('section:not(.hero)').forEach((section) => {
    section.classList.add('reveal');
    revealObserver.observe(section);
  });
}

const createLatestCard = (video) => {
  const card = document.createElement('a');
  card.className = 'content-card tilt-card';
  card.href = video.isShort
    ? `https://www.youtube.com/shorts/${encodeURIComponent(video.id)}`
    : `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
  card.target = '_blank';
  card.rel = 'noopener';

  const image = document.createElement('img');
  image.src = `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/maxresdefault.jpg`;
  image.alt = video.title;
  image.loading = 'lazy';
  image.onerror = () => { image.src = `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`; };

  const pill = document.createElement('span');
  pill.className = `pill${video.isShort ? ' pill-blue' : ''}`;
  pill.textContent = video.isShort ? 'Short' : 'Long video';
  const heading = document.createElement('h3');
  heading.textContent = video.title;
  const published = document.createElement('p');
  published.textContent = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(video.published));
  const action = document.createElement('b');
  action.textContent = video.isShort ? 'Watch Short →' : 'Watch long video →';
  card.append(image, pill, heading, published, action);
  return card;
};

fetch('data/site-content.json', { cache: 'no-store' })
  .then((response) => {
    if (!response.ok) throw new Error('Content feed unavailable');
    return response.json();
  })
  .then((content) => {
    if (content.metrics?.subscribers) {
      document.querySelector('.hero-metrics strong').textContent = content.metrics.subscribers;
      document.querySelectorAll('[data-subscriber]').forEach((element) => { element.textContent = content.metrics.subscribers; });
    }
    const renderVideoFeed = (selector, videos) => {
      if (!Array.isArray(videos) || !videos.length) return;
      const grid = document.querySelector(selector);
      grid.replaceChildren(...videos.slice(0, 3).map(createLatestCard));
      if (!reduceMotion) grid.querySelectorAll('.tilt-card').forEach(enableTilt);
    };
    renderVideoFeed('#long-videos-grid', content.latestLongVideos);
    renderVideoFeed('#shorts-grid', content.latestShorts);
  })
  .catch(() => {});

const videoTabs = [...document.querySelectorAll('[data-video-tab]')];
const setVideoTab = (selectedTab) => {
  videoTabs.forEach((tab) => {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  document.querySelector('#long-videos-panel').hidden = selectedTab.dataset.videoTab !== 'long';
  document.querySelector('#shorts-panel').hidden = selectedTab.dataset.videoTab !== 'shorts';
};
videoTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => setVideoTab(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % videoTabs.length : (index - 1 + videoTabs.length) % videoTabs.length;
    setVideoTab(videoTabs[nextIndex]);
    videoTabs[nextIndex].focus();
  });
});

const comparisonVehicles = [
  { id: 'rav4', name: '2026 RAV4 Hybrid', badge: 'Value leader', price: '$52,880 est.', cargo: '580 L', energy: '6.0 L/100 km', powertrain: 'Hybrid AWD', score: '8.0', link: 'https://www.youtube.com/watch?v=vsSSqjdFm1Q', cta: 'Watch RAV4 review' },
  { id: 'crv', name: '2026 CR-V Hybrid', badge: 'Space leader', price: '$55,120 est.', cargo: '1,113 L', energy: '6.4 L/100 km', powertrain: 'Hybrid AWD', score: '8.2', link: 'https://www.youtube.com/@autotechreview51/search?query=CR-V', cta: 'Find CR-V videos' },
  { id: 'sportage', name: '2026 Kia Sportage', badge: 'Feature leader', price: 'Verify current', cargo: '1,121 L', energy: '8.8 L/100 km', powertrain: '2.5L AWD', score: '7.8', link: 'https://www.youtube.com/@autotechreview51/search?query=Sportage', cta: 'Find Sportage videos' },
  { id: 'tiguan', name: '2026 VW Tiguan', badge: 'Cabin leader', price: 'Verify current', cargo: '748 L', energy: '9.4 L/100 km', powertrain: '2.0T AWD', score: '8.1', link: 'https://www.youtube.com/@autotechreview51/search?query=Tiguan', cta: 'Find Tiguan videos' },
  { id: 'ix3', name: '2027 BMW iX3', badge: 'Technology leader', price: 'Verify current', cargo: '520 L', energy: 'Electric', powertrain: 'Electric AWD', score: '8.7', link: 'https://www.youtube.com/watch?v=GmdUmrDhZSg', cta: 'Watch iX3 review' }
];

const compareA = document.querySelector('#compare-a');
const compareB = document.querySelector('#compare-b');
const comparisonOption = (vehicle) => {
  const option = document.createElement('option');
  option.value = vehicle.id;
  option.textContent = vehicle.name;
  return option;
};

const renderComparisonCard = (element, vehicle, blue = false) => {
  element.replaceChildren();
  const badge = document.createElement('span');
  badge.className = `pill${blue ? ' pill-blue' : ''}`;
  badge.textContent = vehicle.badge;
  const heading = document.createElement('h3');
  heading.textContent = vehicle.name;
  const list = document.createElement('dl');
  [['Canadian price', vehicle.price], ['Cargo', vehicle.cargo], ['Energy use', vehicle.energy], ['Powertrain', vehicle.powertrain], ['Verdict', vehicle.score]].forEach(([term, value]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = value;
    row.append(dt, dd);
    list.append(row);
  });
  const link = document.createElement('a');
  link.className = `button${blue ? '' : ' button-ghost'}`;
  link.href = vehicle.link;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = vehicle.cta;
  element.append(badge, heading, list, link);
};

const updateComparison = () => {
  const first = comparisonVehicles.find((vehicle) => vehicle.id === compareA.value) ?? comparisonVehicles[0];
  const second = comparisonVehicles.find((vehicle) => vehicle.id === compareB.value) ?? comparisonVehicles[1];
  renderComparisonCard(document.querySelector('#compare-card-a'), first);
  renderComparisonCard(document.querySelector('#compare-card-b'), second, true);
};

if (compareA && compareB) {
  comparisonVehicles.forEach((vehicle) => {
    compareA.append(comparisonOption(vehicle));
    compareB.append(comparisonOption(vehicle));
  });
  compareA.value = 'rav4';
  compareB.value = 'crv';
  compareA.addEventListener('change', updateComparison);
  compareB.addEventListener('change', updateComparison);
  document.querySelector('#swap-cars').addEventListener('click', () => {
    [compareA.value, compareB.value] = [compareB.value, compareA.value];
    updateComparison();
  });
  updateComparison();
}

const costForm = document.querySelector('#cost-form');
const formatCurrency = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const updateOwnershipCost = () => {
  const values = new FormData(costForm);
  const price = Number(values.get('price')) || 0;
  const tax = Number(values.get('province')) || 0;
  const down = Math.min(Number(values.get('down')) || 0, price * (1 + tax));
  const annualRate = (Number(values.get('rate')) || 0) / 100;
  const months = Number(values.get('term')) || 72;
  const financed = Math.max(0, price * (1 + tax) - down);
  const monthlyRate = annualRate / 12;
  const payment = monthlyRate === 0 ? financed / months : financed * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  const annualDistance = Number(values.get('distance')) || 0;
  const efficiency = Number(values.get('efficiency')) || 0;
  const energyPrice = Number(values.get('energyPrice')) || 0;
  const energy = annualDistance / 12 * efficiency / 100 * energyPrice;
  const interest = Math.max(0, payment * months - financed);
  document.querySelector('#monthly-payment').textContent = formatCurrency.format(payment);
  document.querySelector('#monthly-energy').textContent = `${formatCurrency.format(energy)}/mo`;
  document.querySelector('#monthly-combined').textContent = `${formatCurrency.format(payment + energy)}/mo`;
  document.querySelector('#amount-financed').textContent = formatCurrency.format(financed);
  document.querySelector('#total-interest').textContent = formatCurrency.format(interest);
};

if (costForm) {
  costForm.addEventListener('input', updateOwnershipCost);
  costForm.addEventListener('change', updateOwnershipCost);
  updateOwnershipCost();
}

const homepagePartnerForm = document.querySelector('#homepage-partner-form');
homepagePartnerForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(homepagePartnerForm);
  const company = data.get('company');
  const campaign = data.get('campaign');
  const subject = `Partnership inquiry — ${company} — ${campaign}`;
  const body = [
    'Hello AutoTech Review,', '',
    `Name: ${data.get('name')}`,
    `Work email: ${data.get('email')}`,
    `Brand or agency: ${company}`,
    `Website: ${data.get('website') || 'Not provided'}`,
    `Campaign type: ${campaign}`,
    `Estimated budget: ${data.get('budget')}`,
    `Preferred timeline: ${data.get('timeline') || 'Flexible'}`,
    `Primary market: ${data.get('market')}`, '',
    'Campaign details:', String(data.get('details')), '',
    'Usage rights or exclusivity:', String(data.get('rights') || 'Not specified'), '',
    'I would like to discuss fit, scope, timing and next steps.'
  ].join('\n');
  document.querySelector('#homepage-form-success')?.classList.add('show');
  window.location.href = `mailto:autotechreview51@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
