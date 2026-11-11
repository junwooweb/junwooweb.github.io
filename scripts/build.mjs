import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

async function writePage(url, html) {
  // Changed styles and behavior must not reuse a visitor's previous cached asset.
  for (const [, path] of html.matchAll(/\b(?:href|src)="((?:\.\.\/)*assets\/[^"?]+\.(?:css|js))"/g)) {
    const content = (await readFile(new URL(path, url), 'utf8')).replaceAll('\r\n', '\n');
    const version = createHash('sha256').update(content).digest('hex').slice(0, 12);
    html = html.replaceAll(`"${path}"`, `"${path}?v=${version}"`);
  }
  await writeFile(url, html);
}

const root = new URL('../', import.meta.url);
const papers = JSON.parse(await readFile(new URL('data/publications.json', root), 'utf8'));
const researchUpdates = JSON.parse(await readFile(new URL('data/research-updates.json', root), 'utf8'));
const paperDate = p => researchUpdates.paperDates[p.id]?.date || String(p.year);
papers.sort((a, b) => b.year - a.year || paperDate(b).localeCompare(paperDate(a)));
const ongoing = JSON.parse(await readFile(new URL('data/ongoing.json', root), 'utf8')).map(p => ({ ...p, ongoing: true }));
const submittedCount = ongoing.filter(p => p.status === 'Submitted').length;
const writingCount = ongoing.filter(p => p.status === 'Writing').length;
const publisherBibtex = new Map(await Promise.all(papers.filter(p => p.bibtexFile).map(async p => [p.slug, (await readFile(new URL(p.bibtexFile, root), 'utf8')).trim()])));
const isFirstAuthor = p => p.firstAuthor ?? (p.authors[0] === 'Junwoo Kim' || p.equalContribution?.includes('Junwoo Kim'));
const release = 'https://github.com/junwooweb/junwooweb.github.io/releases/download/images/';
const site = 'https://junwooweb.github.io/';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url, label, cls = '') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const imageUrl = (p, base = '') => `${base}${p.image}`;
const portraitDirectory = new URL('assets/images/profile/', root);
const portraitFiles = (await readdir(portraitDirectory, { withFileTypes: true }))
  .filter(file => file.isFile() && /\.(?:jpe?g|png|webp|avif|gif)$/i.test(file.name))
  .map(file => file.name).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const portraits = await Promise.all(portraitFiles.map(async name => {
  const content = await readFile(new URL(encodeURIComponent(name), portraitDirectory));
  const version = createHash('sha256').update(content).digest('hex').slice(0, 12);
  return `assets/images/profile/${encodeURIComponent(name)}?v=${version}`;
}));
if (!portraits.length) portraits.push(`${release}main.png`);
const portraitControls = () => `<div class="portrait-controls" data-profile-controls hidden>
  <button type="button" data-photo-step="-1" aria-label="Previous profile photo"><span aria-hidden="true">‹</span></button>
  <span class="portrait-count" data-photo-count role="status" aria-live="polite" aria-atomic="true">1 / ${portraits.length}</span>
  <button type="button" data-photo-step="1" aria-label="Next profile photo"><span aria-hidden="true">›</span></button>
</div>`;
const portraitGallery = `<div class="profile-gallery" data-profile-gallery role="region" aria-roledescription="carousel" aria-label="Junwoo Kim profile photos" tabindex="0">
  <div class="profile-photo-stage">${portraits.map((src, index) => `<a class="profile-image-link" href="${esc(src)}" data-open-profile aria-label="Enlarge profile photo ${index + 1} of ${portraits.length}"${index ? ' hidden' : ''}><img src="${esc(src)}" alt="Junwoo Kim — photo ${index + 1} of ${portraits.length}" class="profile-img" width="420" height="420"${index ? ' loading="lazy"' : ' fetchpriority="high"'}></a>`).join('\n')}</div>
  ${portraitControls()}
</div>`;
const venueLabel = p => {
  const year = String(p.year).slice(-2);
  const name = p.venueDisplay || p.venueShort;
  return p.type === 'conference' ? `${name}'${year}` : name;
};
const venueMarkup = p => p.venueDisplay === p.venue ? esc(p.venue) : `${esc(p.venue)} (<strong>${esc(p.venueShort)}</strong>)`;
const venueLineMarkup = p => `${venueMarkup(p)}, ${p.year}${p.volume ? ` · Vol. ${esc(p.volume)}` : ''}${p.number ? `, Issue ${esc(p.number)}` : ''}${p.publicationStage ? ` · ${esc(p.publicationStage)}` : ''}${p.articleNumber ? ` · Article ${esc(p.articleNumber)}` : ''}${p.pages ? ` · pp. ${esc(p.pages)}` : ''}`;
const onlinePublication = p => {
  const record = researchUpdates.paperDates[p.id];
  return record?.kind === 'Online publication' ? record : null;
};
const venueBadge = p => `<span class="venue-label ${p.type}"><span>${esc(venueLabel(p))}</span><small>${p.type === 'journal' ? 'Journal' : 'Conference'}</small></span>`;
const acceptanceRateMarkup = p => p.acceptanceRate
  ? `Acceptance rate: <strong>${esc(p.acceptanceRate.value)}</strong>`
  : '';
const publicationContext = p => [
  p.specialIssue ? `<p class="publication-issue">${esc(p.specialIssue)}</p>` : '',
  p.acceptanceRate ? `<p class="publication-acceptance">${acceptanceRateMarkup(p)}</p>` : ''
].join('');
const statusLabel = p => p.status === 'Submitted' ? 'Submission' : p.status;
const statusBadge = p => p.status && p.status !== 'Accepted' ? ` <span class="publication-status" data-status="${esc(p.status)}">${esc(statusLabel(p))}</span>` : '';
const researchKeywords = p => p.researchKeywords?.length
  ? `<ul class="pub-keywords" aria-label="Research fields and technologies">${p.researchKeywords.map(keyword => `<li>#${esc(keyword)}</li>`).join('')}</ul>`
  : '';
const paperButton = (p, cls = 'paper-link') => p.paper
  ? `<a class="${cls}" href="${esc(p.paper)}" target="_blank" rel="noopener noreferrer">Paper</a>`
  : `<button class="${cls}" type="button" disabled title="Paper link is not yet available">Paper</button>`;
const authors = p => p.authors.map(name => `${name === 'Junwoo Kim' ? `<strong>${esc(name)}</strong>` : esc(name)}${p.equalContribution?.includes(name) ? '<sup class="contribution-marker">*</sup>' : ''}`).join(', ');
const contributionNote = p => p.equalContribution ? ' <span class="equal-note">(<b>*</b> Equal contribution)</span>' : '';

function bibtex(p) {
  if (publisherBibtex.has(p.slug)) {
    let exported = publisherBibtex.get(p.slug).replace(/^(@\w+\s*\{)[^,]+,/, (_, prefix) => `${prefix}${p.citationKey},`);
    // Publisher exports store abstract and keywords on individual lines.
    exported = exported.replace(/^[ \t]*(?:abstract|keywords)\s*=.*\r?\n/gim, '');
    // Springer may use the DOI as its key without a separate DOI field.
    if (p.doi && !/\bdoi\s*=/i.test(exported)) exported = exported.replace(/^(.*\r?\n)/, `$1  doi={${p.doi}},\n`);
    return exported;
  }
  const fields = {
    title: `{${p.title}}`,
    author: p.authors.map(name => { const parts = name.split(' '); return `${parts.pop()}, ${parts.join(' ')}`; }).join(' and '),
    [p.type === 'journal' ? 'journal' : 'booktitle']: p.booktitle || p.venue,
    year: p.year,
    volume: p.volume,
    number: p.number,
    series: p.series,
    pages: p.pages?.replace('–', '--'),
    publisher: p.publisher,
    doi: p.doi,
    url: p.doi ? `https://doi.org/${p.doi}` : p.paper,
    note: [p.status, p.presentation].filter(Boolean).join('; ') || undefined
  };
  return `@${p.type === 'journal' ? 'article' : 'inproceedings'}{${p.citationKey},\n${Object.entries(fields).filter(([,value]) => value !== undefined).map(([key,value]) => `  ${key} = {${value}}`).join(',\n')}\n}`;
}

function copyButton(p, label = 'Copy BibTeX', cls = 'button small', suffix = '') {
  const showCitation = cls === 'cite-copy';
  return `<button class="${cls} js-only" type="button" data-copy="bibtex-${p.id.toLowerCase()}${suffix}" aria-label="${showCitation ? 'Copy and show BibTeX' : label} for ${esc(p.title)}"${showCitation ? ` aria-controls="cite-${p.id.toLowerCase()}" aria-expanded="false"` : ''} hidden>${label}</button>`;
}

function citation(p) {
  const full = bibtex(p);
  const abbreviation = p.type === 'journal' && {
    'IEEE Transactions on Haptics': 'IEEE Trans. Haptics',
    'IEEE Transactions on Visualization and Computer Graphics': 'IEEE Trans. Vis. Comput. Graph.'
  }[p.venue];
  const versions = abbreviation ? [
    { label: 'v1 · Full journal name', button: 'Copy v1', suffix: '', text: full },
    { label: 'v2 · Abbreviated journal name', button: 'Copy v2', suffix: '-v2', text: full.replace(/^(\s*journal\s*=\s*)\{[^}]+\}/im, `$1{${abbreviation}}`) }
  ] : [{ label: 'BibTeX', button: 'Copy BibTeX', suffix: '', text: full }];
  return `<div data-citation>
    ${versions.map(({ label, button, suffix, text }) => `<div class="citation-box" role="group" aria-label="${label}">
    <div class="citation-toolbar">
      <span class="citation-label">${label}</span>
      ${copyButton(p, button, 'button small', suffix)}<p class="copy-status" role="status" aria-live="polite"></p>
    </div>
    <pre id="bibtex-${p.id.toLowerCase()}${suffix}" data-format="bibtex" tabindex="0" aria-label="${label} citation for ${esc(p.id)}"><code>${esc(text)}</code></pre></div>`).join('\n')}
    <p class="citation-source">${p.bibtexFile ? `BibTeX: ${external(p.paper || p.bibtexSource, esc(p.bibtexSourceLabel || 'Publisher export'))}` : `Provisional citation · ${p.status === 'Accepted' ? 'Accepted' : 'Bibliographic details pending'}`}</p>
  </div>`;
}

function bibliographicDetails(p) {
  const fields = [
    [p.type === 'journal' ? 'Journal' : 'Conference', venueMarkup(p)],
    ['Proceedings', p.booktitle && esc(p.booktitle)],
    ['Year', p.citationYear || p.year],
    ['Conference year', p.citationYear && p.citationYear !== p.year ? p.year : null],
    ['Series', p.series && esc(p.series)],
    ['Published online', onlinePublication(p)?.label], ['Publication stage', p.publicationStage],
    ['Article number', p.articleNumber],
    ['Volume', p.volume], ['Issue', p.number], ['Pages', p.pages],
    ['Special issue', p.specialIssue && external(p.specialIssueSource, esc(p.specialIssue))],
    ['Acceptance rate', p.acceptanceRate && esc(p.acceptanceRate.value)],
    ['Publisher', p.publisher && esc(p.publisher)],
    ['Presentation', p.presentation && esc(p.presentation)],
    ['Status', p.status && esc(p.status)],
    ['DOI', p.doi && external(`https://doi.org/${p.doi}`, esc(p.doi))]
  ];
  return `<dl class="publication-details">${fields.filter(([, value]) => value).map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
}

function projectVideo(p) {
  if (!p.youtubeId) return '';
  const id = encodeURIComponent(p.youtubeId);
  return `<section id="video" class="project-section project-video" aria-labelledby="video-heading">
    <div class="section-heading"><h2 id="video-heading">Project video</h2>${external(`https://www.youtube.com/watch?v=${id}`, 'Watch on YouTube', 'text-link')}</div>
    <iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(p.title)} — project video" width="800" height="450" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
  </section>`;
}

function publication(p, base = '') {
  if (p.ongoing) return ongoingPublication(p);
  const project = `${base}projects/${p.slug}/`;
  const titleLink = `<a href="${project}">${esc(p.title)}</a>`;
  return `<article class="pub-item publication" id="${p.id.toLowerCase()}" data-type="${p.type}" data-first-author="${Boolean(isFirstAuthor(p))}">
    <a class="pub-thumb project-thumb" href="${project}" title="View Project" aria-label="Project: ${esc(p.title)}"><img src="${esc(imageUrl(p, base))}" alt="${esc(p.imageAlt)}" loading="lazy" width="${p.imageWidth || 560}" height="${p.imageHeight || 360}"></a>
    <div class="pub-main">
      <div class="pub-venue"><span class="pub-venue-labels">${venueBadge(p)}${statusBadge(p)}</span>${researchKeywords(p)}</div>
      <h3 class="pub-title"><span class="pub-badge${p.type === 'conference' ? ' conf' : ''}">${p.id}</span>${titleLink}</h3>
      <div class="pub-authors">${authors(p).replaceAll('<strong>', '<span class="me">').replaceAll('</strong>', '</span>')}${contributionNote(p)}</div>
      <div class="pub-venue-full">${venueLineMarkup(p)}</div>
      ${publicationContext(p)}
      <div class="publication-links">${paperButton(p)}<a class="project-link" href="${project}">Project</a>${copyButton(p, 'Citation', 'cite-copy')}<p class="copy-status" role="status" aria-live="polite"></p></div>
    </div>
    <details class="citation-disclosure" id="cite-${p.id.toLowerCase()}"><summary>Citation · BibTeX</summary>${citation(p)}</details>
  </article>`;
}

function ongoingPublication(p) {
  const submitted = p.status === 'Submitted';
  return `<article class="pub-item publication ongoing-publication" id="${p.id.toLowerCase()}" data-type="${p.type}" data-first-author="${isFirstAuthor(p)}" data-ongoing="true" data-status="${p.status.toLowerCase()}">
    <div class="pub-thumb manuscript-placeholder ${submitted ? 'submitted' : 'writing'}">
      <span class="material-symbols-outlined" aria-hidden="true">${submitted ? 'description' : 'edit_note'}</span>
      <strong>${esc(statusLabel(p))}</strong>
      <span>${submitted ? 'Manuscript submitted' : 'Manuscript in preparation'}</span>
    </div>
    <div class="pub-main">
      <div class="pub-venue"><span class="pub-venue-labels">${venueBadge(p)}${submitted ? '' : statusBadge(p)}</span>${researchKeywords(p)}</div>
      <p class="research-topic-label">Research topic</p>
      <h3 class="pub-title">${esc(p.topic)}</h3>
      <div class="pub-authors">${authors(p)}</div>
      <div class="pub-venue-full">${venueLineMarkup(p)}</div>
      <div class="publication-links">${paperButton(p)}<button class="project-link" type="button" disabled title="Project is not yet available">Project</button><button class="cite-copy" type="button" disabled title="Citation is not yet available">Citation</button></div>
    </div>
  </article>`;
}

function publicationGroups() {
  const groups = [
    { id: 'submission', label: 'Submission', items: ongoing.filter(p => p.status === 'Submitted') },
    { id: 'writing', label: 'Writing', items: ongoing.filter(p => p.status === 'Writing') },
    ...[...new Set(papers.map(p => p.year))].map(year => ({
      id: `year-${year}`, label: year, items: papers.filter(p => p.year === year), open: true
    }))
  ];
  return groups.filter(group => group.items.length).map(({ id, label, items, open }) =>
    `<details class="publication-group" id="${id}"${open ? ' open' : ''}><summary><h2 class="pub-category">${label} <span class="pub-category-count" data-year-count>${items.length} ${items.length === 1 ? 'paper' : 'papers'}</span></h2></summary><div class="publication-grid">${items.map(p => publication(p)).join('\n')}</div></details>`
  ).join('\n');
}

function publicationFilters() {
  return `<div class="archive-toolbar">
    <div class="filter-controls js-only" hidden>
      <div class="filter-group" role="group" aria-label="Publication category">
        <button type="button" data-filter="all" aria-pressed="true">All <span>${papers.length}</span></button>
        <button type="button" data-filter="journal" aria-pressed="false">Journal <span>${papers.filter(p => p.type === 'journal').length}</span></button>
        <button type="button" data-filter="conference" aria-pressed="false">Conference <span>${papers.filter(p => p.type === 'conference').length}</span></button>
        <button type="button" data-filter="first-author" aria-pressed="false">1st Author <span>${papers.filter(isFirstAuthor).length}</span></button>
      </div>
    </div>
    <div class="archive-tools"><p class="archive-count" role="status" aria-live="polite">${papers.length} accepted papers</p><p class="archive-submitted-count">${submittedCount} submitted papers</p></div>
  </div><div class="filter-group secondary-filters js-only" role="group" aria-label="Ongoing research status" hidden>
    <button type="button" data-filter="submitted" aria-pressed="false">Submission <span>${submittedCount}</span></button>
    ${writingCount ? `<button type="button" data-filter="writing" aria-pressed="false">Writing <span>${writingCount}</span></button>` : ''}
  </div><p class="publication-empty" role="status" hidden>No papers in this category.</p>`;
}

function paperUpdate(p) {
  const venue = venueLabel(p);
  const dateInfo = researchUpdates.paperDates[p.id];
  const summary = p.ongoing
    ? `Submitted to ${venue}`
    : `“${p.title}” was accepted ${p.type === 'conference' ? 'to' : 'for publication in'} ${venue}.`;
  return {
    ...dateInfo,
    dateLink: dateInfo?.linkToPaper === false ? null : p.paper || (p.doi ? `https://doi.org/${p.doi}` : null),
    id: p.id,
    venue,
    project: p.slug && `projects/${p.slug}/`,
    category: 'Paper',
    type: p.type,
    title: p.title || p.topic,
    topic: p.ongoing ? p.topic : null,
    reviewStage: p.reviewStage,
    summary,
    firstAuthor: Boolean(isFirstAuthor(p)),
    year: p.year
  };
}

function updateMessage(update) {
  const { summary, venue, id } = update;
  const url = researchUpdates.venueLinks[venue];
  if (update.category === 'Paper' && update.topic) {
    const stage = update.reviewStage ? ` <strong>(${esc(update.reviewStage)})</strong>` : '';
    return `<a class="research-update-link" href="#${esc(id.toLowerCase())}">${esc(summary)}${stage}.</a>`;
  }
  if (update.category === 'Patent') {
    const label = `“${esc(update.title)}”`;
    const link = update.source ? external(update.source, label, 'news-paper') : `<a class="news-paper" href="#${esc(id.toLowerCase())}">${label}</a>`;
    return `${link} ${esc(summary)}`;
  }
  if (url && update.category === 'Paper' && !update.topic) {
    const titleLink = `<a class="news-paper" href="${esc(update.project)}">“${esc(update.title)}”</a>`;
    const accepted = update.type === 'conference' ? 'accepted to' : 'accepted for publication in';
    return `${titleLink} was ${accepted} ${external(url, esc(venue), 'news-venue')}.`;
  }
  if (url && update.category === 'Award' && summary.includes(venue)) {
    const at = summary.lastIndexOf(venue);
    const prefix = summary.slice(0, at);
    const suffix = summary.slice(at + venue.length);
    const titleLink = update.title ? external(url, `“${esc(update.title)}”`, 'news-paper') + ' ' : '';
    return `${titleLink}${esc(prefix)}${external(url, esc(venue), 'news-venue')}${esc(suffix)}`;
  }
  if (update.type === 'travel') {
    return esc(summary).replace('POSTECH', '<strong class="postech-name">POSTECH</strong>');
  }
  return update.category !== 'Paper' ? esc(summary) : `<a class="research-update-link" href="#${id.toLowerCase()}">${esc(summary)}</a>`;
}

function researchUpdateList(updates) {
  return `<ol class="research-updates-list">${updates.map(update => {
    const period = update.date
      ? `${update.kind ? esc(update.kind) + " · " : ""}<time datetime="${esc(update.date)}"${update.endDate ? ` data-end-date="${esc(update.endDate)}"` : ''}>${esc(update.label || update.date)}</time>`
      : '';
    const date = !period ? '' : update.dateLink
      ? `<a class="research-update-date" href="${esc(update.dateLink)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(update.label || update.date)} — ${update.category === 'Paper' ? 'view paper' : 'view patent'}">${period}</a>`
      : `<span class="research-update-date">${period}</span>`;
    const type = update.type || update.category.toLowerCase();
    const icon = { Paper: '📄', Award: '🏆', Patent: '💡', 'Travel Support': '✈️' }[update.category];
    const iconMarkup = `<span aria-hidden="true">${icon}</span>`;
    const roleBadge = update.category === 'Paper'
      ? `<span class="research-update-role" title="${update.firstAuthor ? 'First author' : 'Co-author'}">${update.firstAuthor ? '1st' : 'Co'}</span> `
      : '';
    const typeLabel = { conference: 'Conference', journal: 'Journal', award: 'Recognition', patent: 'Application' }[type];
    return `<li class="research-update" data-update-id="${esc(update.id)}" data-update-category="${update.category.toLowerCase()}" data-update-type="${type}" data-first-author="${Boolean(update.firstAuthor)}">
      <div class="research-update-category">
        <span>${update.category}</span>${typeLabel ? `<small>${typeLabel}</small>` : ''}
      </div>
      <div class="research-update-content">
        <p>${iconMarkup}&nbsp;${roleBadge}${updateMessage(update)}</p>
        ${update.topic ? `<p class="research-update-topic">${esc(update.topic)}</p>` : date}
      </div>
    </li>`;
  }).join('\n')}</ol>`;
}

function newsVenues() {
  const groups = [
    ['Journals', ['IEEE TVCG', 'IEEE ToH']],
    ['Conferences', ["ACM UIST'26", "IEEE ISMAR'26", "IEEE WHC'23", "EuroHaptics'24"]]
  ];
  return `<dl class="news-venues">${groups.map(([label, venues]) => {
    const links = venues.map(key => external(researchUpdates.venueLinks[key], esc(key), 'news-venue'));
    return `<div><dt>${label}</dt><dd>${links.join(' · ')}</dd></div>`;
  }).join('')}</dl>`;
}

function researchTimeline() {
  const travel = researchUpdates.travelSupport.map(entry => ({
    ...entry, category: 'Travel Support', type: 'travel',
    summary: `I received BK21 travel support${entry.amountKRW == null ? '' : ` (KRW ${entry.amountKRW.toLocaleString('en-US')})`} from POSTECH to attend an international conference abroad.`
  }));
  const updates = [...travel, ...papers.map(paperUpdate), ...researchUpdates.awards.map(a => ({ ...a, category: 'Award' })), ...researchUpdates.patents.map(p => ({ ...p, category: 'Patent', dateLink: p.source }))]
    // Unknown months sort first within their year, without inventing a publication date.
    // Undated filing announcements stay above the dated history.
    .sort((a, b) => String(b.date || b.year || '9999').padEnd(10, '9').localeCompare(String(a.date || a.year || '9999').padEnd(10, '9')));
  return researchUpdateList(updates);
}

function ongoingWork() {
  return researchUpdateList(ongoing.filter(p => p.status === 'Submitted').map(paperUpdate));
}

function layout({ title, description, content, base = '', page = '', active = 'home', metadata = '' }) {
  return `<!DOCTYPE html>
<!-- Generated by scripts/build.mjs. Edit the templates or data/publications.json, then run npm run build. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#ffffff">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${site}${page}">
  <link rel="canonical" href="${site}${page}">
  <link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${base}assets/research-colors.css">
  <link rel="stylesheet" href="${base}assets/site.css">
  <script src="${base}assets/site.js" defer></script>
  ${metadata}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><nav class="nav-inner" aria-label="Main navigation">
    <a class="nav-logo" href="${base}index.html">Junwoo Kim</a>
    <div class="nav-links"><a href="${base}index.html"${active === 'home' ? ' aria-current="page"' : ''}>Home</a><a href="${base}publications.html"${active === 'publications' ? ' aria-current="page"' : ''}>Publications</a></div>
  </nav></header>
  <main id="main" class="container">${content}</main>
  <footer class="site-footer"><div><a class="wordmark" href="${base}index.html">Junwoo Kim<span class="wordmark-dot">.</span></a><p>Haptics · Human–Computer Interaction · Multimodal AI</p></div><div class="footer-right"><a href="mailto:kjw8515@postech.ac.kr">kjw8515@postech.ac.kr</a><p>© ${new Date().getFullYear()} Junwoo Kim · Ph.D. Student in CSE, POSTECH</p></div></footer>
</body>
</html>\n`.replace(/[ \t]+$/gm, '');
}

const homeTemplate = await readFile(new URL('templates/home.html', root), 'utf8');
const firstAuthorCount = papers.filter(isFirstAuthor).length;
const patentRegions = Object.entries({ KR: 'Domestic', US: 'USA', CN: 'CHINA' }).map(([code, label]) => {
  const count = researchUpdates.patents.filter(patent => patent.jurisdictions.includes(code)).length;
  return `<span>${label} <strong>${count}</strong></span>`;
}).join('');
const home = homeTemplate.replace('{{PROFILE_GALLERY}}', portraitGallery).replace('{{PROFILE_PHOTO}}', esc(portraits[0])).replace('{{PORTRAIT_CONTROLS}}', portraitControls()).replace('{{ONGOING_WORK}}', ongoingWork()).replace('{{NEWS_VENUES}}', newsVenues()).replace('{{RESEARCH_UPDATES}}', researchTimeline()).replace('{{PUBLICATIONS}}', publicationGroups()).replace('{{PUBLICATION_FILTERS}}', publicationFilters()).replace('{{PAPER_COUNT}}', papers.length).replaceAll('{{SUBMITTED_COUNT}}', submittedCount).replace('{{FIRST_AUTHOR_COUNT}}', firstAuthorCount).replace('{{CO_AUTHOR_COUNT}}', papers.length - firstAuthorCount).replace('{{PATENT_REGIONS}}', patentRegions).replace('{{PATENT_COUNT}}', researchUpdates.patents.length).replace('{{YEAR}}', new Date().getFullYear());
await writePage(new URL('index.html', root), home.replace(/[ \t]+$/gm, ''));

const archive = home.replace(/<title>.*?<\/title>/, '<title>Publications | Junwoo Kim</title>')
  .replace('href="https://junwooweb.github.io/"', 'href="https://junwooweb.github.io/publications.html"')
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Publications by Junwoo Kim, with paper links, project summaries, and copyable BibTeX citations.">')
  .replace('class="active" aria-current="page">Home', '>Home')
  .replace('href="publications.html">Publications', 'href="publications.html" class="active" aria-current="page">Publications')
  .replace(/<main[\s\S]*?<\/main>/, `<main id="main" class="container archive-page" data-publication-browser>
  <h1 class="section-title"><span class="material-symbols-outlined" aria-hidden="true">article</span> Publications</h1>
  ${publicationFilters()}
  <div class="publication-list">${publicationGroups()}</div></main>`)
  .replace(/<dialog[\s\S]*?<\/dialog>/, '');
await writePage(new URL('publications.html', root), archive.replace(/[ \t]+$/gm, ''));

await mkdir(new URL('citations/', root), { recursive:true });
for (const p of papers) {
  const base = '../../';
  const related = papers.filter(other => other.slug !== p.slug && (other.tags.some(tag => p.tags.includes(tag)) || (p.slug.includes('torso') && other.slug === 'azimuth-elevation'))).slice(0,2);
  const publicationDetails = venueLineMarkup(p);
  const content = `<a class="back-link" href="${base}publications.html#${p.id.toLowerCase()}">All publications</a>
  <header class="project-header"><p class="eyebrow">${venueBadge(p)} <span class="paper-id">${p.id}</span>${statusBadge(p)}</p><h1>${esc(p.title)}</h1><p class="project-authors">${authors(p)}${contributionNote(p)}</p><p class="project-venue">${publicationDetails}</p>${researchKeywords(p)}<div class="project-actions">${paperButton(p, 'button paper-link')}${p.youtubeId ? '<a class="button video-link" href="#video">Watch video</a>' : ''}<a class="button citation-link" href="#citation">Citation details</a></div></header>
  <figure class="project-figure"><img src="${esc(imageUrl(p, base))}" alt="${esc(p.imageAlt)}" width="${p.imageWidth || 1100}" height="${p.imageHeight || 620}"><figcaption>${esc(p.imageAlt)}.</figcaption></figure>
  <div class="project-content"><section class="project-section"><h2>Abstract</h2><p>${esc(p.abstract)}</p></section>
  <section class="project-section"><h2>Contributions</h2><p>${esc(p.contribution)}</p></section>${p.youtubeId ? `
  ${projectVideo(p)}` : ''}
  <section class="project-section"><h2>Results &amp; Discussion</h2><p>${esc(p.results)}</p></section>
  <section class="project-section" id="citation"><div class="section-heading"><h2>Citation</h2><span class="muted">Publication details &amp; BibTeX</span></div>${bibliographicDetails(p)}${citation(p)}</section>
  ${related.length ? `<section class="project-section related"><h2>Related research</h2>${related.map(other => `<a href="../${other.slug}/"><span>${esc(venueLabel(other))}</span>${esc(other.title)}</a>`).join('')}</section>` : ''}
  </div>`;
  const dir = new URL(`projects/${p.slug}/`, root);
  await mkdir(dir, { recursive:true });
  const metadata = `<meta name="citation_title" content="${esc(p.title)}">${p.authors.map(a => `<meta name="citation_author" content="${esc(a)}">`).join('')}<meta name="citation_publication_date" content="${onlinePublication(p)?.date || p.citationYear || p.year}">${p.doi ? `<meta name="citation_doi" content="${p.doi}">` : ''}`;
  await writePage(new URL('index.html', dir), layout({title:`${p.title} | Junwoo Kim`,description:p.summary,content,base,page:`projects/${p.slug}/`,active:'publications',metadata}));
  await writeFile(new URL(`citations/${p.slug}.bib`, root), `${bibtex(p)}\n`);
}
await writeFile(new URL('citations/all-publications.bib', root), papers.map(bibtex).join('\n\n') + '\n');
console.log(`Built home, publication archive, ${papers.length} project pages, and citations in ${fileURLToPath(root)}`);
