'use strict';

if ('IntersectionObserver' in window) {
  const items = document.querySelectorAll('[data-reveal], #news .research-update, .home-publications .publication');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.replace('reveal-pending', 'reveal-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -32px 0px' });

  items.forEach(item => item.classList.add('reveal-pending'));

  function startOnScroll() {
    if (window.scrollY <= 0 && !location.hash) return;
    window.removeEventListener('scroll', startOnScroll);
    window.removeEventListener('hashchange', startOnScroll);
    items.forEach(item => observer.observe(item));
  }
  window.addEventListener('scroll', startOnScroll, { passive: true });
  window.addEventListener('hashchange', startOnScroll);
  startOnScroll();
}
