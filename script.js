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
