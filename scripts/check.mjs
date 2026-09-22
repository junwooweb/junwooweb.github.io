import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const papers = JSON.parse(await readFile(join(root, 'data/publications.json'), 'utf8'));
const files = ['index.html', 'publications.html', ...papers.map(p => `projects/${p.slug}/index.html`)];
const errors = [];
const pages = new Map();
for (const file of files) {
  const path = join(root, file);
  const html = (await readFile(path, 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (ids.length !== new Set(ids).size) errors.push(`Duplicate id in ${file}`);
  if ((html.match(/<h1[ >]/g) || []).length !== 1) errors.push(`Expected one h1 in ${file}`);
  if (html.includes('Jungeun') || /\{\{[A-Z_]+\}\}/.test(html)) errors.push(`Leftover template in ${file}`);
  if (/\bundefined\b|(?:href|src)=""/.test(html)) errors.push(`Missing publication data rendered in ${file}`);
  pages.set(path, {html, ids});
}
let checked = 0;
for (const [path, {html}] of pages) {
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1].replaceAll('&amp;', '&');
    if (/^(https?:|mailto:|data:)/.test(value)) continue;
    const [pathname, hash] = value.split('#');
    let target = pathname ? resolve(dirname(path), decodeURIComponent(pathname)) : path;
    try {
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      await stat(target);
      if (hash && pages.has(target) && !pages.get(target).ids.includes(hash)) errors.push(`Missing anchor ${value} in ${path}`);
      checked++;
    } catch { errors.push(`Missing local target ${value} in ${path}`); }
  }
}
assert.equal(new Set(papers.map(p => p.slug)).size, papers.length, 'Duplicate project slugs');
assert.equal(new Set(papers.map(p => p.id)).size, papers.length, 'Duplicate paper IDs');
assert.equal(new Set(papers.map(p => p.citationKey)).size, papers.length, 'Duplicate citation keys');
for (const p of papers) {
  const bib = await readFile(join(root, `citations/${p.slug}.bib`), 'utf8');
  assert.equal(bib.match(/^@\w+\s*\{([^,]+),/)?.[1], p.citationKey, `Citation key mismatch for ${p.id}`);
  if (p.doi) assert.ok(bib.includes(p.doi), `Missing DOI for ${p.id}`);
  else assert.ok(!/\bdoi\s*=/.test(bib), `Unexpected DOI for ${p.id}`);
  assert.ok(!bib.includes('undefined'), `Missing citation data rendered for ${p.id}`);
  assert.doesNotMatch(bib, /^\s*(?:abstract|keywords)\s*=/im, `Unwanted citation fields for ${p.id}`);
  if (p.status) assert.ok(bib.includes(p.status), `Missing publication status for ${p.id}`);
  const title = bib.match(/\btitle\s*=\s*(?:\{\{([\s\S]*?)\}\}|\{([\s\S]*?)\}|"([\s\S]*?)")\s*,/i);
  const normalized = value => value.replace(/\s+/g, ' ').trim();
  assert.equal(normalized(title?.slice(1).find(Boolean) || ''), normalized(p.title), `Citation title mismatch for ${p.id}`);
  assert.ok(new RegExp(`\\byear\\s*=\\s*[{\"]${p.citationYear || p.year}[}\"]`, 'i').test(bib), `Citation year mismatch for ${p.id}`);
  if (p.bibtexFile) {
    const source = await readFile(join(root, p.bibtexFile), 'utf8');
    const withoutKey = value => value.trim().replace(/^(@\w+\s*\{)[^,]+,/, '$1CITATION_KEY,');
    const originalFields = /\bdoi\s*=/i.test(source) ? bib : bib.replace(/^\s*doi\s*=\s*\{[^}]*\},\r?\n/im, '');
    const citationSource = source.replace(/^[ \t]*(?:abstract|keywords)\s*=.*\r?\n/gim, '');
    assert.equal(withoutKey(originalFields), withoutKey(citationSource), `Publisher bibliographic fields changed for ${p.id}`);
    assert.ok(/^@(article|inproceedings)\{/i.test(source.trim()), `Invalid publisher export for ${p.id}`);
  }
}
assert.deepEqual(errors, []);
console.log(`Verified ${files.length} pages, ${checked} local links/assets, unique anchors, and ${papers.length} citations.`);
