import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { watch } from 'node:fs';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.bib':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'};
let building = false;
let rebuildPending = false;
async function rebuildPhotos() {
  if (building) { rebuildPending = true; return; }
  building = true;
  do {
    rebuildPending = false;
    await new Promise(resolveBuild => {
      const build = spawn(process.execPath, ['scripts/build.mjs'], { cwd: root, windowsHide: true, stdio: 'inherit' });
      build.on('error', error => { console.error(error.message); resolveBuild(); });
      build.on('close', code => { if (code) console.error('Profile build failed; check the photo folder.'); resolveBuild(); });
    });
  } while (rebuildPending);
  building = false;
}
await rebuildPhotos();
let photoChangeTimer;
const photoWatcher = watch(resolve(root, 'assets/images/profile'), () => {
  clearTimeout(photoChangeTimer);
  photoChangeTimer = setTimeout(rebuildPhotos, 350);
});
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.split(/[\\/]/).some(part => part.startsWith('.') || part === 'node_modules')) { response.writeHead(404).end('Not found'); return; }
    let path = resolve(root, `.${pathname}`);
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) { response.writeHead(404).end('Not found'); return; }
    if ((await stat(path)).isDirectory()) {
      if (!url.pathname.endsWith('/')) { response.writeHead(301, {Location:`${url.pathname}/${url.search}`}).end(); return; }
      path = resolve(path, 'index.html');
    }
    const body = await readFile(path);
    response.writeHead(200, {'Content-Type':types[extname(path).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store'});
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}).end('Not found');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.on('error', () => { photoWatcher.close(); clearTimeout(photoChangeTimer); });
server.on('close', () => { photoWatcher.close(); clearTimeout(photoChangeTimer); });
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
