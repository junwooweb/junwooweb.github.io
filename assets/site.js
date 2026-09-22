'use strict';

document.documentElement.classList.add('has-js');
document.querySelectorAll('.js-only').forEach(element => { element.hidden = false; });

const portraitLink = document.querySelector('[data-open-profile]');
const portraitDialog = document.querySelector('.portrait-dialog');
if (portraitLink && portraitDialog?.showModal) {
  portraitLink.addEventListener('click', event => {
    event.preventDefault();
    portraitDialog.showModal();
  });
  portraitDialog.addEventListener('click', event => {
    const rect = portraitDialog.getBoundingClientRect();
    if (event.target === portraitDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) portraitDialog.close();
  });
}

document.querySelectorAll('[data-copy]').forEach(button => {
  const block = document.getElementById(button.dataset.copy);
  const status = button.parentElement.querySelector('[role="status"]');
  if (!block || !status) return;
  const label = button.textContent;
  const disclosure = block.closest('details');
  if (disclosure && !disclosure.contains(button)) {
    const syncExpanded = () => button.setAttribute('aria-expanded', String(disclosure.open));
    syncExpanded();
    disclosure.addEventListener('toggle', syncExpanded);
  }
  button.addEventListener('click', async () => {
    const text = block.textContent;
    if (disclosure && !disclosure.open) {
      disclosure.open = true;
      disclosure.querySelector('summary').scrollIntoView({ block: 'nearest' });
    }
    button.disabled = true;
    status.textContent = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied to clipboard.';
      button.textContent = 'Copied';
    } catch {
      // A denied clipboard permission still leaves a selectable, usable citation.
      if (disclosure) disclosure.open = true;
      block.scrollIntoView({ block: 'nearest' });
      block.focus({ preventScroll: true });
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(block);
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'The BibTeX is selected. Press Ctrl+C (Windows) or ⌘C (Mac) to copy.';
      button.textContent = label;
    } finally {
      button.disabled = false;
    }
  });
});

function openCitationHash() {
  const disclosure = document.getElementById(location.hash.slice(1));
  if (disclosure?.matches('.citation-disclosure')) disclosure.open = true;
}
openCitationHash();
window.addEventListener('hashchange', openCitationHash);

document.querySelectorAll('[data-publication-browser]').forEach(browser => {
  const filters = [...browser.querySelectorAll('[data-filter]')];
  let filter = 'all';
  function matchesFilter(paper) {
    if (filter === 'submitted' || filter === 'writing') return paper.dataset.ongoing === 'true' && paper.dataset.status === filter;
    if (paper.dataset.ongoing === 'true') return false;
    if (filter === 'first-author') return paper.dataset.firstAuthor === 'true';
    return filter === 'all' || paper.dataset.type === filter;
  }
  function applyFilters() {
    let count = 0;
    let visibleCount = 0;
    browser.querySelectorAll('.publication').forEach(paper => {
      paper.hidden = !matchesFilter(paper);
      if (!paper.hidden) {
        visibleCount++;
        if (paper.dataset.ongoing !== 'true') count++;
      }
    });
    browser.querySelectorAll('.publication-group').forEach(group => {
      const visible = [...group.querySelectorAll('.publication')].filter(paper => !paper.hidden);
      const acceptedCount = visible.filter(paper => paper.dataset.ongoing !== 'true').length;
      group.hidden = visible.length === 0;
      group.querySelector('[data-year-count]').textContent = acceptedCount ? `${acceptedCount} ${acceptedCount === 1 ? 'paper' : 'papers'}` : 'Ongoing work';
    });
    const category = filter === 'all' ? '' : `${filter} `;
    browser.querySelector('.archive-count').textContent = filter === 'submitted' ? 'Submitted manuscripts' : filter === 'writing' ? 'Manuscripts in preparation' : `${count} accepted ${category}paper${count === 1 ? '' : 's'}`;
    browser.querySelector('.publication-empty').hidden = visibleCount !== 0;
  }
  function selectFilter(value) {
    filter = value;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    applyFilters();
  }
  filters.forEach(button => button.addEventListener('click', () => {
    selectFilter(button.dataset.filter);
  }));
  function revealHashTarget() {
    const target = document.getElementById(location.hash.slice(1));
    if (!target || !browser.contains(target)) return;
    const group = target.closest('.publication-group');
    const paper = target.closest('.publication') || (group?.hidden ? group.querySelector('.publication') : null);
    if (paper?.hidden) selectFilter(paper.dataset.ongoing === 'true' ? paper.dataset.status : 'all');
    if (paper) target.scrollIntoView({ block: 'start' });
  }
  applyFilters();
  revealHashTarget();
  window.addEventListener('hashchange', revealHashTarget);
});
