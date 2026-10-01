#!/usr/bin/env node
/* ═══ Comparar estilos antes / después (2026-10-01, Ambilor.Lab) ═══
   Para limpiezas y reordenamientos de CSS: mide la posición, el tamaño y el
   estilo calculado de cada elemento de las 5 pestañas, en 8 tamaños y ambos
   temas, en dos copias del sitio, y muestra lo que cambió. Una limpieza o un
   reordenamiento debe dar "0 diferencias".

   Uso:   git show origin/main:index.html > /tmp/antes/index.html
          node pruebas/comparar_estilos.js /tmp/antes            (contra esta carpeta)
          node pruebas/comparar_estilos.js /tmp/antes /otra/copia
   Sin internet: AL_CACHE=/carpeta (igual que revision_completa.js). */
'use strict';
const path = require('path'), fs = require('fs');
const PW = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const [A, B] = [path.resolve(process.argv[2] || ''), path.resolve(process.argv[3] || path.join(__dirname, '..'))];
const CACHE = process.env.AL_CACHE || '';
if (!process.argv[2] || !fs.existsSync(path.join(A, 'index.html'))) { console.log('Falta la carpeta "antes" con su index.html'); process.exit(2); }
const TAM = [[402, 814, 1, 'dark'], [844, 390, 1, 'dark'], [834, 1112, 1, 'dark'], [1440, 900, 0, 'dark'], [720, 860, 0, 'dark'], [375, 553, 1, 'light'], [1194, 738, 0, 'light'], [268, 542, 1, 'dark']];
const PROPS = ['display', 'position', 'color', 'backgroundColor', 'fontSize', 'fontWeight', 'opacity', 'visibility', 'transform', 'borderTopColor', 'boxShadow', 'gridTemplateColumns', 'padding', 'margin', 'zIndex', 'filter', 'backgroundImage', 'textTransform', 'letterSpacing', 'lineHeight'];
async function foto(b, raiz){
  const res = {};
  for (const [w, h, t, tema] of TAM) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: !!t, hasTouch: !!t, reducedMotion: 'reduce' });
    await ctx.route(/^https?:\/\/(?!sitio\/)/, r => {
      if (!CACHE) return r.continue();
      const u = r.request().url(), dar = (f, ct) => fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: ct, headers: { 'access-control-allow-origin': '*' } }) : r.abort();
      if (u.includes('three')) return dar(CACHE + '/three.js', 'application/javascript');
      if (u.includes('tabler-icons.min.css')) return dar(CACHE + '/tabler.css', 'text/css');
      if (u.includes('/fonts/tabler-icons')) return dar(CACHE + '/package/dist/fonts/' + path.basename(new URL(u).pathname), 'font/woff2');
      if (u.includes('fonts.googleapis')) return dar(CACHE + '/fonts.css', 'text/css');
      return r.abort();
    });
    await ctx.route('http://sitio/**', r => { const f = path.join(raiz, new URL(r.request().url()).pathname); fs.existsSync(f) ? r.fulfill({ path: f }) : r.abort(); });
    if (CACHE) await ctx.route('**/gf/*', r => r.fulfill({ body: fs.readFileSync(CACHE + '/gf/' + path.basename(new URL(r.request().url()).pathname)), contentType: 'font/ttf' }));
    await ctx.addInitScript(t => { try { localStorage.setItem('al-theme', t); } catch (e) {} }, tema);
    const p = await ctx.newPage();
    for (const tab of ['home', 'about', 'product', 'guias', 'contact']) {
      await p.goto('http://sitio/index.html?p=' + tab); await p.waitForTimeout(1500);
      res[`${w}×${h}${t ? ' táctil' : ''} ${tema === 'dark' ? 'oscuro' : 'claro'} ${tab}`] = await p.evaluate(PROPS => {
        const o = [];
        for (const e of document.querySelectorAll('body *')) {
          if (e.closest('script,style,svg *')) continue;
          const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
          o.push([e.tagName + '.' + (typeof e.className === 'string' ? e.className.trim().replace(/\s+/g, '.') : ''), Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height), PROPS.map(k => k + ':' + cs[k]).join(' ')].join(' '));
        }
        return o;
      }, PROPS);
    }
    await ctx.close();
  }
  return res;
}
(async () => {
  const b = await PW.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const x = await foto(b, A), y = await foto(b, B); await b.close();
  let tot = 0;
  for (const k of Object.keys(x)) {
    const a = x[k], c = y[k] || [], d = [];
    if (a.length !== c.length) d.push('cantidad de elementos: ' + a.length + ' → ' + c.length);
    for (let i = 0; i < Math.min(a.length, c.length); i++) if (a[i] !== c[i]) {
      const pa = a[i].split(' '), pc = c[i].split(' ');
      d.push(pa[0] + ': ' + pa.map((v, j) => v !== pc[j] ? v + ' → ' + pc[j] : null).filter(Boolean).slice(0, 4).join(', '));
    }
    if (d.length) { tot += d.length; console.log('== ' + k + ': ' + d.length + ' diferencias'); d.slice(0, 5).forEach(z => console.log('   ' + z.slice(0, 300))); }
  }
  console.log(tot ? '\n✗ ' + tot + ' diferencias' : '✓ 0 diferencias: la página queda idéntica');
  process.exit(tot ? 1 : 0);
})();
