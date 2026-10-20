/* Renderiza una secuencia de motion/cine a cuadros PNG, para armar el video con ffmpeg (ver motion/LEEME.md, «Cine»).
   Uso (desde la raíz del repo, con el sitio servido en http://127.0.0.1:8765):
     python3 -m http.server 8765 &
     node motion/cine/renderizar.js prototipo/concilia-cine.html /ruta/a/cuadros [ancho alto fps]
   Requiere Playwright con Chromium. Cada cuadro sale de render(t): el resultado es idéntico en cada corrida. */
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const [,, pagina, salida, w = '1280', h = '720', fps = '30'] = process.argv;
if (!pagina || !salida) { console.log('uso: node motion/cine/renderizar.js <página> <carpeta de salida> [ancho alto fps]'); process.exit(1); }
(async () => {
  const W = +w, H = +h, FPS = +fps;
  require('fs').mkdirSync(salida, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERROR', e.message));
  await p.goto('http://127.0.0.1:8765/' + pagina); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: `main{max-width:none;padding:0;margin:0}.cab,.ctrl,.nota,.al-cine__sub{display:none!important}.al-cine{border-radius:0;box-shadow:none;width:${W}px;height:${H}px;aspect-ratio:auto}` });
  await p.evaluate(() => dispatchEvent(new Event('resize')));
  await p.evaluate(() => __cine.pause()); await p.waitForTimeout(500);
  const n = Math.round(await p.evaluate(() => __cine.duracion) * FPS) + 1;
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => __cine.seek(t), i / FPS);
    await p.screenshot({ path: `${salida}/c${String(i).padStart(4, '0')}.png`, clip: { x: 0, y: 0, width: W, height: H } });
  }
  console.log(n + ' cuadros en ' + salida); await b.close();
})();
