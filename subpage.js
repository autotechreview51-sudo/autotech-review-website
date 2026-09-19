document.querySelector('#print-kit')?.addEventListener('click', () => window.print());

fetch('data/site-content.json', { cache: 'no-store' })
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then((content) => {
    if (content.metrics?.subscribers) document.querySelectorAll('[data-subscriber]').forEach((element) => { element.textContent = content.metrics.subscribers; });
  })
  .catch(() => {});

const partnerForm = document.querySelector('#partner-form');
partnerForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(partnerForm);
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
  document.querySelector('#form-success')?.classList.add('show');
  window.location.href = `mailto:autotechreview51@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
