'use strict';

document.documentElement.classList.add('has-js');
document.querySelectorAll('.js-only').forEach(element => { element.hidden = false; });

const portraitGallery = document.querySelector('[data-profile-gallery]');
const portraitLinks = [...document.querySelectorAll('[data-open-profile]')];
const portraitDialog = document.querySelector('.portrait-dialog');
if (portraitGallery && portraitLinks.length) {
  let photoIndex = 0;
  let suppressClickUntil = 0;
  const fullPortrait = portraitDialog?.querySelector('[data-portrait-image]');
  function showPhoto(index) {
    photoIndex = (index + portraitLinks.length) % portraitLinks.length;
    portraitLinks.forEach((link, i) => { link.hidden = i !== photoIndex; });
    const selected = portraitLinks[photoIndex];
    if (fullPortrait) {
      fullPortrait.src = selected.href;
      fullPortrait.alt = selected.querySelector('img').alt;
    }
    document.querySelectorAll('[data-photo-count]').forEach(counter => {
      counter.textContent = `${photoIndex + 1} / ${portraitLinks.length}`;
    });
    if (portraitDialog) portraitDialog.setAttribute('aria-label', `Junwoo Kim profile photo ${photoIndex + 1} of ${portraitLinks.length}`);
  }
  document.querySelectorAll('[data-profile-controls]').forEach(controls => {
    controls.hidden = portraitLinks.length < 2;
  });
  document.querySelectorAll('[data-photo-step]').forEach(button => {
    button.addEventListener('click', () => showPhoto(photoIndex + Number(button.dataset.photoStep)));
  });
  portraitLinks.forEach(link => link.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); return; }
    if (portraitDialog?.showModal) {
      event.preventDefault();
      portraitDialog.showModal();
    }
  }));
  [portraitGallery, portraitDialog].filter(Boolean).forEach(surface => {
    surface.addEventListener('keydown', event => {
      if (portraitLinks.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const focusWasPhoto = portraitLinks.includes(document.activeElement);
      showPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
      if (focusWasPhoto) portraitLinks[photoIndex].focus({ preventScroll: true });
    });
    let touchStart = null;
    surface.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY };
    });
    surface.addEventListener('pointercancel', () => { touchStart = null; });
    surface.addEventListener('pointerup', event => {
      if (!touchStart || event.pointerType !== 'touch') return;
      const dx = event.clientX - touchStart.x;
      const dy = event.clientY - touchStart.y;
      touchStart = null;
      if (portraitLinks.length > 1 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        suppressClickUntil = performance.now() + 500;
        showPhoto(photoIndex + (dx < 0 ? 1 : -1));
      }
    });
  });
  if (portraitDialog) {
    portraitDialog.addEventListener('click', event => {
      const rect = portraitDialog.getBoundingClientRect();
      if (event.target === portraitDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) portraitDialog.close();
    });
    portraitDialog.addEventListener('close', () => portraitLinks[photoIndex].focus({ preventScroll: true }));
  }
  showPhoto(0);
}

const copyButtons = [...document.querySelectorAll('[data-copy]')];
const copyLabels = new Map(copyButtons.map(button => [button, button.textContent]));
const citationDisclosures = [...document.querySelectorAll('.citation-disclosure')];
let activeCopyRequest = 0;
function resetCopyFeedback() {
  copyButtons.forEach(button => { button.textContent = copyLabels.get(button); });
  document.querySelectorAll('.copy-status').forEach(message => { message.textContent = ''; });
  return ++activeCopyRequest;
}
function closeCitationsExcept(keep = null) {
  const open = citationDisclosures.filter(disclosure => disclosure.open && disclosure !== keep);
  if (!open.length) return;
  resetCopyFeedback();
  open.forEach(disclosure => { disclosure.open = false; });
}
document.addEventListener('click', event => {
  const copyButton = event.target.closest('[data-copy]');
  const disclosure = event.target.closest('.citation-disclosure') || document.getElementById(copyButton?.dataset.copy)?.closest('.citation-disclosure');
  closeCitationsExcept(disclosure);
  if (disclosure?.open && event.target.closest('.citation-disclosure > summary')) resetCopyFeedback();
}, { capture: true });
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const disclosure = document.activeElement.closest('.citation-disclosure[open]');
  if (disclosure) document.querySelector(`[aria-controls="${disclosure.id}"]`)?.focus({ preventScroll: true });
  closeCitationsExcept();
});
copyButtons.forEach(button => {
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
    closeCitationsExcept(disclosure);
    const request = resetCopyFeedback();
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
      if (request !== activeCopyRequest) return;
      status.textContent = 'Copied to clipboard.';
      const check = document.createElement('span');
      check.className = 'copy-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      button.replaceChildren(check, document.createTextNode('Copied'));
    } catch {
      if (request !== activeCopyRequest) return;
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
  const target = disclosure?.matches('.citation-disclosure') ? disclosure : null;
  closeCitationsExcept(target);
  if (target) target.open = true;
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
