import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const papers = JSON.parse(await readFile(new URL('data/publications.json', root), 'utf8'));
papers.sort((a, b) => b.year - a.year);
const ongoing = JSON.parse(await readFile(new URL('data/ongoing.json', root), 'utf8')).map(p => ({ ...p, ongoing: true }));
const listedPapers = [...ongoing, ...papers].sort((a, b) => b.year - a.year);
const publisherBibtex = new Map(await Promise.all(papers.filter(p => p.bibtexFile).map(async p => [p.slug, (await readFile(new URL(p.bibtexFile, root), 'utf8')).trim()])));
const isFirstAuthor = p => p.firstAuthor ?? (p.authors[0] === 'Junwoo Kim' || p.equalContribution?.includes('Junwoo Kim'));
const release = 'https://github.com/junwooweb/junwooweb.github.io/releases/download/images/';
const site = 'https://junwooweb.github.io/';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url, label, cls = '') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}<span aria-hidden="true"> ↗</span></a>`;
const imageUrl = (p, base = '') => p.image.startsWith('assets/') ? `${base}${p.image}` : `${release}${p.image}`;
const venueLabel = p => {
  const year = String(p.year).slice(-2);
  if (p.presentationShort) return `${p.venueShort} · ${p.presentationShort}'${year}`;
  return p.type === 'conference' ? `${p.venueShort}'${year}` : p.venueShort;
};
const venueLine = p => `${p.venue}, ${p.year}`;
const venueBadge = p => `<span class="venue-label ${p.type}">${esc(venueLabel(p))}</span>`;
const statusBadge = p => p.status ? ` <span class="publication-status" data-status="${esc(p.status)}">${esc(p.status)}</span>` : '';
const authors = p => p.authors.map(name => `${name === 'Junwoo Kim' ? `<strong>${esc(name)}</strong>` : esc(name)}${p.equalContribution?.includes(name) ? '<sup>*</sup>' : ''}`).join(', ');
const contributionNote = p => p.equalContribution ? ' <span class="equal-note">(* Equal contribution)</span>' : '';

function bibtex(p) {
  if (publisherBibtex.has(p.slug)) {
    let exported = publisherBibtex.get(p.slug).replace(/^(@\w+\s*\{)[^,]+,/, (_, prefix) => `${prefix}${p.citationKey},`);
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

function copyButton(p, label = 'Copy BibTeX', cls = 'button small') {
  const showCitation = cls === 'cite-copy';
  return `<button class="${cls} js-only" type="button" data-copy="bibtex-${p.id.toLowerCase()}" aria-label="Copy${showCitation ? ' and show' : ''} BibTeX for ${esc(p.title)}"${showCitation ? ` aria-controls="cite-${p.id.toLowerCase()}" aria-expanded="false"` : ''} hidden>${label}</button>`;
}

function citation(p) {
  return `<div class="citation-box" data-citation>
    <div class="citation-toolbar">
      <span class="citation-label">BibTeX</span>
      ${copyButton(p)}<p class="copy-status" role="status" aria-live="polite"></p>
    </div>
    <pre id="bibtex-${p.id.toLowerCase()}" data-format="bibtex" tabindex="0" aria-label="BibTeX citation for ${esc(p.id)}"><code>${esc(bibtex(p))}</code></pre>
    <p class="citation-source">${p.bibtexFile ? `BibTeX: ${external(p.paper || p.bibtexSource, esc(p.bibtexSourceLabel || 'Publisher export'))}` : 'Provisional citation · To appear'}</p>
  </div>`;
}

function bibliographicDetails(p) {
  const fields = [
    [p.type === 'journal' ? 'Journal' : 'Conference', esc(p.venue)],
    ['Proceedings', p.booktitle && esc(p.booktitle)],
    ['Year', p.citationYear || p.year],
    ['Conference year', p.citationYear && p.citationYear !== p.year ? p.year : null],
    ['Series', p.series && esc(p.series)],
    ['Volume', p.volume], ['Issue', p.number], ['Pages', p.pages],
    ['Publisher', p.publisher && esc(p.publisher)],
    ['Presentation', p.presentation && esc(p.presentation)],
    ['Status', p.status && esc(p.status)],
    ['DOI', p.doi && external(`https://doi.org/${p.doi}`, esc(p.doi))]
  ];
  return `<dl class="publication-details">${fields.filter(([, value]) => value).map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
}

function publication(p, base = '') {
  if (p.ongoing) return ongoingPublication(p);
  const project = `${base}projects/${p.slug}/`;
  const imageLink = p.paper || project;
  const titleLink = p.paper ? `<a href="${esc(p.paper)}" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a>` : `<a href="${project}">${esc(p.title)}</a>`;
  return `<article class="pub-item publication" id="${p.id.toLowerCase()}" data-type="${p.type}" data-first-author="${Boolean(isFirstAuthor(p))}">
    <a class="pub-thumb${p.paper ? '' : ' project-thumb'}" href="${esc(imageLink)}"${p.paper ? ' target="_blank" rel="noopener noreferrer"' : ''} title="${p.paper ? 'View Paper' : 'View Project'}" aria-label="${p.paper ? 'Paper' : 'Project'}: ${esc(p.title)}"><img src="${esc(imageUrl(p, base))}" alt="${esc(p.imageAlt)}" loading="lazy" width="${p.imageWidth || 560}" height="${p.imageHeight || 360}"></a>
    <div class="pub-main">
      <div class="pub-venue">${venueBadge(p)}${statusBadge(p)}</div>
      <h3 class="pub-title"><span class="pub-badge${p.type === 'conference' ? ' conf' : ''}">${p.id}</span>${titleLink}</h3>
      <div class="pub-authors">${authors(p).replaceAll('<strong>', '<span class="me">').replaceAll('</strong>', '</span>')}${contributionNote(p)}</div>
      <div class="pub-venue-full">${esc(venueLine(p))}</div>
      <div class="publication-links">${p.paper ? external(p.paper, 'Paper', 'paper-link') : ''}<a class="project-link" href="${project}">Project <span aria-hidden="true">↗</span></a>${copyButton(p, 'Citation', 'cite-copy')}<p class="copy-status" role="status" aria-live="polite"></p></div>
    </div>
    <details class="citation-disclosure" id="cite-${p.id.toLowerCase()}"><summary>Citation · BibTeX</summary>${citation(p)}</details>
  </article>`;
}

function ongoingPublication(p) {
  const submitted = p.status === 'Submitted';
  return `<article class="pub-item publication ongoing-publication" id="${p.id.toLowerCase()}" data-type="${p.type}" data-first-author="${isFirstAuthor(p)}" data-ongoing="true" data-status="${p.status.toLowerCase()}">
    <div class="pub-thumb manuscript-placeholder ${submitted ? 'submitted' : 'writing'}">
      <span class="material-symbols-outlined" aria-hidden="true">${submitted ? 'description' : 'edit_note'}</span>
      <strong>${esc(p.status)}</strong>
      <span>${submitted ? 'Manuscript submitted' : 'Manuscript in preparation'}</span>
    </div>
    <div class="pub-main">
      <div class="pub-venue">${venueBadge(p)}${statusBadge(p)}</div>
      <p class="research-topic-label">Research topic</p>
      <h3 class="pub-title">${esc(p.topic)}</h3>
      <div class="pub-authors">${authors(p)} <span class="author-role">(${isFirstAuthor(p) ? '1st author' : 'Co-author'})</span></div>
      <div class="pub-venue-full">${esc(venueLine(p))}</div>
    </div>
  </article>`;
}

function byYear(items, base = '') {
  return [...new Set(items.map(p => p.year))].sort((a, b) => b - a).map(year => {
    const group = items.filter(p => p.year === year);
    const acceptedCount = group.filter(p => !p.ongoing).length;
    const countLabel = acceptedCount ? `${acceptedCount} ${acceptedCount === 1 ? 'paper' : 'papers'}` : 'Ongoing work';
    return `<section class="publication-group" aria-labelledby="year-${year}"><h2 class="pub-category" id="year-${year}">${year} <span class="pub-category-count" data-year-count>${countLabel}</span></h2><div class="publication-grid">${group.map(p => publication(p, base)).join('\n')}</div></section>`;
  }).join('\n');
}

function publicationFilters() {
  return `<div class="archive-toolbar">
    <div class="filter-controls js-only" hidden>
      <div class="filter-group" role="group" aria-label="Publication category">
        <button type="button" data-filter="all" aria-pressed="true">All <span>${papers.length}</span></button>
        <button type="button" data-filter="journal" aria-pressed="false">Journal <span>${papers.filter(p => p.type === 'journal').length}</span></button>
        <button type="button" data-filter="conference" aria-pressed="false">Conference <span>${papers.filter(p => p.type === 'conference').length}</span></button>
        <button type="button" data-filter="first-author" aria-pressed="false">1st Paper <span>${papers.filter(isFirstAuthor).length}</span></button>
        <button type="button" data-filter="submitted" aria-pressed="false">Submitted</button>
        <button type="button" data-filter="writing" aria-pressed="false">Writing</button>
      </div>
    </div>
    <div class="archive-tools"><p class="archive-count" role="status" aria-live="polite">${papers.length} accepted papers</p></div>
  </div><p class="filter-note">Counts include accepted papers only (published or to appear). View ongoing work under Submitted or Writing. 1st author includes equal first authorship.</p><p class="publication-empty" role="status" hidden>No papers in this category.</p>`;
}

function layout({ title, description, content, base = '', page = '', active = 'about', metadata = '' }) {
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
  <link rel="stylesheet" href="${base}assets/site.css">
  <script src="${base}assets/site.js" defer></script>
  ${metadata}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><nav class="nav-inner" aria-label="Main navigation">
    <a class="wordmark" href="${base}index.html">Junwoo Kim<span class="wordmark-dot" aria-hidden="true">.</span></a>
    <div class="nav-links"><a href="${base}index.html#about"${active === 'about' ? ' aria-current="page"' : ''}>About</a><a href="${base}index.html#research">Research</a><a href="${base}publications.html"${active === 'publications' ? ' aria-current="page"' : ''}>Publications</a><a href="${base}index.html#education">Education</a></div>
  </nav></header>
  <main id="main" class="container">${content}</main>
  <footer class="site-footer"><div><a class="wordmark" href="${base}index.html">Junwoo Kim<span class="wordmark-dot">.</span></a><p>Haptics · Human–Computer Interaction · Multimodal AI</p></div><div class="footer-right"><a href="mailto:kjw8515@postech.ac.kr">kjw8515@postech.ac.kr ↗</a><p>© ${new Date().getFullYear()} Junwoo Kim · Ph.D. Student in CSE, POSTECH</p></div></footer>
</body>
</html>\n`.replace(/[ \t]+$/gm, '');
}

const homeTemplate = await readFile(new URL('templates/home.html', root), 'utf8');
const home = homeTemplate.replace('{{PUBLICATIONS}}', byYear(listedPapers)).replace('{{PUBLICATION_FILTERS}}', publicationFilters()).replace('{{PAPER_COUNT}}', papers.length).replace('{{FIRST_AUTHOR_COUNT}}', papers.filter(isFirstAuthor).length).replace('{{YEAR}}', new Date().getFullYear());
await writeFile(new URL('index.html', root), home.replace(/[ \t]+$/gm, ''));

const archive = home.replace(/<title>.*?<\/title>/, '<title>Publications | Junwoo Kim</title>')
  .replace('href="https://junwooweb.github.io/"', 'href="https://junwooweb.github.io/publications.html"')
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Publications by Junwoo Kim, with paper links, project summaries, and copyable BibTeX citations.">')
  .replace('class="active" aria-current="page">Home', '>Home')
  .replace('href="publications.html">Publications', 'href="publications.html" class="active" aria-current="page">Publications')
  .replace(/<main[\s\S]*?<\/main>/, `<main id="main" class="container archive-page" data-publication-browser>
  <h1 class="section-title"><span class="material-symbols-outlined" aria-hidden="true">article</span> Publications</h1>
  ${publicationFilters()}
  <div class="publication-list">${byYear(listedPapers)}</div></main>`)
  .replace(/<dialog[\s\S]*?<\/dialog>/, '');
await writeFile(new URL('publications.html', root), archive.replace(/[ \t]+$/gm, ''));

await mkdir(new URL('citations/', root), { recursive:true });
for (const p of papers) {
  const base = '../../';
  const related = papers.filter(other => other.slug !== p.slug && (other.tags.some(tag => p.tags.includes(tag)) || (p.slug.includes('torso') && other.slug === 'azimuth-elevation'))).slice(0,2);
  const highlights = p.findings || p.highlights;
  const publicationDetails = `${venueLine(p)}${p.volume ? ` · ${p.volume}${p.number ? `(${p.number})` : ''}` : ''}${p.pages ? ` · pp. ${p.pages}` : ''}`;
  const sourceNote = p.overviewSource
    ? `${esc(p.overviewSource)}${p.publicationSource ? ` ${external(p.publicationSource, esc(p.publicationSourceLabel))}.` : ''}`
    : `Summary based on ${external(p.source, esc(p.sourceLabel))}.`;
  const content = `<a class="back-link" href="${base}publications.html#${p.id.toLowerCase()}">← All publications</a>
  <header class="project-header"><p class="eyebrow">${venueBadge(p)} <span class="paper-id">${p.id}</span>${statusBadge(p)}</p><h1>${esc(p.title)}</h1><p class="project-authors">${authors(p)}${contributionNote(p)}</p><p class="project-venue">${esc(publicationDetails)}</p><div class="project-actions">${p.paper ? external(p.paper, 'Read paper', 'button filled') : ''}${copyButton(p, 'Copy BibTeX', 'button')}<a class="button" href="#citation">Citation details</a><p class="copy-status" role="status" aria-live="polite"></p></div></header>
  <figure class="project-figure"><img src="${esc(imageUrl(p, base))}" alt="${esc(p.imageAlt)}" width="${p.imageWidth || 1100}" height="${p.imageHeight || 620}"><figcaption>${esc(p.imageAlt)}.</figcaption></figure>
  <div class="project-content"><section class="project-overview"><p class="eyebrow">At a glance</p><h2>${esc(p.question)}</h2><p class="lead">${esc(p.summary)}</p><div class="tags">${p.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div></section>
  <section class="project-section"><h2>The approach</h2><p>${esc(p.approach)}</p></section>
  <section class="project-section"><h2>${p.findings ? 'Key takeaways' : 'Research highlights'}</h2><ol class="takeaways">${highlights.map((f,i) => `<li><span class="takeaway-num" aria-hidden="true">0${i+1}</span><div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div></li>`).join('')}</ol></section>
  <p class="source-note">${sourceNote}</p>
  <section class="project-section" id="citation"><div class="section-heading"><h2>Citation</h2><span class="muted">Publication details &amp; BibTeX</span></div>${bibliographicDetails(p)}${citation(p)}</section>
  ${related.length ? `<section class="project-section related"><h2>Related research</h2>${related.map(other => `<a href="../${other.slug}/"><span>${esc(venueLabel(other))}</span>${esc(other.title)} <span aria-hidden="true">↗</span></a>`).join('')}</section>` : ''}
  </div>`;
  const dir = new URL(`projects/${p.slug}/`, root);
  await mkdir(dir, { recursive:true });
  const metadata = `<meta name="citation_title" content="${esc(p.title)}">${p.authors.map(a => `<meta name="citation_author" content="${esc(a)}">`).join('')}<meta name="citation_publication_date" content="${p.citationYear || p.year}">${p.doi ? `<meta name="citation_doi" content="${p.doi}">` : ''}`;
  await writeFile(new URL('index.html', dir), layout({title:`${p.title} | Junwoo Kim`,description:p.summary,content,base,page:`projects/${p.slug}/`,active:'publications',metadata}));
  await writeFile(new URL(`citations/${p.slug}.bib`, root), `${bibtex(p)}\n`);
}
await writeFile(new URL('citations/all-publications.bib', root), papers.map(bibtex).join('\n\n') + '\n');
console.log(`Built home, publication archive, ${papers.length} project pages, and citations in ${fileURLToPath(root)}`);
