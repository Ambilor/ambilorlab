// ═══════════════════════════════════════════════════════════════════════════
//  capturar.js — pantallas reales de las apps para los demos de Herramientas
//  (2026-10-08). El demo «Ver en acción» de cada app muestra la app de verdad:
//  cada paso es una captura de la app real con datos de ejemplo, abierta con
//  los simuladores de su propio repositorio (sin Google), en el tamaño de la
//  pantalla de cada equipo. El motor del sitio anima encima el puntero (o el
//  dedo), los toques y los resaltados.
//
//  Uso:   node img/demos/capturar.js [ped,v2,v1] [web,tab-h,tab-v,cel-v,cel-h,se]
//         (sin argumentos: todas las apps en todos los equipos)
//  Repos: PEDIDOAPP, CONCILIADOR_V2 y CONCILIADOR_V1 (por omisión, junto a este
//         repositorio: ../pedidoapp, ../conciliador-v2, ../conciliador-v1).
//  Sin internet: AL_CACHE=<carpeta con package/dist (Tabler Icons)>.
//  Requiere Playwright (npm i -g playwright) y python3 con Pillow (para WebP).
//
//  Deja img/demos/<app>/<equipo>/<paso>-<cuadro>.webp, img/demos/<app>/manifiesto.json
//  y vuelve a armar img/demos/capturas.js (lo carga index.html): por app y equipo,
//  el tamaño de la pantalla (px CSS) y, por paso, sus cuadros con el lugar que se
//  toca y los que se resaltan. Un paso null se dibuja (el problema, que no es la app).
//  Al cambiar una app, se vuelve a correr y los demos quedan al día.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync } = require('child_process');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');

const AQUI = __dirname, RAIZ = path.join(AQUI, '..', '..', '..');
const REPO = { ped: process.env.PEDIDOAPP || path.join(RAIZ, 'pedidoapp'), v2: process.env.CONCILIADOR_V2 || path.join(RAIZ, 'conciliador-v2'), v1: process.env.CONCILIADOR_V1 || path.join(RAIZ, 'conciliador-v1') };
const CACHE = process.env.AL_CACHE || '';

// pantalla de la app en cada equipo, en px CSS (lo que queda bajo las barras del navegador), y su densidad
//   web: notebook (pantalla 16:10) · tab-h / tab-v: iPad Pro 11 con Safari · cel-v / cel-h: iPhone 16 Pro con Safari · se: iPhone SE
const EQUIPOS = {
  'web':   { w: 1200, h: 750,  dsf: 1.6,  touch: false },
  'tab-h': { w: 1194, h: 740,  dsf: 1.6,  touch: true },
  'tab-v': { w: 834,  h: 1100, dsf: 1.6,  touch: true },
  'cel-v': { w: 402,  h: 724,  dsf: 1.25, touch: true },
  'cel-h': { w: 750,  h: 341,  dsf: 1.25, touch: true },
  'se':    { w: 375,  h: 548,  dsf: 1.25, touch: true },
};
const UA = { cel: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  tab: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };

// recursos externos de las apps: fuentes de Google directo; Tabler Icons desde la copia local si no hay internet
async function rutasExternas(ctx, propio) {
  await ctx.route(url => !propio(url.toString()), async r => {
    const u = r.request().url();
    if (/wa\.me|api\.whatsapp|picsum|pexels/.test(u)) return r.abort();
    const m = u.match(/@tabler\/icons-webfont@[^/]+\/dist\/(.+?)(\?|$)/);
    if (m && CACHE) { const f = path.join(CACHE, 'package', 'dist', m[1]); if (fs.existsSync(f)) return r.fulfill({ body: fs.readFileSync(f), contentType: /css$/.test(f) ? 'text/css' : 'font/woff2' }); }
    try { return r.continue(); } catch (e) { return r.abort(); }
  });
}

// ── Grabador: un paso es una lista de cuadros; un cuadro es una captura con el lugar que se toca después ──
function grabador(page, app, eq, dir, E) {
  const pasos = []; let actual = null, n = 0;
  const caja = async sel => {
    if (!sel) return null;
    const l = typeof sel === 'string' ? page.locator(sel).filter({ visible: true }).first() : sel;
    const b = await l.boundingBox(); if (!b) throw new Error('sin caja: ' + sel);
    if (b.x < 0 || b.y < 0 || b.x + b.width > E.w + 1 || b.y + b.height > E.h + 1) console.warn('  ' + app + ' ' + eq + ': fuera de la pantalla', sel, JSON.stringify(b));
    return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
  };
  return {
    dibujado() { pasos.push(null); actual = null; },        // paso que se dibuja en el sitio (no es la app)
    paso() { actual = []; pasos.push(actual); n = 0; },
    // foto({ toca: selector, marca: [selectores], lee: segundos }) — captura la pantalla tal como está
    async foto(o = {}) {
      // lo que se va a tocar tiene que verse (en pantallas chicas puede quedar más abajo o al lado, en una tabla que se desliza)
      if (o.toca) await page.locator(o.toca).filter({ visible: true }).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(o.espera || 450);
      const p = pasos.length, nom = p + '-' + (++n), png = path.join(dir, nom + '.png');
      const toca = await caja(o.toca), marca = [];
      for (const s of (o.marca || [])) {   // «*selector»: todos los que se ven (por ejemplo, las filas de un grupo)
        if (s[0] !== '*') { marca.push(await caja(s)); continue; }
        const ls = await page.locator(s.slice(1)).filter({ visible: true }).all();
        for (const l of ls) { const bb = await l.boundingBox(); if (bb && bb.y < E.h && bb.y + bb.height > 0) marca.push([Math.round(bb.x), Math.round(bb.y), Math.round(bb.width), Math.round(bb.height)]); }
      }
      await page.screenshot({ path: png });
      actual.push(Object.assign({ src: nom + '.webp' }, toca ? { toca } : {}, marca.length ? { marca } : {}, o.lee ? { lee: o.lee } : {}));
    },
    async toca(sel) { const l = page.locator(sel).filter({ visible: true }).first(); await l.click(); },
    pasos,
  };
}

// ── PedidoApp: formulario del cliente y panel, con el negocio de ejemplo del simulador del repo ──
async function pedidoApp(b, eq, E, dir) {
  const sim = path.join(REPO.ped, 'simulacion');
  const { crearEntorno } = require(path.join(sim, 'gas-fakes'));
  const { cargarCodigo } = require(path.join(sim, 'cargarCodigo'));
  const e = crearEntorno({ hojas: [], url: 'http://app.local/exec', demo: true });
  const api = cargarCodigo(e); api.asegurarEstructura_(); api.doGet({ parameter: {} });
  const CL = e.caja.props.PA_CLAVE;
  api.panelGuardarConfig(CL, { nombreNegocio: 'Almacén Don Pepe', tagline: 'Todo para tu casa', horarioActivo: false, whatsappDueno: '56912345678', emailDueno: 'ventas@almacendonpepe.cl' });
  api.panelConfirmarCatalogo(CL);   // sin el aviso del catálogo de ejemplo: como un negocio ya en marcha
  api.panelGuardarComunas(CL, [{ comuna: 'Providencia', costo: 3000 }, { comuna: 'Ñuñoa', costo: 3000 }, { comuna: 'Maipú', costo: 4500 }]);
  // movimiento de ejemplo: pedidos de los últimos días en distintos estados (los reportes no quedan vacíos)
  const pub = api.productosPublicos_(api.catalogo_(true)).filter(p => p.stock === null || p.stock > 20);
  const nombres = ['María González', 'Jorge Soto', 'Camila Rojas', 'Pedro Muñoz', 'Valentina Díaz', 'Tomás Herrera', 'Fernanda Silva', 'Ignacio Castro'];
  let s = 7; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < 24; i++) {
    const items = []; for (let j = 0, k = 1 + Math.floor(r() * 3); j < k; j++) items.push({ id: pub[Math.floor(r() * pub.length)].id, cantidad: 1 + Math.floor(r() * 4) });
    const des = r() < 0.6;
    const res = api.enviarPedido({ nombre: nombres[i % 8], wa: '+56 9 ' + (50000000 + i * 7919), email: '', pago: ['Transferencia', 'Efectivo'][i % 2], entrega: des ? 'despacho' : 'retiro', comuna: des ? ['Providencia', 'Ñuñoa', 'Maipú'][i % 3] : '', direccion: des ? 'Calle ' + (100 + i) : '', comentario: '', hp: '', ms: 60000, items });
    if (!res.ok) continue; e.caja.cache = {};
    const u = r(); if (u < 0.75) { api.panelCambiarEstado(CL, res.num, null, 'Confirmado', ''); if (u < 0.5) api.panelCambiarEstado(CL, res.num, null, 'Entregado', ''); }
    if (r() < 0.6) api.panelActualizarPedido(CL, res.num, { pagado: true });
  }
  const ctx = await b.newContext(Object.assign({ viewport: { width: E.w, height: E.h }, deviceScaleFactor: E.dsf, hasTouch: E.touch, isMobile: E.touch && E.w < 1000 },
    E.touch ? { userAgent: E.w < 700 || eq === 'cel-h' ? UA.cel : UA.tab } : {}));
  await rutasExternas(ctx, u => u.startsWith('http://app.local'));
  await ctx.exposeBinding('__gas', (x, n, a) => JSON.stringify(api[n].apply(null, JSON.parse(a)) || null));
  const fake = `<script>(function(){function run(ok,fail){return new Proxy({},{get:function(_,k){ if(k==='withSuccessHandler') return function(f){return run(f,fail)}; if(k==='withFailureHandler') return function(f){return run(ok,f)}; return function(){var a=[].slice.call(arguments); window.__gas(k,JSON.stringify(a)).then(function(r){ setTimeout(function(){ ok&&ok(JSON.parse(r)); },60); }).catch(function(e){ fail&&fail(e); });};}});} window.google={script:{run:run(null,null)}}; window.open=function(){return null};})();</script>`;
  await ctx.route('http://app.local/**', rr => { const u = new URL(rr.request().url()); const parameter = {}; u.searchParams.forEach((v, k) => parameter[k] = v); e.caja.cache = {}; rr.fulfill({ contentType: 'text/html; charset=utf-8', body: api.doGet({ parameter }).getContent().replace('<head>', '<head>' + fake) }); });
  const page = await ctx.newPage(); const err = []; page.on('pageerror', x => err.push(x.message));
  const R = grabador(page, 'ped', eq, dir, E);

  R.dibujado();                                                    // 1 · el problema (chats de WhatsApp)
  // 2 · el catálogo del negocio, desde el enlace
  await page.goto('http://app.local/exec'); await page.waitForTimeout(1500);
  R.paso();
  await R.foto({ toca: '#prods .pc-n', lee: 1.2 });
  await R.toca('#prods .pc-n');
  await R.foto({ toca: '#md-ok', lee: 1.6 });
  await R.toca('#md-ok'); await page.waitForTimeout(2600);   // sin el aviso «agregado»
  await R.foto({ marca: ['#siguiente'], lee: 1.4 });
  // 3 · arma su pedido: entrega, datos y envío
  R.paso();
  await R.toca('#siguiente'); await page.waitForTimeout(400);
  await R.toca('#op-despacho');
  await page.fill('#comuna', 'Providencia'); await page.evaluate(() => { try { buscarComuna(); } catch (e) {} });
  await page.waitForTimeout(300);
  await page.locator('#sug button').first().click();
  await page.fill('#direccion', 'Los Leones 1234, depto 52'); await page.evaluate(() => document.activeElement.blur());
  await R.foto({ toca: '#siguiente', lee: 1.1 });
  await R.toca('#siguiente'); await page.waitForTimeout(400);
  await page.fill('#nombre', 'Josefa Morales'); await page.fill('#wa', '+56 9 6123 4567');
  await page.locator('#pagos .pago').first().click(); await page.evaluate(() => document.activeElement.blur());
  await R.foto({ toca: '#siguiente', lee: 1.1 });
  await R.toca('#siguiente');
  await R.foto({ toca: '#siguiente', lee: 1.2 });
  await R.toca('#siguiente'); await page.waitForTimeout(900);
  await R.foto({ marca: ['#exito h2'], lee: 1.8 });
  // 4 · el pedido aparece en el panel
  await page.goto('http://app.local/exec?admin'); await page.fill('#clave', CL); await page.click('#btn-entrar'); await page.waitForTimeout(1600);
  R.paso();
  await page.locator('.tp.fila').first().evaluate(x => x.scrollIntoView({ block: 'center' }));
  await R.foto({ marca: ['.tp.fila'], toca: '.tp.fila', lee: 1.6 });
  await R.toca('.tp.fila'); await page.waitForTimeout(400);
  await R.foto({ lee: 2.2 });
  // 5 · confirma y avisa por WhatsApp
  await page.evaluate(() => { try { cerrarCajon(); } catch (e) {} });
  R.paso();
  await R.foto({ toca: '.tp.fila .acc .btn', lee: 0.9 });
  await R.toca('.tp.fila .acc .btn'); await page.waitForTimeout(400);
  await R.foto({ marca: ['#msg-previa'], toca: '#modal .btn-wa', lee: 1.8 });
  await R.toca('#modal .btn-wa'); await page.waitForTimeout(900);
  await page.locator('.tp.fila').first().evaluate(x => x.scrollIntoView({ block: 'center' }));
  await R.foto({ marca: ['.tp.fila'], lee: 1.4 });
  // 6 · reportes
  R.paso();
  await page.click('.tab[data-t="reportes"]:visible'); await page.waitForTimeout(900);
  await R.foto({ toca: '#t-reportes >> text=Resumen de hoy', lee: 1.8 });
  await R.toca('#t-reportes >> text=Resumen de hoy'); await page.waitForTimeout(700);
  await R.foto({ lee: 2 });
  await ctx.close();
  if (err.length) console.warn('  errores de la app (' + eq + '):', err.slice(0, 3));
  return R.pasos;
}

// servidor local de una carpeta (las vistas previas de los conciliadores se abren como páginas estáticas)
function servir(raiz) {
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
  const srv = http.createServer((q, r) => { const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  return srv;
}
async function contexto(b, eq, E, propio) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: E.w, height: E.h }, deviceScaleFactor: E.dsf, hasTouch: E.touch, isMobile: E.touch && E.w < 1000 },
    E.touch ? { userAgent: E.w < 700 || eq === 'cel-h' ? UA.cel : UA.tab } : {}));
  await rutasExternas(ctx, propio);
  return ctx;
}

// ── Conciliador V2: el Panel.html real con su backend real (src/*.js) sobre Sheets simulado (vista-previa del repo) ──
async function conciliadorV2(b, eq, E, dir) {
  execFileSync('node', [path.join(REPO.v2, 'vista-previa', 'generar.js')], { stdio: 'ignore' });
  const srv = servir(REPO.v2), base = 'http://localhost:' + srv.address().port;
  const ctx = await contexto(b, eq, E, u => u.startsWith(base));
  const page = await ctx.newPage(); const err = []; page.on('pageerror', x => err.push(x.message)); page.on('dialog', d => d.accept());
  const R = grabador(page, 'v2', eq, dir, E);
  const pestana = async id => { await page.click('nav button[data-pestana="' + id + '"]'); await page.waitForTimeout(900); };
  const arriba = () => page.evaluate(() => scrollTo(0, 0));
  const ver = (sel, block) => page.locator(sel).filter({ visible: true }).first().evaluate((x, bl) => x.scrollIntoView({ block: bl || 'start' }), block);
  const ID = 'https://docs.google.com/spreadsheets/d/1FuenteDeEjemploConciliadorV2_demo/edit';
  await page.goto(base + '/vista-previa/panel.html'); await page.waitForTimeout(2500);

  R.dibujado();                                                    // 1 · el problema (cartola y mayor que no cuadran)
  // 2 · las dos fuentes: cartola y libro mayor, con sus columnas detectadas
  await pestana('configuracion');
  await page.fill('#fuenteUrl', ID); await page.evaluate(() => document.activeElement.blur());
  await ver('#tarjetaFuentes');
  R.paso();
  await R.foto({ toca: '#btnAgregarFuente', lee: 1.2 });
  await R.toca('#btnAgregarFuente');
  await page.fill('#fuente2Url', ID); await page.evaluate(() => document.activeElement.blur());
  await page.click('#tarjetaFuentes button:has-text("Guardar fuentes")'); await page.waitForTimeout(1500);
  await page.selectOption('#fuente2Hoja', { label: 'Mayor banco' }).catch(() => {});
  await ver('#fuente2Url', 'center');
  await R.foto({ toca: '#tarjetaFuentes button:has-text("Guardar fuentes")', lee: 1.3 });
  await R.toca('#tarjetaFuentes button:has-text("Guardar fuentes")'); await page.waitForTimeout(1800);
  await ver('#formColumnas2');
  await R.foto({ marca: ['#toast'], lee: 2 });
  // los pasos que siguen, con los datos de ejemplo de una sola hoja (trae grupos de varias partidas): página nueva
  await page.goto(base + '/vista-previa/panel.html'); await page.waitForTimeout(2500);
  await page.click('#btnEjecutar'); await page.waitForTimeout(2500);
  // 3 · grupos: un abono contra varias facturas
  await pestana('resultados');
  R.paso();
  await R.foto({ toca: '#resultados .chip[data-estado="Conciliado"]', lee: 1.1 });
  await R.toca('#resultados .chip[data-estado="Conciliado"]'); await page.waitForTimeout(500);
  const g1 = await page.locator('#tablaResultados tr:has(.tipo:text-matches("^(1:n|n:1|n:n)$")) .grupo-link').first().textContent();
  const grupo = '#tablaResultados tr:has(.grupo-link:text-is("' + g1.trim() + '"))';
  await ver(grupo, 'start'); await page.evaluate(() => scrollBy(0, -90));
  // en pantallas angostas la tabla se desliza de lado: desde la columna Grupo (grupo, tipo, fecha, concepto y monto)
  await page.evaluate(() => { const t = document.querySelector('#resultados .tabla-envoltura'), th = t.querySelectorAll('th')[2]; t.scrollLeft = Math.min(th.offsetLeft - 4, t.scrollWidth - t.clientWidth); });
  await R.foto({ marca: ['*' + grupo], lee: 2.4 });
  // 4 · reglas que explican comisiones e intereses
  await page.click('#resultados .chip[data-estado="Pendiente"]'); await page.waitForTimeout(500);
  const comision = 'tr:has-text("omisi") .link-regla';
  await ver(comision, 'center');
  R.paso();
  await R.foto({ toca: comision, lee: 1.3 });
  await R.toca(comision); await page.waitForTimeout(800);
  const cat = page.locator('#listaReglas input[id^="rc"]').last();
  await cat.fill('Gasto bancario'); await page.evaluate(() => document.activeElement.blur());
  await cat.evaluate(x => x.scrollIntoView({ block: 'center' }));
  await R.foto({ toca: '#tarjetaReglasExplicar button:has-text("Guardar estas reglas")', lee: 1.6 });
  await R.toca('#tarjetaReglasExplicar button:has-text("Guardar estas reglas")'); await page.waitForTimeout(1500);
  await arriba(); await page.click('#btnEjecutar'); await page.waitForTimeout(2500);
  await pestana('resultados'); await page.click('#resultados .chip[data-estado="Explicado"]'); await page.waitForTimeout(600);
  await ver('#tablaResultados tr.fila-Explicado', 'start'); await page.evaluate(() => scrollBy(0, -90));
  await page.evaluate(() => { const t = document.querySelector('#resultados .tabla-envoltura'), th = t.querySelectorAll('th')[6]; t.scrollLeft = Math.min(th.offsetLeft - 4, t.scrollWidth - t.clientWidth); });
  await R.foto({ marca: ['*#tablaResultados tr.fila-Explicado'], lee: 1.8 });
  // 5 · cada uno recibe lo suyo por correo
  await page.click('#resultados .chip[data-estado="Pendiente"]'); await page.waitForTimeout(500);
  await ver('#resultados .acciones-vista', 'center');
  R.paso();
  await R.foto({ toca: '#resultados button:has-text("Enviar por correo")', lee: 1.1 });
  await R.toca('#resultados button:has-text("Enviar por correo")'); await page.waitForTimeout(700);
  await page.fill('#mPara', 'contabilidad@empresa.cl'); await page.evaluate(() => document.activeElement.blur());
  await R.foto({ marca: ['#mPrevia'], toca: '#btnEnviarMov', lee: 1.8 });
  await R.toca('#btnEnviarMov'); await page.waitForTimeout(1200);
  await R.foto({ marca: ['#toast'], lee: 1.4 });
  // 6 · el resumen: indicadores y sugerencias
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  await arriba(); await pestana('resumen');
  R.paso();
  await R.foto({ marca: ['#kpis'], toca: 'nav button[data-pestana="sugerencias"]', lee: 1.8 });
  await R.toca('nav button[data-pestana="sugerencias"]'); await page.waitForTimeout(900);
  await R.foto({ lee: 2 });
  await ctx.close(); srv.close();
  if (err.length) console.warn('  errores de la app (' + eq + '):', err.slice(0, 3));
  return R.pasos;
}

// ── Conciliador V1: el PanelVista.html real con su motor real (los .gs), sobre las hojas simuladas de sus pruebas ──
function motorV1() {
  const sim = path.join(REPO.v1, 'simulacion'), src = fs.readFileSync(path.join(sim, 'test_integracion.js'), 'utf8');
  // el simulador de hojas de las pruebas del V1 (crearHojaMock y crearMock), tal cual
  const mocks = src.slice(src.indexOf('function crearHojaMock'), src.indexOf('// ---------- CARGAR CODIGO'));
  const { crearHojaMock, crearMock } = new Function(mocks + '\nreturn { crearHojaMock, crearMock };')();
  const archivos = ['Main.gs', 'Columnas.gs', 'Conceptos.gs', 'Reglas.gs', 'Resultado.gs', 'Validacion.gs', 'Log.gs', 'msg.gs', 'Utilidades.js', 'Plantilla.gs', 'PanelControl.gs', 'Configuracion.gs', 'Demo.gs'];
  const codigo = archivos.map(a => fs.readFileSync(path.join(REPO.v1, a), 'utf8')).join('\n');
  const nombres = [...new Set([...codigo.matchAll(/^function ([A-Za-z0-9_]+)\s*\(/gm)].map(m => m[1]))];
  const mock = crearMock();
  const api = new Function('SpreadsheetApp', 'Session', 'Utilities', 'HtmlService', 'ScriptApp', 'PropertiesService', 'LockService', 'console',
    codigo + '\nreturn {' + nombres.join(',') + '};')(mock.SpreadsheetApp, mock.Session, mock.Utilities, mock.HtmlService, mock.ScriptApp, mock.PropertiesService, mock.LockService, { log() {}, warn() {}, error() {}, info() {} });
  const panel = mock.SpreadsheetApp.getActiveSpreadsheet();
  const hojas = {
    CONFIG_COLUMNAS: [['CAMPO', 'COLUMNA', 'OBLIGATORIO', 'ROL'], ['ID', 'ID', 'SI', 'base'], ['FECHA', 'Fecha', 'SI', 'base'], ['CONCEPTO', 'Concepto', 'SI', 'base'], ['RESPONSABLE', 'Responsable', 'NO', 'base'], ['MONTO', 'Monto', 'SI', 'base']],
    REGLAS: [['PARAMETRO', 'VALOR'], ['TOLERANCIA_MONTO', 1], ['VENTANA_DIAS', 7], ['SCORE_MINIMO', 40], ['USAR_CONCEPTO', 'SI'], ['USAR_FECHA', 'SI'], ['EXTRAS_REQUERIDAS', 0]],
    CONCEPTOS: [['PALABRA', 'GRUPO'], ['FACTURA', 'VENTA'], ['PAGO', 'COBRO']],
    RESULTADO: [['Grupo', 'Estado', 'TipoMatch', 'ID', 'Fecha', 'Concepto', 'Monto', 'Comentario']],
    LOG: [['FechaHora', 'Accion', 'Detalle']],
  };
  Object.keys(hojas).forEach(n => { panel.insertSheet(n); hojas[n].forEach(f => panel.getSheetByName(n).appendRow(f)); });
  // la cartola de ejemplo, en un Google Sheet aparte (como la del cliente): facturas y sus pagos del último mes
  const dia = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
  const movs = [['ID', 'Fecha', 'Concepto', 'Responsable', 'Monto']];
  [['Factura F-101 Distribuidora Sur', 500000, 'Ana'], ['Factura F-102 Comercial Norte', 245000, 'Pedro'], ['Factura F-103 Ferretería Centro', 89700, 'Ana'],
   ['Factura F-104 Librería Austral', 410500, 'Carla'], ['Factura F-105 Panadería Los Andes', 132000, 'Pedro'], ['Factura F-106 Ópticas Valle', 76400, 'Carla'],
   ['Factura F-107 Taller Mecánico Ruiz', 318900, 'Ana'], ['Factura F-108 Farmacia Cordillera', 54300, 'Pedro'], ['Factura F-109 Minimarket Don Lucho', 198000, 'Carla']].forEach((f, i) => {
    movs.push(['F' + (101 + i), dia(29 - i * 3), f[0], f[2], f[1]]);
    movs.push(['P' + (101 + i), dia(27 - i * 3), 'Pago ' + f[0].split(' ').slice(0, 2).join(' '), f[2], -f[1]]);
  });
  movs.push(['B22', dia(26), 'Honorario boleta B-22', 'Ana', 120000], ['T17', dia(9), 'Transferencia sin referencia', 'Ana', -120000],
    ['C09', dia(14), 'Comisión mantención cuenta', 'Pedro', -6200], ['D31', dia(4), 'Depósito sin identificar', 'Carla', 230000]);
  const libro = { _h: { 'Movimientos septiembre': crearHojaMock('Movimientos septiembre', movs) } };
  Object.assign(libro, { getId: () => '1CartolaEjemploAmbilorLab', getName: () => 'Cartola banco', getSheetByName: n => libro._h[n] || null, getSheets: () => Object.values(libro._h).map(h => Object.assign(h, { getName: () => h.nombre })),
    insertSheet: n => (libro._h[n] = libro._h[n] || crearHojaMock(n, [])), deleteSheet() {}, setActiveSheet() {} });
  mock.sheetsExternos['1CartolaEjemploAmbilorLab'] = libro;
  return api;
}
async function conciliadorV1(b, eq, E, dir) {
  const api = motorV1();
  const html = fs.readFileSync(path.join(REPO.v1, 'PanelVista.html'), 'utf8');
  const ctx = await contexto(b, eq, E, u => u.startsWith('http://app.local'));
  await ctx.exposeBinding('__gas', (x, n, a) => { const r = api[n].apply(null, JSON.parse(a)); return JSON.stringify(r === undefined ? null : r); });
  const fake = `<script>(function(){function run(h){return new Proxy({},{get:function(_,k){ if(k==='withSuccessHandler') return function(f){return run(Object.assign({},h,{ok:f}))}; if(k==='withFailureHandler') return function(f){return run(Object.assign({},h,{err:f}))}; if(k==='withUserObject') return function(o){return run(Object.assign({},h,{u:o}))}; return function(){var a=[].slice.call(arguments); window.__gas(k,JSON.stringify(a)).then(function(r){ setTimeout(function(){ h.ok&&h.ok(JSON.parse(r),h.u); },60); }).catch(function(e){ h.err&&h.err({message:String(e&&e.message||e)},h.u); });};}});} window.google={script:{run:run({})}};})();</script>`;
  await ctx.route('http://app.local/**', rr => rr.fulfill({ contentType: 'text/html; charset=utf-8', body: html.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1">' + fake) }));   // la etiqueta que pone doGet (addMetaTag)
  const page = await ctx.newPage(); const err = []; page.on('pageerror', x => err.push(x.message)); page.on('dialog', d => d.accept());
  const R = grabador(page, 'v1', eq, dir, E);
  const tab = async t => { await page.click('.tab[data-tab="' + t + '"]'); await page.waitForTimeout(800); };
  const ver = (sel, block) => page.locator(sel).filter({ visible: true }).first().evaluate((x, bl) => x.scrollIntoView({ block: bl || 'start' }), block);
  await page.goto('http://app.local/'); await page.waitForTimeout(2000);

  R.dibujado();                                                    // 1 · el problema (cruzar a mano)
  // 2 · conecta la cartola: el enlace del Google Sheet y sus columnas
  await tab('tabConfiguracion');
  await page.fill('#fuenteUrl', 'https://docs.google.com/spreadsheets/d/1CartolaEjemploAmbilorLab/edit'); await page.evaluate(() => document.activeElement.blur());
  await ver('#tarjetaFuente');
  R.paso();
  await R.foto({ toca: '#btnGuardarFuente', lee: 1.3 });
  await R.toca('#btnGuardarFuente'); await page.waitForTimeout(1500);
  await ver('#formColumnas', 'center');
  await R.foto({ marca: ['#formColumnas'], toca: '#tarjetaFuente button:has-text("Guardar columnas")', lee: 1.8 });
  await R.toca('#tarjetaFuente button:has-text("Guardar columnas")'); await page.waitForTimeout(1200);
  // 3 · ejecuta desde el panel
  await page.evaluate(() => scrollTo(0, 0)); await tab('tabPanel');
  R.paso();
  await R.foto({ toca: '#btnEjecutar', lee: 1.2 });
  await R.toca('#btnEjecutar'); await page.waitForTimeout(2500);
  await page.evaluate(() => scrollTo(0, 0));
  await R.foto({ marca: ['#tarjetaPct'], lee: 2.2 });
  // 4 · cada movimiento con su contraparte y el motivo
  await tab('tabResultados');
  R.paso();
  await R.foto({ toca: '.filtro[data-filtro="Conciliado"]', lee: 1 });
  await R.toca('.filtro[data-filtro="Conciliado"]'); await page.waitForTimeout(600);
  await ver('#tablaWrap', 'start'); await page.evaluate(() => scrollBy(0, -60));
  await R.foto({ lee: 2.4 });
  // 5 · lo que no calzó: se empareja a mano y queda guardado
  await page.click('.filtro[data-filtro="Pendiente"]'); await page.waitForTimeout(600);
  await ver('#tablaWrap', 'start'); await page.evaluate(() => scrollBy(0, -60));
  const fila = id => '#tablaBody tr:has-text("' + id + '") .chk-pendiente';
  R.paso();
  await R.foto({ toca: fila('Honorario boleta B-22'), lee: 1.2 });
  await R.toca(fila('Honorario boleta B-22'));
  await R.foto({ toca: fila('Transferencia sin referencia'), lee: 0.6 });
  await R.toca(fila('Transferencia sin referencia'));
  await R.foto({ toca: '#btnEmparejarManual', lee: 0.8 });
  await R.toca('#btnEmparejarManual'); await page.waitForTimeout(600);
  await R.foto({ toca: '#modalEmparejar button:has-text("Confirmar emparejamiento")', lee: 1.6 });
  await R.toca('#modalEmparejar button:has-text("Confirmar emparejamiento")'); await page.waitForTimeout(1500);
  await R.foto({ lee: 1.6 });
  // 6 · el resultado: todos los movimientos y el reporte
  await page.click('.filtro[data-filtro="todos"]'); await page.waitForTimeout(600);
  await page.evaluate(() => scrollTo(0, 0)); await ver('#tabResultados .filtros', 'start');
  R.paso();
  await R.foto({ toca: '#tabResultados button:has-text("Reporte")', lee: 1.4 });
  await page.evaluate(() => { window.print = () => {}; });
  await R.toca('#tabResultados button:has-text("Reporte")'); await page.waitForTimeout(1200);
  // el reporte se imprime (o se guarda como PDF): se ve como en la vista previa de impresión
  await page.evaluate(() => { document.getElementById('vistaReporte').style.display = 'block'; scrollTo(0, 0); });
  await page.emulateMedia({ media: 'print' });
  await R.foto({ lee: 2.4 });
  await page.emulateMedia({ media: 'screen' });
  await ctx.close();
  if (err.length) console.warn('  errores de la app (' + eq + '):', err.slice(0, 3));
  return R.pasos;
}

const APPS = { ped: pedidoApp, v2: conciliadorV2, v1: conciliadorV1 };

(async () => {
  const apps = (process.argv[2] || Object.keys(APPS).join(',')).split(',');
  const eqs = (process.argv[3] || Object.keys(EQUIPOS).join(',')).split(',');
  const b = await chromium.launch();
  for (const app of apps) {
    const fman = path.join(AQUI, app, 'manifiesto.json');
    const man = fs.existsSync(fman) ? JSON.parse(fs.readFileSync(fman, 'utf8')) : {};
    for (const eq of eqs) {
      const E = EQUIPOS[eq], dir = path.join(AQUI, app, eq);
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      const pasos = await APPS[app](b, eq, E, dir);
      // a WebP (Pillow): calidad suficiente para la letra de la app, sin pesar de más
      const pngs = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
      execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n  Image.open(f).convert("RGB").save(f[:-4]+".webp","WEBP",quality=78,method=6)', ...pngs.map(f => path.join(dir, f))]);
      pngs.forEach(f => fs.unlinkSync(path.join(dir, f)));
      man[eq] = { w: E.w, h: E.h, pasos };
      const kb = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0) / 1024;
      console.log(app, eq, pasos.map(p => p ? p.length : 0).join('+'), 'cuadros ·', Math.round(kb), 'KB');
    }
    fs.writeFileSync(fman, JSON.stringify(man));
  }
  await b.close();
  // capturas.js: todos los manifiestos, para index.html
  const todo = {};
  for (const app of fs.readdirSync(AQUI)) { const f = path.join(AQUI, app, 'manifiesto.json'); if (fs.existsSync(f)) todo[app] = JSON.parse(fs.readFileSync(f, 'utf8')); }
  fs.writeFileSync(path.join(AQUI, 'capturas.js'), '/* Generado por img/demos/capturar.js: no editar a mano. */\nwindow.AL_CAPTURAS = ' + JSON.stringify(todo) + ';\n');
})();
