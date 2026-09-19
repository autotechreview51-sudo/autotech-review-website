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
  card.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
  card.target = '_blank';
  card.rel = 'noopener';

  const image = document.createElement('img');
  image.src = `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/maxresdefault.jpg`;
  image.alt = video.title;
  image.loading = 'lazy';
  image.onerror = () => { image.src = `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`; };

  const pill = document.createElement('span');
  pill.className = 'pill';
  pill.textContent = 'Latest upload';
  const heading = document.createElement('h3');
  heading.textContent = video.title;
  const published = document.createElement('p');
  published.textContent = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(video.published));
  const action = document.createElement('b');
  action.textContent = 'Watch on YouTube →';
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
    }
    if (Array.isArray(content.latestVideos) && content.latestVideos.length) {
      const grid = document.querySelector('#latest-grid');
      grid.replaceChildren(...content.latestVideos.slice(0, 3).map(createLatestCard));
      if (!reduceMotion) grid.querySelectorAll('.tilt-card').forEach(enableTilt);
    }
  })
  .catch(() => {});
