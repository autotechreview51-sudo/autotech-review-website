(() => {
  'use strict';
  const form = document.querySelector('[data-fuel-form]');
  if (form) {
    const field = key => form.elements.namedItem(key);
    const result = document.querySelector('[data-fuel-output]');
    const status = document.querySelector('[data-fuel-status]');
    const linkPanel = document.querySelector('[data-comparison-link]');
    const copyStatus = document.querySelector('[data-copy-status]');
    const keys = ['units', 'currency', 'distance', 'price', 'a', 'b', 'nameA', 'nameB'];
    const params = new URLSearchParams(location.search);
    for (const key of keys) {
      if (!params.has(key)) continue;
      const value = params.get(key);
      const control = field(key);
      if (key === 'units' && ['metric', 'us'].includes(value) || key === 'currency' && ['CAD', 'USD'].includes(value)) control.value = value;
      else if (key === 'nameA' || key === 'nameB') control.value = value.slice(0, 40);
      else if (['distance', 'price', 'a', 'b'].includes(key) && value.trim() && Number.isFinite(Number(value)) && Number(value) >= Number(control.min) && Number(value) <= Number(control.max)) control.value = value;
    }
    let previousUnits = field('units').value;
    function labels() {
      const metric = field('units').value === 'metric';
      document.querySelector('[data-distance-label]').textContent = `Annual distance (${metric ? 'km' : 'miles'})`;
      document.querySelector('[data-price-label]').textContent = `Fuel price per ${metric ? 'litre' : 'US gallon'} (${field('currency').value})`;
      document.querySelectorAll('[data-efficiency-label]').forEach(label => { label.textContent = `Fuel economy (${metric ? 'L/100 km' : 'US MPG'})`; });
    }
    function comparisonUrl() {
      const url = new URL(location.href);
      url.search = ''; url.hash = '';
      keys.forEach(key => url.searchParams.set(key, field(key).value.trim()));
      return url;
    }
    function calculate(updateUrl = true) {
      if (!form.reportValidity()) { result.hidden = true; status.textContent = 'Complete the required fields with valid numbers, then compare again.'; return false; }
      const distance = Number(field('distance').value), price = Number(field('price').value);
      const a = Number(field('a').value), b = Number(field('b').value);
      if (![distance, price, a, b].every(Number.isFinite) || a <= 0 || b <= 0 || distance < 0 || price < 0) { result.hidden = true; status.textContent = 'Enter valid numbers to calculate fuel costs.'; return false; }
      const metric = field('units').value === 'metric';
      const cost = efficiency => metric ? distance * efficiency / 100 * price : distance / efficiency * price;
      const costA = cost(a), costB = cost(b);
      const currency = field('currency').value === 'USD' ? 'USD' : 'CAD';
      const money = value => new Intl.NumberFormat('en-CA', {style:'currency', currency, currencyDisplay:'code', maximumFractionDigits:0}).format(value);
      const nameA = field('nameA').value.trim().slice(0, 40) || 'Vehicle A', nameB = field('nameB').value.trim().slice(0, 40) || 'Vehicle B';
      for (const [selector, value] of [['name-a',nameA],['name-b',nameB],['month-a',money(costA / 12)],['month-b',money(costB / 12)],['year-a',money(costA)],['year-b',money(costB)]]) document.querySelector(`[data-${selector}]`).textContent = value;
      const difference = Math.abs(costA - costB);
      document.querySelector('[data-fuel-difference]').textContent = difference < 0.5 ? 'The estimated annual fuel costs are equal to the nearest dollar.' : `${costA < costB ? nameA : nameB} costs ${money(difference)} less per year for fuel with these inputs.`;
      document.querySelector('[data-fuel-summary]').textContent = 'Your fuel comparison';
      status.textContent = 'Estimated monthly and annual fuel costs are ready.';
      result.hidden = false; linkPanel.hidden = true; copyStatus.textContent = '';
      if (updateUrl) { const url = comparisonUrl(); history.replaceState(null, '', url.pathname + url.search); }
      return true;
    }
    form.addEventListener('submit', event => { event.preventDefault(); calculate(); });
    form.addEventListener('input', () => { result.hidden = true; status.textContent = 'Inputs changed. Compare again to update the estimate.'; });
    field('units').addEventListener('change', () => {
      const next = field('units').value;
      if (next !== previousUnits) {
        // Exactly 1 mile = 1.609344 km; exactly 1 US gallon = 3.785411784 litres.
        for (const key of ['a', 'b']) { const value = Number(field(key).value); if (field(key).value && value > 0) field(key).value = String(235.21458333333334 / value); }
        for (const [key, ratio] of [['distance',1.609344],['price',1 / 3.785411784]]) {
          const value = Number(field(key).value);
          if (field(key).value && Number.isFinite(value)) field(key).value = String(value * (next === 'metric' ? ratio : 1 / ratio));
        }
      }
      previousUnits = next; labels(); calculate();
    });
    field('currency').addEventListener('change', () => { labels(); calculate(); });
    form.addEventListener('reset', () => { queueMicrotask(() => { previousUnits = field('units').value; labels(); calculate(); }); });
    document.querySelector('[data-copy-comparison]').addEventListener('click', async () => {
      if (!calculate()) return;
      const url = comparisonUrl().href;
      const input = linkPanel.querySelector('input'); input.value = url; linkPanel.hidden = false;
      try { await navigator.clipboard.writeText(url); copyStatus.textContent = 'Link copied. Bookmark it or share it to reopen these inputs.'; }
      catch { input.focus(); input.select(); copyStatus.textContent = 'Select and copy the link above to reopen these inputs.'; }
    });
    labels();
    if (params.has('distance') || params.has('a') || params.has('b')) calculate(false);
  }
  const checklist = document.querySelector('[data-drive-checklist]');
  if (checklist) {
    const checks = [...checklist.querySelectorAll('input[type="checkbox"]')];
    const progress = document.querySelector('[data-check-progress]');
    const notes = checklist.elements.namedItem('notes');
    const update = () => {
      progress.textContent = `${checks.filter(check => check.checked).length} of ${checks.length} items checked`;
      document.querySelector('[data-print-notes]').textContent = notes.value || 'No notes entered.';
    };
    checklist.addEventListener('submit', event => event.preventDefault());
    checklist.addEventListener('input', update);
    checklist.addEventListener('change', update);
    checklist.addEventListener('reset', () => queueMicrotask(update));
    window.addEventListener('beforeprint', update);
    update();
  }
})();
