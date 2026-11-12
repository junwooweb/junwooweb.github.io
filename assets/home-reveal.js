'use strict';

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.replace('reveal-pending', 'reveal-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -16px 0px' });

  document.querySelectorAll('[data-reveal], #news .research-update, .home-publications .publication').forEach(item => {
    item.classList.add('reveal-pending');
    observer.observe(item);
  });
}
