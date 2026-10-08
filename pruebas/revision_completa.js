#!/usr/bin/env node
/* ═══ Revisión completa del sitio (2026-09-30, Ambilor.Lab) ═══
   Todo lo que hay que confirmar antes de publicar, en una sola corrida. Nace
   de las idas y vueltas del 2026-09-30: revisar.html solo mide encuadre (que
   todo quepa y nada se salga) y no veía movimiento, tamaño para el dedo,
   memoria ni cambios de orientación. Aquí se suman esas pruebas.

   Uso:   node pruebas/revision_completa.js            (lo esencial, ~8 min)
          node pruebas/revision_completa.js --completo  (más tamaños, ~15 min)
          node pruebas/revision_completa.js --solo=memoria,tactil
   Requiere Playwright instalado de forma global (npm i -g playwright) con su
   Chromium. Levanta su propio servidor local. Sin internet (o con los CDN
   bloqueados), AL_CACHE=/carpeta sirve three.js, íconos y fuentes desde una
   copia local (three.js, tabler.css, package/dist/fonts/, fonts.css, gf/).

   Pruebas:
     encuadre     revisar.html en sus 3 modos y 5 pestañas (lo de siempre)
     errores      ningún error de JavaScript en las 5 pestañas, 3 tamaños
     estabilidad  cuadro a cuadro: encabezado, demo, escena, título del paso,
                  texto de abajo y botón no se mueven al reproducir ni al
                  cambiar de demo (celular vertical y horizontal, iPad, web)
     cambio       al tocar "Cómo se instala" / "Ver en acción" la página no
                  se desplaza y el texto de abajo queda quieto
     tactil       en pantallas táctiles los controles miden ≥ 44 px (selector
                  ≥ 40) y la barra no tapa la escena
     memoria      con las 3 herramientas abiertas: ≤ 10 contextos 3D y
                  ≤ 150 MB de lienzos (Safari en iPhone limita ambos)
     sin3d        sin WebGL las demos pasan a texto y no hay errores
     movimiento   con "reducir movimiento" la demo parte en pausa
     girar        girar el teléfono en plena página: la escena se rehace y
                  nada se sale de la pantalla
     legible      tema oscuro y claro, celular y computador, 5 pestañas y cada
                  artículo de Recursos (?r=...): ningún
                  texto bajo 11 px ni con contraste bajo 4,5 (3 en letra grande)
     zoom         letra agrandada (zoom de Safari al 125 % y 150 %, navegador
                  al 150 % y 200 %): nada se sale de la pantalla ni se corta
     recursos     íconos y fuentes propios: cada ícono tiene su dibujo, las
                  fuentes cargan desde el sitio, ningún carácter del texto queda
                  fuera de ellas y nada bloquea la página desde otro servidor
     recuperar    iOS quita las escenas 3D al cambiar de app o bloquear el
                  teléfono: al recuperarlas se vuelven a dibujar (también en
                  pausa) y no quedan en blanco
     primera      al abrir Herramientas en celular vertical se ven el nombre,
                  el selector y el comienzo de la demo (también con la barra
                  flotante de Safari de iOS 26, ~85 px), y el equipo con su
                  barra y la frase del paso caben en una pantalla; en tablet
                  horizontal, el equipo con su barra cabe en el alto visible
   Límite conocido: aquí solo corre Chromium. Safari (WebKit) real, el
   giroscopio real y las barras que se esconden al desplazar se confirman en
   un iPhone/iPad (ver la lista en ESTANDAR_Diseno_Adaptable.md). */
'use strict';
const path = require('path'), fs = require('fs'), http = require('http');
const PW = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const RAIZ = process.env.AL_RAIZ ? path.resolve(process.env.AL_RAIZ) : path.resolve(__dirname, '..');   // AL_RAIZ: revisar otra copia del sitio
const CACHE = process.env.AL_CACHE || '';
const COMPLETO = process.argv.includes('--completo');
const SOLO = ((process.argv.find(a => a.startsWith('--solo=')) || '').slice(7)).split(',').filter(Boolean);
const IPHONE = PW.devices['iPhone 13'].userAgent;
const ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'];
const espera = ms => new Promise(r => setTimeout(r, ms));

// ── servidor local de la carpeta del sitio ──
function servidor(){
  const tipos = { '.html':'text/html; charset=utf-8', '.png':'image/png', '.js':'application/javascript', '.css':'text/css', '.xml':'application/xml', '.txt':'text/plain', '.md':'text/markdown; charset=utf-8', '.svg':'image/svg+xml' };
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (f === '/') f = '/index.html';
      const ruta = path.join(RAIZ, f);
      if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'content-type': tipos[path.extname(ruta)] || 'application/octet-stream' }); fs.createReadStream(ruta).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
let BASE = '';
async function contexto(b, o){
  const ctx = await b.newContext(o);
  if (CACHE) {
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => {
      const u = r.request().url(), dar = (f, ct) => fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: ct, headers: { 'access-control-allow-origin': '*' } }) : r.abort();
      if (u.includes('three')) return dar(CACHE + '/three.js', 'application/javascript');
      if (u.includes('tabler-icons.min.css')) return dar(CACHE + '/tabler.css', 'text/css');
      if (u.includes('/fonts/tabler-icons')) return dar(CACHE + '/package/dist/fonts/' + path.basename(new URL(u).pathname), 'font/woff2');
      if (u.includes('fonts.googleapis')) return dar(CACHE + '/fonts.css', 'text/css');
      return r.abort();
    });
    await ctx.route('**/gf/*', r => r.fulfill({ body: fs.readFileSync(CACHE + '/gf/' + path.basename(new URL(r.request().url()).pathname)), contentType: 'font/ttf' }));
  }
  return ctx;
}
const movil = (w, h, extra) => Object.assign({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, userAgent: IPHONE }, extra || {});
// tamaños con las barras del navegador (lo que realmente se ve)
const CEL_V = [[390, 664, 'iPhone vertical'], [375, 553, 'iPhone SE vertical']].concat(COMPLETO ? [[402, 700, 'iPhone 16 Pro vertical'], [430, 740, 'iPhone Pro Max vertical'], [360, 740, 'Android vertical']] : []);
const CEL_H = [[844, 390, 'iPhone horizontal']].concat(COMPLETO ? [[664, 340, 'iPhone SE horizontal'], [932, 430, 'iPhone Pro Max horizontal']] : []);
const TAB = [[834, 1112, 'iPad vertical'], [1180, 820, 'iPad horizontal']].concat(COMPLETO ? [[744, 1060, 'iPad mini vertical'], [1024, 1292, 'iPad Pro vertical']] : []);
const WEB = [[1440, 900, 'computador'], [720, 860, 'computador a media pantalla']];
const TABS = ['home', 'about', 'product', 'guias', 'contact'];
// Recursos (2026-10-01): cada artículo (?r=...) se revisa también como una página más
const ARTICULOS = [...fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').matchAll(/<article class="rc-doc" data-r="([a-z0-9-]+)"(?! data-oculto)/g)].map(m => m[1]);
const PAGINAS = TABS.map(t => '?p=' + t).concat(ARTICULOS.map(r => '?r=' + r));

const resultados = [];
function informe(nombre, fallas, notas){ resultados.push({ nombre, fallas, notas }); console.log((fallas.length ? '✗ ' : '✓ ') + nombre + (fallas.length ? '\n    ' + fallas.slice(0, 12).join('\n    ') : '') + (notas && notas.length ? '\n    · ' + notas.join('\n    · ') : '')); }

// ── pruebas ──
async function encuadre(b){
  const ctx = await contexto(b, { viewport: { width: 1800, height: 1200 } }), p = await ctx.newPage(), fallas = [];
  for (const q of ['', '?dividida', '?ventana']) for (const id of TABS) {
    await p.goto(BASE + '/revisar.html' + q); await espera(500);
    await p.click('#tabs button[data-id="' + id + '"]');
    await p.waitForFunction(() => !/Revisando/.test(document.getElementById('resumen').textContent), null, { timeout: 300000 });
    const r = await p.evaluate(() => [document.getElementById('resumen').textContent, [...document.querySelectorAll('.disp')].filter(d => !/✓|OK|bien/i.test(d.querySelector('.estado').innerText)).map(d => d.querySelector('h2').textContent + ': ' + d.querySelector('.estado').innerText.replace(/\n/g, ' | '))]);
    if (!/✓/.test(r[0]) || r[1].length) fallas.push('revisar.html' + (q || '') + ' ' + id + ': ' + r[0] + ' ' + r[1].join(' · '));
  }
  await ctx.close(); informe('Encuadre (revisar.html en 3 modos × 5 pestañas)', fallas);
}
async function errores(b){
  const fallas = [];
  for (const [w, h, t] of [CEL_V[0], TAB[0], WEB[0]]) {
    const ctx = await contexto(b, w < 1300 ? movil(w, h) : { viewport: { width: w, height: h } }), p = await ctx.newPage(), err = [];
    p.on('pageerror', e => err.push(e.message));
    for (const tab of TABS) { await p.goto(BASE + '/index.html?p=' + tab); await espera(2500); }
    for (const h2 of ['v2', 'ped']) { await p.goto(BASE + '/index.html?p=product&h=' + h2); await espera(2500); }
    if (err.length) fallas.push(t + ': ' + [...new Set(err)].slice(0, 3).join(' · '));
    await ctx.close();
  }
  informe('Errores de JavaScript (5 pestañas y 3 herramientas)', fallas);
}
async function estabilidad(b){
  const fallas = [];
  for (const [w, h, t] of [].concat(CEL_V, CEL_H, TAB, WEB)) {
    const esMovil = w < 1300, ctx = await contexto(b, esMovil ? movil(w, h) : { viewport: { width: w, height: h } }), p = await ctx.newPage();
    for (const hp of ['v1', 'v2', 'ped']) {
      await p.goto(BASE + '/index.html?p=product&h=' + hp); await espera(2500); await p.evaluate(() => scrollTo(0, 0)); await espera(300);
      await p.evaluate(hp => {
        const pn = document.getElementById('hp-' + hp);
        const sel = { encabezado: '.prod-cab', demos: '.demo-par', demo: '.demo-section:not([hidden]) .al-demo', escena: '.demo-section:not([hidden]) .al-demo__stage', titulo: '.demo-section:not([hidden]) .al-demo__title', 'texto de abajo': '.prod-cel', boton: '.buy-btn' };
        window.__c = {}; window.__b = null; const t0 = performance.now();
        (function f(){
          const m = {};
          for (const k in sel) { const e = pn.querySelector(sel[k]); if (!e || getComputedStyle(e).display === 'none') continue; const r = e.getBoundingClientRect(); m[k] = Math.round(r.top + scrollY) + (k === 'titulo' ? '' : '+' + Math.round(r.height)); }
          if (!window.__b) window.__b = m; else for (const k in m) if (m[k] !== window.__b[k]) (window.__c[k] = window.__c[k] || new Set()).add(m[k]);
          if (performance.now() - t0 < 15000) requestAnimationFrame(f);
        })();
      }, hp);
      await espera(6000);
      const sw = '#hp-' + hp + ' .demo-section:not([hidden]) .demo-cambio button[data-d=';
      if (esMovil) { await p.tap(sw + '"instala"]'); await espera(2500); await p.tap(sw + '"accion"]'); } else { await p.click(sw + '"instala"]'); await espera(2500); await p.click(sw + '"accion"]'); }
      await espera(3500);
      const r = await p.evaluate(() => Object.keys(window.__c).map(k => k + ' ' + window.__b[k] + ' → ' + [...window.__c[k]].slice(0, 3).join(', ')));
      if (r.length) fallas.push(t + ' ' + w + '×' + h + ' ' + hp + ': ' + r.join(' | '));
    }
    await ctx.close();
  }
  informe('Estabilidad cuadro a cuadro (reproducción y cambio de demo)', fallas);
}
async function cambio(b){
  const fallas = [];
  for (const [w, h, t] of [CEL_V[0], CEL_H[0], TAB[0]]) {
    const ctx = await contexto(b, movil(w, h)), p = await ctx.newPage();
    await p.goto(BASE + '/index.html?p=product'); await espera(2500);
    await p.evaluate(() => { const lb = document.querySelector('#hp-v1 .demo-cambio'); scrollTo(0, Math.max(0, lb.getBoundingClientRect().top + scrollY - 70)); });
    await espera(600);
    await p.evaluate(() => { window.__s = new Set(); const t0 = performance.now(); (function f(){ const c = document.querySelector('#hp-v1 .prod-cel'); window.__s.add(Math.round(scrollY) + '/' + Math.round(c.getBoundingClientRect().top)); if (performance.now() - t0 < 5000) requestAnimationFrame(f); })(); });
    for (const d of ['instala', 'accion']) { const bx = await (await p.$('#hp-v1 .demo-section:not([hidden]) .demo-cambio button[data-d="' + d + '"]')).boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await espera(2300); }
    const s = await p.evaluate(() => [...window.__s]);
    if (s.length > 1) fallas.push(t + ': desplazamiento/texto de abajo ' + s.slice(0, 4).join(' → '));
    await ctx.close();
  }
  informe('Cambio de demo: la página no se desplaza', fallas);
}
async function tactil(b){
  const fallas = [];
  for (const [w, h, t] of [CEL_V[0], CEL_H[0], TAB[0], TAB[1]]) {
    const ctx = await contexto(b, movil(w, h)), p = await ctx.newPage();
    for (const hp of ['v1', 'v2', 'ped']) {
      await p.goto(BASE + '/index.html?p=product&h=' + hp); await espera(2200);
      const r = await p.evaluate(hp => {
        const pn = document.getElementById('hp-' + hp), d = pn.querySelector('.demo-section:not([hidden]) .al-demo'), f = [];
        d.querySelectorAll('.al-player .al-demo__btn').forEach(e => { const r = e.getBoundingClientRect(); if (r.width < 44 || r.height < 44) f.push((e.getAttribute('aria-label') || 'botón') + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); });
        pn.querySelectorAll('.demo-section:not([hidden]) .demo-cambio button').forEach(e => { const r = e.getBoundingClientRect(); if (r.height < 40) f.push('selector ' + Math.round(r.height) + ' px'); });
        document.querySelectorAll('#product .hp-tabs .gp-tab').forEach(e => { const r = e.getBoundingClientRect(); if (r.height < 44) f.push('pestaña ' + Math.round(r.height) + ' px'); });
        const bar = d.querySelector('.al-player'), c = d.querySelector('canvas');
        if (bar && c) { const rb = bar.getBoundingClientRect(), rc = c.getBoundingClientRect(); if (rc.bottom > rb.top + 1) f.push('la barra tapa ' + Math.round(rc.bottom - rb.top) + ' px de la escena'); d.querySelectorAll('.al-player .al-demo__btn').forEach(e => { const r = e.getBoundingClientRect(); if (r.bottom > rb.bottom + 1 || r.top < rb.top - 1) f.push('botón fuera de la barra'); }); }
        return [...new Set(f)];
      }, hp);
      if (r.length) fallas.push(t + ' ' + hp + ': ' + r.join(', '));
    }
    await ctx.close();
  }
  informe('Controles para el dedo (≥ 44 px) y barra sin tapar la escena', fallas);
}
async function memoria(b){
  const fallas = [], notas = [];
  const ctx = await contexto(b, movil(390, 664, { deviceScaleFactor: 3 }));
  await ctx.addInitScript(() => { window.__cv = []; const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(t, a){ const r = o.call(this, t, a); if (r && !this.__c) { this.__c = t; window.__cv.push({ c: this, t: t, g: r }); } return r; }; });
  const p = await ctx.newPage();
  const medir = () => p.evaluate(() => { let mb = 0, gl = 0; window.__cv.forEach(x => { if (/webgl/.test(x.t)) { if (!(x.g.isContextLost && x.g.isContextLost())) gl++; } else mb += x.c.width * x.c.height * 4 / 1048576; }); return { gl: gl, mb: Math.round(mb) }; });
  await p.goto(BASE + '/index.html'); await espera(3500); const m0 = await medir();
  await p.evaluate(() => show('product')); await espera(2500);
  for (const hp of ['v2', 'ped', 'v1']) { await p.click('#product .hp-tabs .gp-tab[data-hp="' + hp + '"]'); await espera(1500); await p.click('#hp-' + hp + ' .demo-section:not([hidden]) .demo-cambio button[data-d="instala"]'); await espera(2000); }
  const m1 = await medir();
  notas.push('al abrir: ' + m0.gl + ' contextos 3D, ' + m0.mb + ' MB de lienzos · con las 3 herramientas y sus 6 demos: ' + m1.gl + ' contextos, ' + m1.mb + ' MB');
  if (m1.gl > 10) fallas.push(m1.gl + ' contextos 3D activos (máximo 10)');
  if (m1.mb > 150) fallas.push(m1.mb + ' MB de lienzos (máximo 150)');
  await ctx.close(); informe('Memoria en iPhone (contextos 3D y lienzos)', fallas, notas);
}
async function sin3d(){
  const b = await PW.chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] }), fallas = [];
  const ctx = await contexto(b, movil(390, 664)), p = await ctx.newPage(), err = []; p.on('pageerror', e => err.push(e.message));
  for (const hp of ['v1', 'v2', 'ped']) {
    await p.goto(BASE + '/index.html?p=product&h=' + hp); await espera(3000);
    const r = await p.evaluate(hp => [...document.querySelectorAll('#hp-' + hp + ' .al-demo')].filter(d => d.offsetParent && !d.classList.contains('al-demo--no3d')).map(d => d.id), hp);
    if (r.length) fallas.push(hp + ': sin versión en texto: ' + r.join(', '));
  }
  await p.goto(BASE + '/index.html'); await espera(2500);
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fallas.push('Inicio se sale de la pantalla sin 3D');
  if (err.length) fallas.push('errores: ' + [...new Set(err)].slice(0, 2).join(' · '));
  await b.close(); informe('Sin 3D (las demos pasan a texto)', fallas);
}
async function movimiento(b){
  const fallas = [];
  const ctx = await contexto(b, movil(390, 664, { reducedMotion: 'reduce' })), p = await ctx.newPage(), err = []; p.on('pageerror', e => err.push(e.message));
  await p.goto(BASE + '/index.html?p=product'); await espera(3000);
  if (!await p.evaluate(() => document.getElementById('ver-en-accion').classList.contains('al-demo--manual'))) fallas.push('con "reducir movimiento" la demo no parte en pausa');
  if (err.length) fallas.push('errores: ' + err[0]);
  await ctx.close(); informe('Reducir movimiento', fallas);
}
// iOS 26: Safari dibuja la página detrás de su barra flotante; la pantalla
// completa menos la barra de estado, y ~85 px de abajo quedan tapados
const IOS26 = [[402, 814, 'iPhone 17 Pro (iOS 26)'], [393, 793, 'iPhone 16 (iOS 26)'], [440, 896, 'iPhone Pro Max (iOS 26)']];
async function primera(b){
  const fallas = [];
  for (const [w, h, t, tapa] of CEL_V.map(c => c.concat(0)).concat(IOS26.map(c => c.concat(85)))) {
    const ctx = await contexto(b, movil(w, h)), p = await ctx.newPage();
    await p.goto(BASE + '/index.html?p=product'); await espera(1500);
    for (const hp of ['v1', 'v2', 'ped']) {
      await p.evaluate(hp => { showHP(hp); window.scrollTo(0, 0); }, hp); await espera(700);
      // 2026-10-07: la demo es el equipo completo; al abrir se ven el nombre, qué hace, el selector y el comienzo
      // de la demo, y el equipo con su barra y la frase del paso caben juntos en una pantalla
      const r = await p.evaluate(() => {
        const pn = document.querySelector('#product .hp-panel.on'), d = pn.querySelector('.al-demo:not([hidden])'), q = (e, s) => e.querySelector(s).getBoundingClientRect();
        const fr = d.querySelector('.al-frase');
        return { nombre: q(pn, '.prod-h1').bottom, selector: q(pn, '.demo-section:not([hidden]) .demo-cambio').bottom, demo: q(d, '.al-demo__stage').top,
          alto: (fr ? fr.getBoundingClientRect().bottom : q(d, '.al-player').bottom) - q(d, '.al-paso').top };
      });
      const vis = h - tapa, mal = [];
      if (r.nombre > vis + 1) mal.push('el nombre de la app queda ' + Math.round(r.nombre - vis) + ' px bajo el borde');
      if (r.selector > vis + 1) mal.push('el selector de demo queda ' + Math.round(r.selector - vis) + ' px bajo el borde');
      if (r.demo + 60 > vis + 1) mal.push('la demo empieza ' + Math.round(r.demo + 60 - vis) + ' px bajo el borde');
      if (r.alto > vis + 1) mal.push('el equipo con su barra y la frase mide ' + Math.round(r.alto) + ' px y no cabe en ' + vis);
      if (mal.length) fallas.push(t + ' ' + w + '×' + h + ' ' + hp + ': ' + mal.join(', '));
    }
    await ctx.close();
  }
  // tablet horizontal (2026-10-01, reporte en iPad Pro 11): el recuadro completo de la demo
  // (escena, texto y nota) cabe en el alto visible con las barras de Safari y de Chrome
  for (const [w, h, t] of [[1194, 760, 'iPad Pro 11 horizontal (Safari)'], [1194, 710, 'iPad Pro 11 horizontal (Chrome)'], [1180, 750, 'iPad Air horizontal'], [1133, 680, 'iPad mini horizontal'], [1366, 950, 'iPad Pro 13 horizontal'], [1366, 900, 'iPad Pro 13 horizontal (Chrome)']]) {
    const ctx = await contexto(b, movil(w, h)), p = await ctx.newPage();
    await p.goto(BASE + '/index.html?p=product'); await espera(1500);
    for (const hp of ['v1', 'v2', 'ped']) for (const d of ['accion', 'instala']) {
      await p.evaluate(([hp, d]) => { showHP(hp); const bt = document.querySelector('#hp-' + hp + ' .demo-cambio button[data-d="' + d + '"]'); if (bt && !bt.classList.contains('on')) bt.click(); window.scrollTo(0, 0); }, [hp, d]); await espera(900);
      const alto = await p.evaluate(() => { const e = [...document.querySelectorAll('#product .hp-panel.on .al-demo')].find(x => x.offsetHeight > 0); if (!e) return 0; const st = e.querySelector('.al-demo__stage').getBoundingClientRect(), pa = e.querySelector('.al-paso'); return st.bottom - (pa ? pa.getBoundingClientRect().top : st.top); });
      if (alto > h + 1) fallas.push(t + ' ' + w + '×' + h + ' ' + hp + '/' + d + ': el equipo con su barra mide ' + Math.round(alto) + ' px y no cabe en ' + h);
    }
    await ctx.close();
  }
  informe('Primera pantalla del celular (incluye Safari de iOS 26) y de la tablet horizontal', fallas);   // regla de 2026-10-07
}
// iOS quita los contextos 3D al cambiar de app; la prueba los quita y devuelve con
// WEBGL_lose_context y cuenta los dibujos de cada escena después de devolverlos
async function recuperar(b){
  const fallas = [];
  const ctx = await contexto(b, movil(402, 814, { reducedMotion: 'reduce' }));   // en pausa: el peor caso
  await ctx.addInitScript(() => {
    const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(t, a){
      const r = o.call(this, t, a);
      if (r && /webgl/.test(t) && !this.__gl) {
        this.__gl = r; this.__dibujos = 0; const cv = this;
        for (const m of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (r[m]) { const f = r[m].bind(r); r[m] = function(){ cv.__dibujos++; return f.apply(null, arguments); }; }
      }
      return r;
    };
  });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html?p=product'); await espera(2500);
  for (const hp of ['v1', 'v2']) {
    await p.evaluate(hp => { showHP(hp); window.scrollTo(0, 0); }, hp); await espera(2500);
    const r = await p.evaluate(async hp => {
      const esc = [...document.querySelectorAll('#hp-' + hp + ' .al-demo__stage canvas')].find(c => c.__gl && c.offsetHeight > 0);
      if (!esc) return { error: 'no hay escena 3D a la vista' };
      const todos = [...document.querySelectorAll('canvas')].filter(c => c.__gl), ext = todos.map(c => c.__gl.getExtension('WEBGL_lose_context')).filter(Boolean);
      ext.forEach(e => e.loseContext()); await new Promise(r => setTimeout(r, 800));
      const perdido = esc.__gl.isContextLost();
      esc.__dibujos = 0; ext.forEach(e => e.restoreContext()); await new Promise(r => setTimeout(r, 2500));
      return { perdido, dibujos: esc.__dibujos };
    }, hp);
    if (r.error) fallas.push(hp + ': ' + r.error);
    else if (!r.perdido) fallas.push(hp + ': la prueba no logró quitar la escena (revisar la prueba)');
    else if (!r.dibujos) fallas.push(hp + ': al devolverla, la escena no se vuelve a dibujar (queda en blanco)');
  }
  await ctx.close(); informe('Escenas 3D al volver a la página (iOS las quita y las devuelve)', fallas);
}
async function legible(b){
  const fallas = [];
  for (const tema of ['dark', 'light']) for (const [w, h, t] of [[402, 814, 1], [1440, 900, 0]]) {
    const ctx = await contexto(b, t ? movil(w, h, { reducedMotion: 'reduce' }) : { viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await ctx.addInitScript(t => { try { localStorage.setItem('al-theme', t); } catch (e) {} }, tema);
    const p = await ctx.newPage();
    for (const q of PAGINAS) {
      const tab = q.slice(3);
      await p.goto(BASE + '/index.html' + q); await espera(1500);
      const r = await p.evaluate(tema => {
        const lum = c => { const m = c.match(/[\d.]+/g).map(Number), f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return [.2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]), m[3] === undefined ? 1 : m[3]]; };
        const fondo = tema === 'dark' ? 'rgb(6,8,12)' : 'rgb(238,242,247)', mal = [], sec = document.querySelector('section.visible') || document.body;
        for (const e of sec.querySelectorAll('*')) {
          if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
          const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
          if (!r.width || cs.visibility === 'hidden' || +cs.opacity === 0 || e.closest('[hidden],[aria-hidden="true"],.al-demo__stage,.gp-vis')) continue;   // ilustraciones aparte
          if (e.matches('.demo-cambio button.on') || /transparent|rgba\(0, 0, 0, 0\)/.test(cs.webkitTextFillColor)) continue;
          const fs = parseFloat(cs.fontSize), txt = '«' + e.textContent.trim().slice(0, 30) + '»';
          if (fs < 11) mal.push(fs + ' px ' + txt);
          let bg = null, img = false;
          for (let a = e; a; a = a.parentElement) { const ca = getComputedStyle(a); if (ca.backgroundImage !== 'none' && !/^url/.test(ca.backgroundImage) && a !== document.body) { img = true; break; } if (lum(ca.backgroundColor)[1] > .6) { bg = ca.backgroundColor; break; } }
          if (img) continue;
          const l1 = lum(cs.color)[0], l2 = lum(bg || fondo)[0], cr = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
          if (cr < (fs >= 18.6 || (fs >= 14 && +cs.fontWeight >= 700) ? 3 : 4.5)) mal.push('contraste ' + cr.toFixed(1) + ' ' + txt);
        }
        return mal;
      }, tema);
      if (r.length) fallas.push((tema === 'dark' ? 'oscuro' : 'claro') + ' ' + w + ' ' + tab + ': ' + r.slice(0, 3).join(', ') + (r.length > 3 ? ' (+' + (r.length - 3) + ')' : ''));
    }
    await ctx.close();
  }
  informe('Letra legible: tamaño y contraste en tema oscuro y claro', fallas);
}
async function zoom(b){
  const ctx = await contexto(b, { viewport: { width: 1800, height: 1200 } }), p = await ctx.newPage(), fallas = [];
  for (const id of TABS) {
    await p.goto(BASE + '/revisar.html?tam=268x542,322x651,960x600,720x450'); await espera(500);   // iPhone al 150 % y 125 %, computador al 150 % y 200 %
    await p.click('#tabs button[data-id="' + id + '"]');
    await p.waitForFunction(() => !/Revisando/.test(document.getElementById('resumen').textContent), null, { timeout: 300000 });
    const r = await p.evaluate(() => [...document.querySelectorAll('.disp')].map(d => d.querySelector('h2').textContent + ': ' + d.querySelector('.estado').innerText.replace(/\n/g, ' | ')).filter(t => /Se sale|cortado|horizontal/i.test(t)));
    r.forEach(t => fallas.push(id + ' ' + t));
  }
  await ctx.close(); informe('Letra agrandada (zoom 125 % a 200 %): nada se sale ni se corta', fallas, ['con zoom puede no caber todo en una pantalla: eso se acepta (se desplaza)']);
}
async function recursos(b){
  const fallas = [], ctx = await contexto(b, { viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(), externos = [];
  p.on('request', r => { const u = r.url(); if (/fonts\.googleapis|fonts\.gstatic|icons-webfont/.test(u)) externos.push(u.slice(0, 80)); });
  for (const q of PAGINAS) {
    const tab = q.slice(3);
    await p.goto(BASE + '/index.html' + q); await espera(1500);
    const r = await p.evaluate(async () => {
      await document.fonts.ready;
      const sin = [...document.querySelectorAll('.ti')].filter(e => { const c = getComputedStyle(e, '::before').content; return !c || c === 'none' || c === 'normal' || c === '""'; }).map(e => e.className);
      return { sin, fuentes: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family) };
    });
    if (r.sin.length) fallas.push(tab + ': íconos sin dibujo: ' + r.sin.slice(0, 4).join(', '));
    if (!r.fuentes.includes('Inter')) fallas.push(tab + ': no cargó la fuente Inter');
  }
  if (externos.length) fallas.push('se piden fuentes o íconos a otro servidor: ' + externos[0]);
  // cada carácter del sitio debe estar en las fuentes recortadas (si no, se ve con otra letra)
  const { execSync } = require('child_process');
  try {
    const falta = execSync('python3 ' + JSON.stringify(path.join(__dirname, 'caracteres_fuentes.py')) + ' ' + JSON.stringify(RAIZ)).toString().trim();
    const conocidos = '⊞⏰▮';   // símbolos que ninguna de las dos fuentes trae (también antes): los dibuja el sistema
    const nuevos = [...falta].filter(c => !conocidos.includes(c));
    if (nuevos.length) fallas.push('caracteres que no están en las fuentes recortadas: ' + nuevos.join(' ') + ' (regenerar con pyftsubset)');
  } catch (e) { fallas.push('no se pudo revisar los caracteres (¿falta fontTools?): ' + e.message.split('\n')[0]); }
  await ctx.close(); informe('Íconos y fuentes propios (sin esperar a otros servidores)', fallas);
}
async function girar(b){
  const fallas = [];
  const ctx = await contexto(b, movil(390, 664)), p = await ctx.newPage(), err = []; p.on('pageerror', e => err.push(e.message));
  for (const tab of ['product', 'home', 'guias']) {
    await p.setViewportSize({ width: 390, height: 664 });
    await p.goto(BASE + '/index.html?p=' + tab + (tab === 'product' ? '&h=v2' : '')); await espera(2500);
    const antes = tab === 'product' ? await p.evaluate(() => document.querySelector('#v2-accion canvas').clientWidth) : 0;
    await p.setViewportSize({ width: 844, height: 390 }); await espera(1500);
    const h = await p.evaluate(tab => ({ sale: document.documentElement.scrollWidth > innerWidth + 1, cw: tab === 'product' ? document.querySelector('#v2-accion canvas').clientWidth : 0 }), tab);
    await p.setViewportSize({ width: 390, height: 664 }); await espera(1500);
    const v = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (h.sale || v) fallas.push(tab + ': se sale de la pantalla al girar');
    if (tab === 'product' && h.cw === antes) fallas.push('la escena no se rehízo al girar');
  }
  if (err.length) fallas.push('errores: ' + err[0]);
  await ctx.close(); informe('Girar el teléfono en plena página', fallas);
}

(async () => {
  const srv = await servidor(); BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await PW.chromium.launch({ args: ARGS });
  const pruebas = { encuadre, errores, estabilidad, cambio, tactil, memoria, sin3d, movimiento, girar, primera, recuperar, legible, zoom, recursos };
  const t0 = Date.now();
  for (const [n, f] of Object.entries(pruebas)) {
    if (SOLO.length && !SOLO.includes(n)) continue;
    try { await f(b); } catch (e) { informe(n, ['la prueba no pudo correr: ' + e.message.split('\n')[0]]); }
  }
  await b.close(); srv.close();
  const mal = resultados.filter(r => r.fallas.length);
  console.log('\n' + (mal.length ? '✗ ' + mal.length + ' de ' + resultados.length + ' pruebas con problemas' : '✓ Todo en orden: ' + resultados.length + ' de ' + resultados.length + ' pruebas') + ' (' + Math.round((Date.now() - t0) / 60000) + ' min)');
  console.log('Pendiente siempre en un iPhone/iPad real: ver "Revisión en dispositivo real" en ESTANDAR_Diseno_Adaptable.md');
  process.exit(mal.length ? 1 : 0);
})();
