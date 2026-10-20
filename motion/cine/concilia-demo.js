/* ═══ Ambilor.Lab · Cine: demo «Ver en acción» de Concilia (2026-10-20) ═══
   El demo completo como una sola pieza cinematográfica (three.js, vendor/three-r128.min.js), en los 6 capítulos del
   demo. La línea de tiempo, los controles (anterior, pausa, siguiente, reiniciar, deslizar, teclado), la guía de pasos,
   la frase y el resumen final siguen siendo los del motor de demos (alDemoLinea en index.html): este módulo solo dibuja
   la escena para un tiempo T. render(T) es una función pura del tiempo.

     1  0,0 – 4,2   El problema   en la oscuridad llegan la cartola y el libro mayor; no cuadran por $11.740
     2  4,2 – 9,0   Fuentes       la escena se ilumina; Concilia lee las dos fuentes y reconoce sus columnas
     3  9,0 – 13,6  Grupos        escaneo, líneas de relación y los 4 grupos (el abono con sus dos facturas)
     4 13,6 – 18,6  Reglas        la cámara va a lo que no tiene contraparte; una regla deja la comisión «Explicado»
     5 18,6 – 23,8  Avisos        lo que queda pendiente (los intereses) sale por correo; envío automático diario
     6 23,8 – 29,6  Resultado     los registros convergen en la pantalla real de Resultados y cierra la marca

   Datos de ejemplo (los del demo): 6 movimientos de cartola y 5 del mayor. Resultado honesto: 4 grupos conciliados
   (9 movimientos), 1 explicado por regla (la comisión) y 1 por revisar (los intereses).

   Uso: const c = AlCine.conciliaDemo({ canvas, cont });  c.render(T); c.medir(); c.destroy();  c.duracion */
(function(){
  'use strict';
  var C = [0, 4.2, 9.0, 13.6, 18.6, 23.8], DUR = 29.6;
  var CARTOLA = [
    ['03/03', 'Abono Comercial Sur', 2000000, [0, 1]],
    ['04/03', 'Transferencia', -1190000, [2]],
    ['12/03', 'Comisión mantención', -12990, null],
    ['15/03', 'Pago proveedores', -780000, [3]],
    ['20/03', 'Intereses', 1250, null],
    ['22/03', 'Depósito', 45000, [4]]
  ];
  var MAYOR = [
    ['02/03', 'Factura 1002', 1200000],
    ['19/03', 'Factura 1002 saldo', 800000],
    ['04/03', 'Pago fact. 1001', -1190000],
    ['15/03', 'Pago fact. 1003-1004', -780000],
    ['22/03', 'Depósito cliente', 45000]
  ];
  var COMISION = 2, INTERES = 4;
  var cl = function(x, a, b){ return Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, x)); };
  var lerp = function(a, b, t){ return a + (b - a) * t; };
  var tramo = function(t, a, d){ return cl((t - a) / d); };
  var E = {
    out: function(x){ x = cl(x); return 1 - Math.pow(1 - x, 3); },
    outQuint: function(x){ x = cl(x); return 1 - Math.pow(1 - x, 5); },
    inOut: function(x){ x = cl(x); return x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; },
    inOutQuint: function(x){ x = cl(x); return x < .5 ? 16*x*x*x*x*x : 1 - Math.pow(-2*x + 2, 5) / 2; },
    rebote: function(x){ x = cl(x); var c = 1.2; return 1 + (c + 1)*Math.pow(x - 1, 3) + c*Math.pow(x - 1, 2); }
  };
  // aparece en [a, a+d] y se va en [b, b+d2] (1 en medio)
  var ventana = function(t, a, d, b, d2){ return E.out(tramo(t, a, d)) * (b == null ? 1 : 1 - E.inOut(tramo(t, b, d2 || 0.4))); };
  var peso = function(n){ return (n < 0 ? '−$' : '$') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var AZUL = '#1F5C99', LUZ = '#3D7FD6', TINTA = '#12304d', SUAVE = '#6b819a', OK = '#2F8A5B', AVISO = '#E08A2C', EXPL = '#6B5BD2', MALO = '#C4453A';
  var FUENTE = '"Inter", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  function crear(o){
    var THREE = window.THREE; if (!THREE) throw new Error('three.js no está cargado');
    var canvas = o.canvas, cont = o.cont || canvas.parentNode;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.outputEncoding = THREE.sRGBEncoding;
    var escena = new THREE.Scene(); escena.fog = new THREE.Fog(0xf3f7fc, 24, 62);
    var cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 90);
    var limpiar = [], guarda = function(x){ limpiar.push(x); return x; };
    var TXS = Math.min(innerWidth, innerHeight) < 700 ? 1.6 : 2;

    // ── piezas dibujadas ──
    function lienzo(w, h, dib){
      var c = document.createElement('canvas'); c.width = Math.round(w * TXS); c.height = Math.round(h * TXS);
      var g = c.getContext('2d'); g.scale(TXS, TXS); dib(g, w, h);
      var tx = guarda(new THREE.CanvasTexture(c)); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = renderer.capabilities.getMaxAnisotropy(); return tx;
    }
    function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function txt(g, s, x, y, t, p, c, a){ g.font = p + ' ' + t + 'px ' + FUENTE; g.fillStyle = c; g.textAlign = a || 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y); }
    function tarjeta(g, w, h, acento){
      g.shadowColor = 'rgba(18,48,77,.16)'; g.shadowBlur = 22; g.shadowOffsetY = 8; g.fillStyle = '#fff'; rr(g, 12, 10, w - 24, h - 28, 20); g.fill(); g.shadowColor = 'transparent';
      g.strokeStyle = '#d6e1ee'; g.lineWidth = 2; rr(g, 12, 10, w - 24, h - 28, 20); g.stroke();
      if (acento) { g.fillStyle = acento; rr(g, 12, 10, 10, h - 28, 5); g.fill(); }
    }
    function pastilla(g, s, x, y, fondo, tinta, tam, alin){
      g.font = '700 ' + tam + 'px ' + FUENTE; var w = g.measureText(s).width + tam * 1.4, h = tam * 1.9, x0 = alin === 'centro' ? x - w / 2 : x;
      g.fillStyle = fondo; rr(g, x0, y - h / 2, w, h, h / 2); g.fill(); txt(g, s, x0 + w / 2, y + 1, tam, 700, tinta, 'center'); return w;
    }
    var mat = function(p){ return guarda(new THREE.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false, toneMapped: false }, p))); };
    var plano = function(w, h){ return guarda(new THREE.PlaneGeometry(w, h)); };
    var malla = function(w, h, p){ var m = new THREE.Mesh(plano(w, h), mat(p)); raiz.add(m); return m; };
    var texHalo = lienzo(128, 128, function(g){ var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(61,127,214,.9)'); gr.addColorStop(.35, 'rgba(61,127,214,.35)'); gr.addColorStop(1, 'rgba(61,127,214,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    var texHaloRojo = lienzo(128, 128, function(g){ var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(224,138,44,.85)'); gr.addColorStop(.4, 'rgba(224,138,44,.3)'); gr.addColorStop(1, 'rgba(224,138,44,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    var RW = 3.3, RH = 0.5;
    function texRegistro(f, lado){
      return lienzo(660, 100, function(g, w, h){
        g.shadowColor = 'rgba(18,48,77,.10)'; g.shadowBlur = 10; g.shadowOffsetY = 3; g.fillStyle = '#ffffff'; rr(g, 4, 4, w - 8, h - 10, 16); g.fill(); g.shadowColor = 'transparent';
        g.strokeStyle = '#d6e1ee'; g.lineWidth = 2; rr(g, 4, 4, w - 8, h - 10, 16); g.stroke();
        g.fillStyle = lado === 'c' ? AZUL : LUZ; rr(g, 4, 4, 8, h - 10, 4); g.fill();
        txt(g, f[0], 30, h / 2 - 3, 22, 600, SUAVE); txt(g, f[1], 112, h / 2 - 3, 27, 600, TINTA);
        txt(g, peso(f[2]), w - 28, h / 2 - 3, 28, 700, f[2] < 0 ? SUAVE : TINTA, 'right');
      });
    }
    function texArchivo(nombre, sub){
      return lienzo(520, 150, function(g, w, h){
        tarjeta(g, w, h);
        g.fillStyle = '#1e8e3e'; rr(g, 34, 36, 50, 62, 8); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4;
        [52, 66, 80].forEach(function(y){ g.beginPath(); g.moveTo(42, y); g.lineTo(76, y); g.stroke(); }); g.beginPath(); g.moveTo(59, 44); g.lineTo(59, 90); g.stroke();
        txt(g, nombre, 104, 56, 30, 700, TINTA); txt(g, sub, 104, 92, 21, 500, SUAVE);
      });
    }
    function texEtiqueta(s, fondo, tinta, w){ return lienzo(w, 64, function(g){ g.fillStyle = fondo; rr(g, 2, 2, w - 4, 60, 30); g.fill(); txt(g, s, w / 2, 33, 25, 700, tinta, 'center'); }); }
    function texChips(lista){
      return lienzo(660, 64, function(g){ var x = 6; lista.forEach(function(s){ x += pastilla(g, '✓ ' + s, x, 32, '#e6f2eb', OK, 22) + 10; }); });
    }
    function texCapa(sem){
      return lienzo(512, 320, function(g, w, h){
        g.fillStyle = 'rgba(255,255,255,.55)'; rr(g, 2, 2, w - 4, h - 4, 18); g.fill(); g.strokeStyle = 'rgba(61,127,214,.35)'; g.lineWidth = 2; rr(g, 2, 2, w - 4, h - 4, 18); g.stroke();
        for (var k = 0; k < 9; k++) { var y = 30 + k * 31, r = Math.abs(Math.sin(sem * 7 + k * 1.3)); g.fillStyle = 'rgba(31,92,153,' + (0.10 + 0.08 * r) + ')'; rr(g, 24, y, 120 + 180 * r, 10, 5); g.fill(); g.fillStyle = 'rgba(31,92,153,.12)'; rr(g, w - 120, y, 90, 10, 5); g.fill(); }
      });
    }
    // panel de Concilia (cabecera azul como la app) con un cuerpo propio
    function texPanel(w, h, titulo, cuerpo){
      return lienzo(w, h, function(g){
        g.shadowColor = 'rgba(18,48,77,.22)'; g.shadowBlur = 30; g.shadowOffsetY = 12; g.fillStyle = '#fff'; rr(g, 14, 12, w - 28, h - 36, 22); g.fill(); g.shadowColor = 'transparent';
        g.save(); rr(g, 14, 12, w - 28, h - 36, 22); g.clip(); g.fillStyle = AZUL; g.fillRect(14, 12, w - 28, 58); g.restore();
        g.fillStyle = 'rgba(255,255,255,.9)'; rr(g, 34, 29, 24, 24, 6); g.fill(); txt(g, 'Concilia', 70, 42, 25, 700, '#fff'); txt(g, titulo, w - 36, 42, 20, 600, 'rgba(255,255,255,.85)', 'right');
        cuerpo(g, w, h);
      });
    }

    // ── composición ──
    var raiz = new THREE.Group(); escena.add(raiz);
    var piso = new THREE.GridHelper(80, 64, 0x6f9fd6, 0xb7cfe9); piso.position.y = -3.4; piso.material.transparent = true; piso.material.opacity = 0; guarda(piso.geometry); guarda(piso.material); raiz.add(piso);
    var luzPiso = malla(26, 26, { map: texHalo, blending: THREE.AdditiveBlending, opacity: 0 }); luzPiso.rotation.x = -Math.PI / 2; luzPiso.position.set(0, -3.38, -2);
    var texHaz = lienzo(64, 256, function(g){ var gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(61,127,214,0)'); gr.addColorStop(.25, 'rgba(61,127,214,.42)'); gr.addColorStop(1, 'rgba(61,127,214,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      var gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(255,255,255,1)'); gx.addColorStop(.5, 'rgba(255,255,255,0)'); gx.addColorStop(1, 'rgba(255,255,255,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 64, 256); });
    var haces = [[-6, -8, 0.22, 3.2], [-1.5, -12, -0.12, 4.5], [4.5, -9, -0.25, 3.6], [9, -15, -0.1, 5]].map(function(h, k){ var m = malla(h[3], 16, { map: texHaz, blending: THREE.AdditiveBlending, opacity: 0 }); m.position.set(h[0], 3, h[1]); m.rotation.z = h[2]; m.userData.k = k; return m; });
    var capas = [[-7.5, 2.2, -8, 0.2], [6.8, 3.1, -10, 1.1], [-4.0, -1.0, -13, 2.3], [3.6, 0.2, -6.5, 3.4], [9.5, -0.6, -15, 4.2], [-10, 0.8, -17, 5.1], [0.5, 3.8, -19, 6.3], [-2.2, 2.6, -5.5, 7.4], [12, 2.2, -12, 8.1]].map(function(c, k){
      var m = malla(4.4, 2.75, { map: texCapa(c[3]), opacity: 0 }); m.position.set(c[0], c[1], c[2]); m.rotation.y = c[0] > 0 ? -0.35 : 0.35; m.userData = { base: c, k: k }; return m; });
    var NP = 200, pos = new Float32Array(NP * 3), sem = [];
    for (var i = 0; i < NP; i++) sem.push([Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1), Math.abs(Math.sin(i * 78.233) * 12345.678 % 1), Math.abs(Math.sin(i * 39.425) * 9876.54 % 1)]);
    var geoP = guarda(new THREE.BufferGeometry()); geoP.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var polvo = new THREE.Points(geoP, guarda(new THREE.PointsMaterial({ color: 0x3d7fd6, size: 0.06, transparent: true, opacity: 0, depthWrite: false }))); raiz.add(polvo);
    // archivos, columnas detectadas y registros
    var archC = malla(3.0, 0.86, { map: texArchivo('Cartola banco', 'Google Sheets · marzo'), opacity: 0 });
    var archM = malla(3.0, 0.86, { map: texArchivo('Libro mayor', 'Google Sheets · marzo'), opacity: 0 });
    var chipsC = malla(3.3, 0.32, { map: texChips(['Fecha', 'Glosa', 'Cargo / Abono']), opacity: 0 });
    var chipsM = malla(3.3, 0.32, { map: texChips(['Fecha', 'Descripción', 'Debe / Haber']), opacity: 0 });
    var regs = [];
    function registro(f, lado, k){
      var g = new THREE.Group();
      var cara = new THREE.Mesh(plano(RW, RH), mat({ map: texRegistro(f, lado), opacity: 0 })); g.add(cara);
      var borde = new THREE.Mesh(plano(RW + 0.08, RH + 0.08), mat({ color: 0x2f8a5b, opacity: 0 })); borde.position.z = -0.005; g.add(borde);
      var halo = new THREE.Mesh(plano(RW * 1.5, RH * 3.2), mat({ map: texHalo, blending: THREE.AdditiveBlending, opacity: 0 })); halo.position.z = -0.02; g.add(halo);
      g.userData = { lado: lado, k: k, cara: cara, borde: borde, halo: halo }; raiz.add(g); regs.push(g);
    }
    CARTOLA.forEach(function(f, k){ registro(f, 'c', k); }); MAYOR.forEach(function(f, k){ registro(f, 'm', k); });
    var regC = function(k){ return regs[k]; }, regM = function(k){ return regs[CARTOLA.length + k]; };
    // líneas de relación
    var lazos = []; CARTOLA.forEach(function(f, k){ if (f[3]) f[3].forEach(function(j, n){ lazos.push({ c: k, m: j, t0: C[2] + 1.45 + k * 0.16 + n * 0.1 }); }); });
    var matLazo = mat({ color: 0x3d7fd6, opacity: 0.9 }), matLazoOk = mat({ color: 0x2f8a5b, opacity: 0.95 }), matBrillo = mat({ color: 0x3d7fd6, opacity: 0.12, blending: THREE.AdditiveBlending });
    // etiquetas
    var etiq = function(s, fondo, tinta, w, ancho3){ return malla(ancho3, ancho3 * 64 / w, { map: texEtiqueta(s, fondo, tinta, w), opacity: 0 }); };
    var eNoCuadra = etiq('No cuadra · diferencia de $11.740', '#fde8e6', MALO, 560, 3.6);
    var e12 = etiq('1:2 · suman $2.000.000', '#e6f2eb', OK, 440, 2.4);
    var eSinC = etiq('Sin contraparte', '#fdf1e2', '#b4691c', 300, 1.6), eSinI = etiq('Sin contraparte', '#fdf1e2', '#b4691c', 300, 1.6);
    var eExpl = etiq('Explicado · Gasto bancario', '#ece9fb', EXPL, 460, 2.5);
    var ePend = etiq('Por revisar', '#fdf1e2', '#b4691c', 240, 1.3);
    // paneles de Concilia
    var pFuentes = malla(4.6, 2.3, { opacity: 0, map: texPanel(920, 460, 'Configuración', function(g, w){
      txt(g, '1 · Fuentes de datos', 40, 108, 30, 700, TINTA);
      [['Fuente 1', 'Cartola banco', 'Movimientos'], ['Fuente 2', 'Libro mayor', 'Mayor banco']].forEach(function(f, k){ var y = 150 + k * 82;
        g.strokeStyle = '#c9d5e3'; g.lineWidth = 2; rr(g, 40, y, w - 80, 62, 12); g.stroke();
        txt(g, f[0], 60, y + 31, 20, 700, SUAVE); txt(g, f[1], 170, y + 31, 25, 600, TINTA); txt(g, f[2] + ' ▾', w - 60, y + 31, 21, 600, SUAVE, 'right'); });
      g.fillStyle = OK; rr(g, 40, 330, w - 80, 66, 33); g.fill(); txt(g, '✓  2 fuentes listas', w / 2, 364, 26, 700, '#fff', 'center');
    }) });
    var pRegla = malla(4.3, 2.15, { opacity: 0, map: texPanel(860, 430, 'Reglas', function(g, w){
      txt(g, 'Comisiones del banco', 40, 108, 29, 700, TINTA);
      [['si', 'Concepto', 'contiene', 'comisión'], ['y', 'Tipo', 'es cargo', ''], ['y', 'Monto', 'hasta', '$20.000']].forEach(function(c, k){ var y = 160 + k * 52;
        txt(g, c[0], 44, y, 21, 700, SUAVE); txt(g, c[1], 82, y, 24, 700, TINTA); txt(g, c[2], 240, y, 23, 500, SUAVE); if (c[3]) pastilla(g, c[3], 400, y, '#eef2f7', TINTA, 20); });
      txt(g, 'Queda explicado como', 44, 334, 21, 600, SUAVE); pastilla(g, 'Gasto bancario', 330, 334, '#ece9fb', EXPL, 22);
    }) });
    var pCorreo = malla(4.6, 2.5, { opacity: 0, map: texPanel(920, 500, 'Enviar por correo', function(g, w){
      txt(g, 'Para', 40, 112, 20, 700, SUAVE); g.strokeStyle = '#c9d5e3'; g.lineWidth = 2; rr(g, 40, 128, w - 80, 56, 12); g.stroke(); txt(g, 'contabilidad@empresa.cl', 60, 156, 24, 600, TINTA);
      txt(g, 'Asunto', 40, 214, 20, 700, SUAVE); rr(g, 40, 230, w - 80, 56, 12); g.stroke(); txt(g, 'Pendientes de marzo · 1 movimiento', 60, 258, 24, 600, TINTA);
      g.fillStyle = '#f6f8fb'; rr(g, 40, 304, w - 80, 70, 12); g.fill(); txt(g, '20/03 · Intereses · $1.250 · por revisar', 60, 339, 22, 600, TINTA);
      g.fillStyle = OK; rr(g, 40, 396, w - 80, 62, 31); g.fill(); txt(g, '✓  Enviado · queda en Historial', w / 2, 428, 25, 700, '#fff', 'center');
    }) });
    var eAuto = etiq('Envío automático · todos los días, 8:00', '#e6f2eb', OK, 620, 3.4);
    // la pantalla real de Resultados
    var UIW = 9.6, UIH = 6.0;
    var FILAS_UI = [
      ['Grupo 1 · 1:2', 'Abono Comercial Sur · Factura 1002 + saldo', '$2.000.000', 'Conciliado', OK, '#e6f2eb'],
      ['Grupo 2 · 1:1', 'Transferencia · Pago fact. 1001', '−$1.190.000', 'Conciliado', OK, '#e6f2eb'],
      ['Grupo 3 · 1:1', 'Pago proveedores · Pago fact. 1003-1004', '−$780.000', 'Conciliado', OK, '#e6f2eb'],
      ['Grupo 4 · 1:1', 'Depósito · Depósito cliente', '$45.000', 'Conciliado', OK, '#e6f2eb'],
      ['Regla · Gasto bancario', 'Comisión mantención', '−$12.990', 'Explicado', EXPL, '#ece9fb'],
      ['Sin contraparte', 'Intereses', '$1.250', 'Por revisar', AVISO, '#fdf1e2']
    ];
    var texUI = lienzo(1280, 800, function(g, w, h){
      g.fillStyle = '#ffffff'; rr(g, 0, 0, w, h, 26); g.fill(); g.save(); rr(g, 0, 0, w, h, 26); g.clip(); g.fillStyle = AZUL; g.fillRect(0, 0, w, 70); g.restore();
      g.fillStyle = 'rgba(255,255,255,.9)'; rr(g, 28, 22, 26, 26, 6); g.fill(); txt(g, 'Concilia', 70, 36, 30, 700, '#fff');
      g.fillStyle = '#f6f8fb'; g.fillRect(0, 70, w, 64); txt(g, 'Ambilor.Lab', 32, 102, 24, 700, AZUL); txt(g, 'Datos de ejemplo', w - 32, 102, 20, 600, SUAVE, 'right');
      var x = 32; ['Resumen', 'Resultados', 'Sugerencias', 'Historial', 'Configuración'].forEach(function(s, k){ g.font = (k === 1 ? 700 : 500) + ' 22px ' + FUENTE; var tw = g.measureText(s).width;
        if (k === 1) { g.fillStyle = '#e4eef9'; rr(g, x - 12, 142, tw + 24, 40, 9); g.fill(); } txt(g, s, x, 162, 22, k === 1 ? 700 : 500, k === 1 ? AZUL : '#8aa2bb'); x += tw + 34; });
      g.fillStyle = '#c9d5e3'; g.fillRect(0, 194, w, 2);
      FILAS_UI.forEach(function(f, k){ var y = 214 + k * 92; g.fillStyle = k % 2 ? '#fafcfe' : '#ffffff'; g.fillRect(16, y, w - 32, 86);
        txt(g, f[0], 40, y + 30, 20, 700, f[4]); txt(g, f[1], 40, y + 60, 24, 600, TINTA); txt(g, f[2], w - 230, y + 44, 26, 700, TINTA, 'right');
        g.font = '700 20px ' + FUENTE; var pw = g.measureText(f[3]).width + 32; g.fillStyle = f[5]; rr(g, w - 40 - pw, y + 26, pw, 38, 19); g.fill(); txt(g, f[3], w - 40 - pw / 2, y + 46, 20, 700, f[4], 'center');
        g.fillStyle = '#e6edf5'; g.fillRect(16, y + 86, w - 32, 2); });
    });
    var ui = malla(UIW, UIH, { map: texUI, opacity: 0 });
    var texCierre = lienzo(1280, 720, function(g, w){
      txt(g, 'Concilia', w / 2 - 22, 290, 128, 700, AZUL, 'center'); g.font = '700 128px ' + FUENTE; var tw = g.measureText('Concilia').width; g.fillStyle = LUZ; g.beginPath(); g.arc(w / 2 - 22 + tw / 2 + 20, 326, 14, 0, Math.PI * 2); g.fill();
      txt(g, 'Cuadra el banco con tu contabilidad. Tú revisas solo lo pendiente.', w / 2, 418, 34, 500, TINTA, 'center');
      var ps = [['4 grupos conciliados', '#e6f2eb', OK], ['1 explicado', '#ece9fb', EXPL], ['1 por revisar', '#fdf1e2', '#b4691c']]; g.font = '700 26px ' + FUENTE;
      var ws = ps.map(function(p){ return g.measureText(p[0]).width + 56; }), tot = ws.reduce(function(a, b){ return a + b; }, 0) + 32, x = w / 2 - tot / 2;
      ps.forEach(function(p, k){ g.fillStyle = p[1]; rr(g, x, 484, ws[k], 56, 28); g.fill(); txt(g, p[0], x + ws[k] / 2, 513, 26, 700, p[2], 'center'); x += ws[k] + 16; });
      txt(g, 'Datos de ejemplo · Ambilor.Lab', w / 2, 600, 22, 600, SUAVE, 'center');
    });
    var haloCierre = malla(16, 9, { map: texHalo, blending: THREE.AdditiveBlending, opacity: 0 }); haloCierre.position.set(0, 0.6, -1.5);
    var cierre = malla(11.2, 6.3, { map: texCierre, opacity: 0 });
    var barre = malla(2.2, 14, { map: lienzo(128, 32, function(g){ var gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(120,170,235,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 32); }), opacity: 0, blending: THREE.AdditiveBlending }); barre.rotation.z = -0.35;
    var escaner = new THREE.Group(); raiz.add(escaner);
    var lamina = new THREE.Mesh(plano(9.6, 0.05), mat({ color: 0x3d7fd6, opacity: 0 })); escaner.add(lamina);
    var estela = new THREE.Mesh(plano(9.6, 0.9), mat({ map: lienzo(64, 128, function(g){ var gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(61,127,214,0)'); gr.addColorStop(1, 'rgba(61,127,214,.45)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128); }), opacity: 0, blending: THREE.AdditiveBlending })); estela.position.y = 0.47; escaner.add(estela);
    var lazoCorreo = null;   // línea de luz de los intereses al correo (se arma con la disposición)

    // ── disposición: apaisada (dos columnas) o vertical (una columna sobre otra, para el celular) ──
    var D = null;
    function disponer(vert){
      if (D && D.vert === vert) return;
      lazos.forEach(function(l){ if (l.mesh) { raiz.remove(l.mesh); raiz.remove(l.brillo); } });
      if (lazoCorreo) { raiz.remove(lazoCorreo.mesh); }
      var paso = vert ? 0.58 : 0.62;
      D = vert
        ? { vert: true, paso: paso, XC: 0, YC: 3.55, XM: 0, YM: -1.15, filaC: function(k){ return new THREE.Vector3(0, 3.55 - k * paso, 0); }, filaM: function(k){ return new THREE.Vector3(0, -1.15 - k * paso, 0); } }
        : { vert: false, paso: paso, XC: -2.55, YC: 1.55, XM: 2.55, YM: 1.55, filaC: function(k){ return new THREE.Vector3(-2.55, 1.55 - k * paso, 0); }, filaM: function(k){ return new THREE.Vector3(2.55, 1.55 - k * paso, 0); } };
      lazos.forEach(function(l){
        var a = D.filaC(l.c), b = D.filaM(l.m), curva;
        if (vert) { a.x += RW / 2; b.x += RW / 2; a.z = b.z = 0.02; curva = new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x + 1.1, a.y, 0.8), new THREE.Vector3(b.x + 1.1, b.y, 0.8), b); }
        else { a.x += RW / 2; b.x -= RW / 2; a.z = b.z = 0.02; curva = new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x + 1.0, a.y, 0.9), new THREE.Vector3(b.x - 1.0, b.y, 0.9), b); }
        var geo = guarda(new THREE.TubeGeometry(curva, 48, 0.022, 8, false)); l.total = geo.index.count; geo.setDrawRange(0, 0); l.mesh = new THREE.Mesh(geo, matLazo); raiz.add(l.mesh);
        var g2 = guarda(new THREE.TubeGeometry(curva, 48, 0.09, 8, false)); g2.setDrawRange(0, 0); l.brillo = new THREE.Mesh(g2, matBrillo); raiz.add(l.brillo);
      });
      var a = D.filaC(INTERES); a.x += vert ? -RW / 2 : RW / 2; a.z = 0.05;
      var b = vert ? new THREE.Vector3(0, 0.6, 1.3) : new THREE.Vector3(0.2, -0.6, 1.3);
      var cc = new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x + (vert ? -1.2 : 0.9), a.y, 0.7), new THREE.Vector3(b.x, b.y - 1.0, 1.0), b);
      var gc = guarda(new THREE.TubeGeometry(cc, 48, 0.03, 8, false)); lazoCorreo = { mesh: new THREE.Mesh(gc, mat({ color: 0xe08a2c, opacity: 0.9 })), total: gc.index.count }; gc.setDrawRange(0, 0); raiz.add(lazoCorreo.mesh);
    }

    // cámara por fotogramas clave [t, pos, mira]; en cada tramo, salida suave (inOut) o firme (inOutQuint)
    function claves(){
      var fC = D.filaC(COMISION), fI = D.filaC(INTERES);
      if (D.vert) return [
        [0.0,  [-3.2, 4.5, 21], [0, 1.2, -4], E.inOut], [3.4, [-1.2, 1.8, 14.2], [0, 1.4, 0], E.inOutQuint],
        [C[1], [-1.0, 1.8, 14.0], [0, 1.4, 0], E.inOut], [C[1] + 1.4, [0.2, 1.2, 12.6], [0, 1.0, 0], E.inOutQuint], [C[2] - 0.2, [0.1, 1.1, 12.8], [0, 1.0, 0], E.inOut],
        [C[2] + 1.0, [0.6, 0.9, 13.4], [0.4, 0.6, 0], E.inOutQuint], [C[3] - 0.2, [0.8, 0.8, 13.0], [0.4, 0.6, 0], E.inOut],
        [C[3] + 1.3, [0.2, fC.y - 0.9, 9.4], [0, fC.y - 1.3, 0], E.inOutQuint], [C[4] - 0.3, [0.1, fC.y - 1.0, 9.0], [0, fC.y - 1.4, 0], E.inOut],
        [C[4] + 1.2, [0.4, 1.0, 10.8], [0, 0.4, 0.6], E.inOutQuint], [C[5] - 0.2, [0.3, 1.0, 10.4], [0, 0.4, 0.6], E.inOut],
        [C[5] + 1.6, [0, 0.4, 12.6], [0, 0.1, 0], E.inOutQuint], [DUR, [0, 0.5, 12.0], [0, 0.3, 0], E.inOut]
      ];
      return [
        [0.0,  [-5.5, 3.2, 19.5], [0, 0.4, -4], E.inOut], [3.4, [-1.7, 1.0, 10.6], [0, 0.4, -0.3], E.inOutQuint],
        [C[1], [-1.5, 0.9, 10.3], [0, 0.4, -0.3], E.inOut], [C[1] + 1.4, [0, 0.9, 10.2], [0, 0.6, 0], E.inOutQuint], [C[2] - 0.2, [0.2, 0.8, 10.0], [0, 0.5, 0], E.inOut],
        [C[2] + 1.0, [0.6, 0.4, 9.4], [0, 0.0, 0], E.inOutQuint], [C[3] - 0.2, [1.0, 0.3, 8.8], [0, -0.1, 0], E.inOut],
        [C[3] + 1.3, [fC.x + 2.1, fC.y - 0.3, 7.0], [fC.x + 1.75, fC.y - 0.6, 0], E.inOutQuint], [C[4] - 0.3, [fC.x + 2.0, fC.y - 0.4, 6.7], [fC.x + 1.75, fC.y - 0.7, 0], E.inOut],
        [C[4] + 1.2, [0.6, 0.2, 8.6], [0.1, -0.2, 0.6], E.inOutQuint], [C[5] - 0.2, [0.4, 0.2, 8.3], [0.1, -0.2, 0.6], E.inOut],
        [C[5] + 1.6, [0, 0.0, 11.6], [0, -0.1, 0], E.inOutQuint], [DUR, [0, 0.1, 10.8], [0, 0.1, 0], E.inOut]
      ];
    }
    var CAM = null, vA = new THREE.Vector3(), vB = new THREE.Vector3();
    function camara(t){
      var k = 0; while (k < CAM.length - 2 && t >= CAM[k + 1][0]) k++;
      var a = CAM[k], b = CAM[k + 1], p = a[3](tramo(t, a[0], b[0] - a[0]));
      cam.position.set(lerp(a[1][0], b[1][0], p), lerp(a[1][1], b[1][1], p), lerp(a[1][2], b[1][2], p));
      cam.position.x += Math.sin(t * 0.9) * 0.05; cam.position.y += Math.sin(t * 1.3 + 1) * 0.03;   // cámara en mano, muy leve
      vA.set(lerp(a[2][0], b[2][0], p), lerp(a[2][1], b[2][1], p), lerp(a[2][2], b[2][2], p));
      var K = D.vert ? Math.max(1, 0.62 / cam.aspect) : Math.max(1, (16 / 9) / cam.aspect);   // recuadro más angosto: la cámara se aleja para que quepa
      if (K > 1) { vB.copy(cam.position).sub(vA).multiplyScalar(Math.min(K, 2.4)); cam.position.copy(vA).add(vB); }
      cam.lookAt(vA);
    }

    var NOCHE = new THREE.Color(0x0b1d33).convertSRGBToLinear(), DIA = new THREE.Color(0xf3f7fc).convertSRGBToLinear(), cielo = new THREE.Color();
    function render(T){
      var t = cl(T, 0, DUR); camara(t);
      // luz: el problema ocurre a oscuras; al entrar Concilia la escena se ilumina
      var dia = E.inOut(tramo(t, C[1] + 0.1, 1.6)); cielo.copy(NOCHE).lerp(DIA, dia); renderer.setClearColor(cielo, 1); escena.fog.color.copy(cielo);
      var fin = tramo(t, C[5] + 0.1, 1.4), oscuro = 1 - dia;
      piso.material.opacity = 0.75 * E.out(tramo(t, 0.1, 1.4)) * (1 - fin * 0.9);
      luzPiso.material.opacity = lerp(0.9, 0.4, dia) * E.out(tramo(t, 0.3, 1.6)) * (1 - fin);
      haces.forEach(function(m){ var k = m.userData.k; m.material.opacity = (0.55 + 0.15 * Math.sin(t * 0.8 + k * 1.7)) * E.out(tramo(t, 0.2 + k * 0.25, 1.4)) * lerp(1, 0.3, dia) * (1 - fin); });
      capas.forEach(function(m){ var b = m.userData.base, k = m.userData.k, e = E.out(tramo(t, 0.15 + k * 0.15, 1.1)); m.material.opacity = 0.9 * e * (1 - fin * 0.85);
        m.position.set(b[0] + Math.sin(t * 0.25 + k) * 0.25, b[1] + Math.sin(t * 0.35 + k * 2) * 0.18 - (1 - e) * 1.2, b[2]); });
      for (var i = 0; i < NP; i++) { var s = sem[i]; pos[i*3] = (s[0] - 0.5) * 26 + Math.sin(t * 0.3 + i) * 0.2; pos[i*3+1] = (s[1] - 0.5) * 10 + ((t * 0.12 * (0.5 + s[2])) % 1.0); pos[i*3+2] = -2 - s[2] * 16; }
      geoP.attributes.position.needsUpdate = true; polvo.material.opacity = 0.55 * E.out(tramo(t, 0.2, 1.2)) * (1 - fin);
      // momentos de foco: Reglas (la comisión y los intereses) y Avisos (el correo)
      var focoR = E.inOut(tramo(t, C[3] + 0.3, 0.7)) * (1 - E.inOut(tramo(t, C[4], 0.6)));
      var focoA = E.inOut(tramo(t, C[4] + 0.2, 0.6)) * (1 - E.inOut(tramo(t, C[5], 0.4)));
      var focoF = E.inOut(tramo(t, C[1] + 1.0, 0.5)) * (1 - E.inOut(tramo(t, C[1] + 3.7, 0.5)));   // el panel de fuentes al frente
      var atenua = Math.max(focoR, focoA, focoF * 0.85);
      // archivos y chips de columnas
      var hC = D.filaC(0), hM = D.filaM(0), finArch = E.inOut(tramo(t, C[5] - 0.3, 0.5));
      [[archC, hC, 0.3], [archM, hM, 0.55]].forEach(function(o){ var e = E.outQuint(tramo(t, o[2], 1.1));
        o[0].position.set(lerp(o[1].x * 2 + (D.vert ? (o[0] === archC ? -3 : 3) : 0), o[1].x, e), lerp(o[1].y + 2.2, o[1].y + (D.vert ? 0.82 : 0.95), e), lerp(-14, 0, e));
        o[0].rotation.y = (1 - e) * (o[1].x <= 0 ? 0.6 : -0.6); o[0].material.opacity = e * (1 - finArch) * (1 - atenua * 0.7); });
      [[chipsC, hC, C[1] + 2.2], [chipsM, hM, C[1] + 2.55]].forEach(function(o){ var e = E.outQuint(tramo(t, o[2], 0.6));
        o[0].position.set(o[1].x, o[1].y + (D.vert ? 0.46 : 0.5) + (1 - e) * 0.15, 0.05); o[0].material.opacity = e * (1 - E.inOut(tramo(t, C[2] + 0.6, 0.5))) * (1 - focoF * 0.0); });
      // registros
      regs.forEach(function(r){
        var u = r.userData, h = u.lado === 'c' ? D.filaC(u.k) : D.filaM(u.k), t0 = 0.95 + u.k * 0.12 + (u.lado === 'm' ? 0.2 : 0), e = E.rebote(tramo(t, t0, 0.75));
        var x = h.x, y = lerp(h.y + 1.8, h.y, e), z = lerp(-0.8, 0, e);
        var c = u.lado === 'c' ? CARTOLA[u.k] : null, pareja = u.lado === 'm' || !!c[3], esCom = u.lado === 'c' && u.k === COMISION, esInt = u.lado === 'c' && u.k === INTERES;
        var tPaso = C[2] + 0.3 + ((D.vert ? (3.55 - h.y) : (1.55 - h.y)) / (D.vert ? 8.2 : 3.4)) * 1.1;   // cuándo pasa el escaneo
        var marca = E.out(tramo(t, tPaso, 0.35));
        var g = E.inOutQuint(tramo(t, C[2] + 2.6, 0.8));   // agrupar
        if (!D.vert) { if (pareja) x += (u.lado === 'c' ? 0.35 : -0.35) * g; else z += 0.25 * g; } else if (!pareja) z += 0.25 * g;
        // resolución: vuela a su fila en la pantalla de Resultados
        var filaUI = u.lado === 'c' ? [0, 1, 4, 2, 5, 3][u.k] : [0, 0, 1, 2, 3][u.k];
        var vuelo = E.inOutQuint(tramo(t, C[5] + 0.15 + u.k * 0.05 + (u.lado === 'm' ? 0.08 : 0), 0.85));
        var yUI = UIP.y + (0.5 - (214 + filaUI * 92 + 43) / 800) * UIH * UIP.s;
        x = lerp(x, UIP.x + (u.lado === 'c' ? -1.9 : 2.1) * UIP.s, vuelo); y = lerp(y, yUI, vuelo); z = lerp(z, UIP.z + 0.1, vuelo);
        r.position.set(x, y, z); r.scale.set(lerp(1, 1.25 * UIP.s, vuelo), lerp(1, 0.75 * UIP.s, vuelo), 1);
        r.rotation.y = (1 - e) * (u.lado === 'c' ? 0.5 : -0.5);
        var vis = tramo(t, t0 - 0.05, 0.25) * (1 - E.inOut(tramo(t, C[5] + 0.75 + u.k * 0.05, 0.4)));
        var enFocoR = esCom || esInt, enFocoA = esInt;
        var aten = Math.max(focoR * (enFocoR ? 0 : 1), focoA * (enFocoA ? 0 : 1), focoF * 0.85);
        u.cara.material.opacity = vis * (1 - aten * 0.8);
        var expl = esCom ? E.out(tramo(t, C[3] + 2.3, 0.4)) : 0;
        var colorBorde = esCom ? (expl > 0.5 ? 0x6b5bd2 : 0xe08a2c) : (pareja ? 0x2f8a5b : 0xe08a2c);
        u.borde.material.color.setHex(colorBorde);
        u.borde.material.opacity = vis * Math.max(marca, expl) * (pareja ? 0.8 : 0.95) * (1 - aten * 0.8);
        u.halo.material.opacity = vis * ((pareja ? 0.28 : 0.55) * Math.sin(cl((t - tPaso) / 0.9) * Math.PI) + (enFocoR ? 0.45 * focoR : 0) + (enFocoA ? 0.5 * focoA : 0));
        u.halo.material.map = (esCom && expl < 0.5) || esInt ? texHaloRojo : texHalo;
      });
      // el problema: «no cuadra»
      var nc = ventana(t, 2.6, 0.45, C[1] + 0.6, 0.5);
      eNoCuadra.position.set(0, D.vert ? 5.0 : 2.95, 1.0); eNoCuadra.material.opacity = nc; eNoCuadra.scale.setScalar(1 + Math.sin(cl((t - 2.6) / 0.45) * Math.PI) * 0.06);
      // fuentes: el panel de Concilia al frente, luego vuelve a su lugar
      var pf = ventana(t, C[1] + 0.9, 0.6, C[1] + 3.6, 0.6);
      pFuentes.position.set(0, D.vert ? 1.4 : 0.55, lerp(0.4, 2.2, E.outQuint(tramo(t, C[1] + 0.9, 0.7)))); pFuentes.material.opacity = pf;
      pFuentes.scale.setScalar(D.vert ? 0.82 : 1);
      // escaneo
      var pe = tramo(t, C[2] + 0.3, 1.1), ae = Math.sin(pe * Math.PI), y0 = D.vert ? 3.55 + 0.4 : 1.55 + 0.6, y1 = D.vert ? -4.2 : 1.55 - 3.7;
      escaner.position.set(0, lerp(y0, y1, E.inOut(pe)), 0.05); escaner.scale.x = D.vert ? 0.5 : 1; lamina.material.opacity = 0.95 * ae; estela.material.opacity = 0.7 * ae;
      // líneas de relación
      var apaga = 1 - E.inOut(tramo(t, C[5], 0.4)), dl = 1 - Math.max(focoR, focoA) * 0.8;
      lazos.forEach(function(l){ var p = E.inOut(tramo(t, l.t0, 0.55)), n = Math.floor(l.total * p / 3) * 3;
        l.mesh.geometry.setDrawRange(0, n); l.brillo.geometry.setDrawRange(0, n); l.mesh.material = t > l.t0 + 0.6 ? matLazoOk : matLazo; l.mesh.visible = l.brillo.visible = n > 0 && apaga > 0.02; });
      matLazo.opacity = 0.9 * apaga * dl; matLazoOk.opacity = 0.95 * apaga * dl; matBrillo.opacity = 0.14 * apaga * dl;
      // etiquetas
      var g12 = ventana(t, C[2] + 2.5, 0.4, C[5] - 0.2, 0.3) * (1 - Math.max(focoR, focoA) * 0.8);
      e12.position.set(D.vert ? 1.1 : 0, D.vert ? 3.55 - 0.5 * D.paso + 0.05 : 1.55 + 0.62, 0.6); e12.material.opacity = g12; e12.scale.setScalar(D.vert ? 0.8 : 1);
      var pc = D.filaC(COMISION), pi = D.filaC(INTERES), sinC = ventana(t, C[2] + 3.0, 0.4, C[3] + 2.2, 0.3), sinI = ventana(t, C[2] + 3.1, 0.4, C[3] + 2.6, 0.3);
      eSinC.position.set(pc.x - (D.vert ? 0.6 : 0.4), pc.y + 0.38, 0.7); eSinC.material.opacity = sinC;
      eSinI.position.set(pi.x - (D.vert ? 0.6 : 0.4), pi.y + 0.38, 0.7); eSinI.material.opacity = sinI * (1 - focoA * 0.0);
      // reglas: el panel de la regla y la comisión explicada
      var pr = ventana(t, C[3] + 0.9, 0.6, C[4] - 0.2, 0.4);
      if (D.vert) pRegla.position.set(0, pi.y - 1.7, 1.4 + (1 - E.outQuint(tramo(t, C[3] + 0.9, 0.7))) * 0.6);
      else pRegla.position.set(pc.x + 4.3 + (1 - E.outQuint(tramo(t, C[3] + 0.9, 0.7))) * 0.5, pc.y - 0.55, 0.9);
      pRegla.material.opacity = pr; pRegla.scale.setScalar(D.vert ? 0.74 : 1);
      var ex = ventana(t, C[3] + 2.35, 0.4, C[5], 0.3) * (1 - focoA * 0.75);
      eExpl.position.set(pc.x - (D.vert ? 0.2 : 0.1), pc.y + 0.38, 0.75); eExpl.material.opacity = ex;
      var pp = ventana(t, C[3] + 2.9, 0.4, C[5], 0.3);
      ePend.position.set(pi.x - (D.vert ? 0.9 : 0.8), pi.y + 0.38, 0.75); ePend.material.opacity = pp;
      // avisos: línea de los intereses al correo, el correo y el envío automático
      var lp = E.inOut(tramo(t, C[4] + 0.3, 0.7)), nl = Math.floor(lazoCorreo.total * lp / 3) * 3; lazoCorreo.mesh.geometry.setDrawRange(0, nl);
      lazoCorreo.mesh.visible = nl > 0; lazoCorreo.mesh.material.opacity = 0.9 * (1 - E.inOut(tramo(t, C[5], 0.4)));
      var pcr = ventana(t, C[4] + 0.8, 0.6, C[5] - 0.1, 0.4);
      pCorreo.position.set(D.vert ? 0 : 0.2, D.vert ? 0.6 : -0.3, lerp(0.8, 1.6, E.outQuint(tramo(t, C[4] + 0.8, 0.7)))); pCorreo.material.opacity = pcr; pCorreo.scale.setScalar(D.vert ? 0.82 : 1);
      var au = ventana(t, C[4] + 2.6, 0.5, C[5] - 0.1, 0.4); eAuto.position.set(D.vert ? 0 : 0.2, D.vert ? -0.65 : -1.75, 1.7); eAuto.material.opacity = au; eAuto.scale.setScalar(D.vert ? 0.8 : 1);
      // resultado: la pantalla real y el cierre
      var ue = E.inOutQuint(tramo(t, C[5] + 0.35, 0.8)), us = E.inOut(tramo(t, C[5] + 3.2, 0.8));
      ui.material.opacity = ue * (1 - us); ui.position.set(UIP.x, lerp(UIP.y, UIP.y + 0.7, us), lerp(UIP.z, UIP.z - 1.8, us)); ui.scale.setScalar(UIP.s); ui.rotation.x = lerp(0.12, 0, ue) - us * 0.05;
      var b1 = tramo(t, C[5] + 0.9, 0.8), b2 = tramo(t, C[5] + 4.0, 0.9);
      barre.visible = (b1 > 0 && b1 < 1) || (b2 > 0 && b2 < 1);
      if (b1 > 0 && b1 < 1) { barre.position.set(lerp(-6, 6, E.inOut(b1)), 0, UIP.z + 0.2); barre.material.opacity = Math.sin(b1 * Math.PI) * 0.8; }
      else if (b2 > 0 && b2 < 1) { barre.position.set(lerp(-7, 7, E.inOut(b2)), 0.2, 0.5); barre.material.opacity = Math.sin(b2 * Math.PI) * 0.6; }
      var ci = tramo(t, C[5] + 3.3, 1.0);
      haloCierre.material.opacity = 0.32 * E.out(tramo(t, C[5] + 3.4, 1.2)); cierre.material.opacity = E.out(ci);
      cierre.position.set(0, 0.2 - (1 - E.outQuint(ci)) * 0.3, 0.4); cierre.scale.setScalar(lerp(0.96, 1, E.outQuint(ci)) * (D.vert ? 0.62 : 1));
      renderer.render(escena, cam);
    }
    var UIP = { x: 0, y: -0.1, z: -0.6, s: 1 };
    function medir(){
      var w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
      cam.aspect = w / h; var vert = w / h < 0.9; cam.fov = vert ? 40 : 36; cam.updateProjectionMatrix();
      disponer(vert); CAM = claves();
      UIP = vert ? { x: 0, y: 0.6, z: -0.6, s: 0.55 } : { x: 0, y: -0.1, z: -0.6, s: 1 };
    }
    medir();
    return {
      duracion: DUR, capitulos: C,
      render: render, medir: medir,
      destroy: function(){ limpiar.forEach(function(x){ if (x.image && x.image.getContext) { x.image.width = x.image.height = 0; } x.dispose(); }); renderer.dispose(); }
    };
  }
  window.AlCine = window.AlCine || {};
  window.AlCine.conciliaDemo = crear;
})();
