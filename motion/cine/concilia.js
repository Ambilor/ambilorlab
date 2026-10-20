/* ═══ Ambilor.Lab · Cine: Concilia (prototipo, 2026-10-20) ═══
   Secuencia audiovisual de ~13 s, en tiempo real con three.js (vendor/three-r128.min.js):

     1  0,0 – 2,4  Establecimiento   espacio de datos: capas de cristal en profundidad, piso de luz, cámara que entra en arco
     2  2,4 – 4,8  Entrada           la cartola y el libro mayor llegan desde el fondo y sus registros caen en dos columnas
     3  4,8 – 7,6  Transformación    un plano de escaneo recorre los registros; las parejas se unen con líneas de relación,
                                     el abono se agrupa con sus dos facturas y lo que no tiene contraparte queda marcado
     4  7,6 – 9,6  Enfoque           la cámara se acerca a la comisión sin contraparte y la explica (queda por revisar)
     5  9,6 – 11,4 Resolución        la composición converge en la pantalla real de Resultados de Concilia
     6 11,4 – 13,0 Cierre            Concilia., el resultado de este ejemplo y la identidad azul y blanca

   Todo se deriva del tiempo t (render(t) es una función pura del tiempo): así se puede pausar, adelantar,
   repetir y renderizar cuadro a cuadro a video sin estado oculto. Datos de ejemplo, rotulados como tales.

   Uso:  const c = AlCine.concilia(contenedor, { alCambiarPlano(i, plano) {} });
         c.play(); c.pause(); c.seek(seg); c.render(seg); c.destroy();   c.duracion, c.planos */
(function(){
  'use strict';
  var DUR = 13.0;
  var PLANOS = [
    { a: 0.0,  t: 'Tus movimientos, en un solo espacio' },
    { a: 2.4,  t: 'Llegan la cartola del banco y el libro mayor' },
    { a: 4.8,  t: 'Concilia busca la pareja de cada movimiento' },
    { a: 7.6,  t: 'Lo que no tiene contraparte queda por revisar' },
    { a: 9.6,  t: 'Todo, ordenado en tu panel' },
    { a: 11.4, t: 'Concilia. Revisas solo lo pendiente' }
  ];
  // ── Datos de ejemplo (los mismos del demo «Ver en acción») ──
  // cartola: [fecha, concepto, monto, pareja en el mayor (índices), estado]
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
  var FOCO = 2;   // la comisión sin contraparte
  // fila de la pantalla de Resultados a la que llega cada registro (grupos 1 a 4, luego los dos por revisar)
  var FILA_C = [0, 1, 4, 2, 5, 3], FILA_M = [0, 0, 1, 2, 3];

  // ── utilidades ──
  var cl = function(x, a, b){ return Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, x)); };
  var lerp = function(a, b, t){ return a + (b - a) * t; };
  var tramo = function(t, a, d){ return cl((t - a) / d); };
  // curvas (como las de After Effects): entrada suave, salida firme, anticipación y rebote leve
  var E = {
    out: function(x){ x = cl(x); return 1 - Math.pow(1 - x, 3); },
    outQuint: function(x){ x = cl(x); return 1 - Math.pow(1 - x, 5); },
    inOut: function(x){ x = cl(x); return x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; },
    inOutQuint: function(x){ x = cl(x); return x < .5 ? 16*x*x*x*x*x : 1 - Math.pow(-2*x + 2, 5) / 2; },
    anticipa: function(x){ x = cl(x); var c = 1.6; return x*x*((c + 1)*x - c); },             // retrocede antes de avanzar
    rebote: function(x){ x = cl(x); var c = 1.2; return 1 + (c + 1)*Math.pow(x - 1, 3) + c*Math.pow(x - 1, 2); }   // se pasa un poco y vuelve
  };
  var peso = function(n){ return (n < 0 ? '−$' : '$') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var AZUL = '#1F5C99', LUZ = '#3D7FD6', TINTA = '#12304d', SUAVE = '#6b819a', OK = '#2F8A5B', AVISO = '#E08A2C', FONDO = 0xf3f7fc;
  var FUENTE = '"Inter", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  function crear(cont, opciones){
    opciones = opciones || {};
    var THREE = window.THREE; if (!THREE) throw new Error('three.js no está cargado');
    var lento = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canvas = document.createElement('canvas'); canvas.className = 'al-cine__lienzo'; canvas.setAttribute('aria-hidden', 'true');
    cont.appendChild(canvas);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, preserveDrawingBuffer: !!opciones.captura });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(FONDO, 1);
    var escena = new THREE.Scene();
    escena.fog = new THREE.Fog(FONDO, 24, 62);
    escena.fog.color.convertSRGBToLinear();
    var cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 80);
    var limpiar = [];   // geometrías, materiales y texturas, para soltar en destroy()
    var guarda = function(o){ limpiar.push(o); return o; };
    var DPR = Math.min(window.devicePixelRatio || 1, 2), TXS = opciones.captura ? 2.5 : (Math.min(innerWidth, innerHeight) < 700 ? 1.6 : 2);

    // ── texturas dibujadas (texto y piezas de interfaz) ──
    function lienzo(w, h, dibujar){
      var c = document.createElement('canvas'); c.width = Math.round(w * TXS); c.height = Math.round(h * TXS);
      var g = c.getContext('2d'); g.scale(TXS, TXS); dibujar(g, w, h);
      var tx = guarda(new THREE.CanvasTexture(c)); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tx;
    }
    function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function txt(g, s, x, y, tam, peso_, color, alin){ g.font = peso_ + ' ' + tam + 'px ' + FUENTE; g.fillStyle = color; g.textAlign = alin || 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y); }
    var mat = function(o){ return guarda(new THREE.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false, toneMapped: false }, o))); };
    var plano = function(w, h){ return guarda(new THREE.PlaneGeometry(w, h)); };
    // halo radial (luz azul), para sumar con mezcla aditiva
    var texHalo = lienzo(128, 128, function(g){ var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(61,127,214,.9)'); gr.addColorStop(.35, 'rgba(61,127,214,.35)'); gr.addColorStop(1, 'rgba(61,127,214,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });

    // registro contable: tarjeta con fecha, concepto y monto (y su estado, que se pinta encima con un borde)
    var RW = 3.3, RH = 0.5;
    function texRegistro(f, origen){
      return lienzo(660, 100, function(g, w, h){
        g.shadowColor = 'rgba(18,48,77,.10)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
        g.fillStyle = '#ffffff'; rr(g, 4, 4, w - 8, h - 10, 16); g.fill(); g.shadowColor = 'transparent';
        g.strokeStyle = '#d6e1ee'; g.lineWidth = 2; rr(g, 4, 4, w - 8, h - 10, 16); g.stroke();
        g.fillStyle = origen === 'c' ? AZUL : LUZ; rr(g, 4, 4, 8, h - 10, 4); g.fill();
        txt(g, f[0], 30, h / 2 - 3, 22, 600, SUAVE);
        txt(g, f[1], 112, h / 2 - 3, 27, 600, TINTA);
        txt(g, peso(f[2]), w - 28, h / 2 - 3, 28, 700, f[2] < 0 ? SUAVE : TINTA, 'right');
      });
    }
    function texArchivo(nombre, sub){
      return lienzo(520, 150, function(g, w, h){
        g.shadowColor = 'rgba(18,48,77,.16)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
        g.fillStyle = '#ffffff'; rr(g, 12, 12, w - 24, h - 30, 22); g.fill(); g.shadowColor = 'transparent';
        g.fillStyle = '#1e8e3e'; rr(g, 34, 36, 50, 62, 8); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4;
        [52, 66, 80].forEach(function(y){ g.beginPath(); g.moveTo(42, y); g.lineTo(76, y); g.stroke(); }); g.beginPath(); g.moveTo(59, 44); g.lineTo(59, 90); g.stroke();
        txt(g, nombre, 104, 56, 30, 700, TINTA); txt(g, sub, 104, 92, 21, 500, SUAVE);
      });
    }
    function texEtiqueta(s, fondo, tinta, ancho){
      var w = ancho || 420;
      return lienzo(w, 64, function(g){ g.fillStyle = fondo; rr(g, 2, 2, w - 4, 60, 30); g.fill(); txt(g, s, w / 2, 33, 25, 700, tinta, 'center'); });
    }
    function texCapa(semilla){
      return lienzo(512, 320, function(g, w, h){
        g.fillStyle = 'rgba(255,255,255,.55)'; rr(g, 2, 2, w - 4, h - 4, 18); g.fill();
        g.strokeStyle = 'rgba(61,127,214,.35)'; g.lineWidth = 2; rr(g, 2, 2, w - 4, h - 4, 18); g.stroke();
        for (var k = 0; k < 9; k++) { var y = 30 + k * 31, r = Math.abs(Math.sin(semilla * 7 + k * 1.3));
          g.fillStyle = 'rgba(31,92,153,' + (0.10 + 0.08 * r) + ')'; rr(g, 24, y, 120 + 180 * r, 10, 5); g.fill();
          g.fillStyle = 'rgba(31,92,153,.12)'; rr(g, w - 120, y, 90, 10, 5); g.fill(); }
      });
    }
    // la pantalla real de Resultados de Concilia (como en el panel): grupos conciliados y lo que queda por revisar
    var UIW = 9.6, UIH = 6.0;
    var texUI = lienzo(1280, 800, function(g, w, h){
      g.fillStyle = '#ffffff'; rr(g, 0, 0, w, h, 26); g.fill();
      g.save(); rr(g, 0, 0, w, h, 26); g.clip(); g.fillStyle = AZUL; g.fillRect(0, 0, w, 70); g.restore();
      g.fillStyle = 'rgba(255,255,255,.9)'; rr(g, 28, 22, 26, 26, 6); g.fill(); txt(g, 'Concilia', 70, 36, 30, 700, '#fff');
      g.fillStyle = '#f6f8fb'; g.fillRect(0, 70, w, 64); txt(g, 'Ambilor.Lab', 32, 102, 24, 700, AZUL); txt(g, 'Datos de ejemplo', w - 32, 102, 20, 600, SUAVE, 'right');
      var tabs = ['Resumen', 'Resultados', 'Sugerencias', 'Historial', 'Configuración'], x = 32;
      tabs.forEach(function(s, k){ g.font = (k === 1 ? 700 : 500) + ' 22px ' + FUENTE; var tw = g.measureText(s).width;
        if (k === 1) { g.fillStyle = '#e4eef9'; rr(g, x - 12, 142, tw + 24, 40, 9); g.fill(); }
        txt(g, s, x, 162, 22, k === 1 ? 700 : 500, k === 1 ? AZUL : '#8aa2bb'); x += tw + 34; });
      g.fillStyle = '#c9d5e3'; g.fillRect(0, 194, w, 2);
      var filas = [
        ['Grupo 1 · 1:2', 'Abono Comercial Sur ↔ Factura 1002 + saldo', '$2.000.000', 'Conciliado', OK],
        ['Grupo 2 · 1:1', 'Transferencia ↔ Pago fact. 1001', '−$1.190.000', 'Conciliado', OK],
        ['Grupo 3 · 1:1', 'Pago proveedores ↔ Pago fact. 1003-1004', '−$780.000', 'Conciliado', OK],
        ['Grupo 4 · 1:1', 'Depósito ↔ Depósito cliente', '$45.000', 'Conciliado', OK],
        ['Por revisar', 'Comisión mantención · sin contraparte', '−$12.990', 'Pendiente', AVISO],
        ['Por revisar', 'Intereses · sin contraparte', '$1.250', 'Pendiente', AVISO]
      ];
      filas.forEach(function(f, k){ var y = 214 + k * 92;
        g.fillStyle = k % 2 ? '#fafcfe' : '#ffffff'; g.fillRect(16, y, w - 32, 86);
        txt(g, f[0], 40, y + 30, 20, 700, f[4] === OK ? OK : AVISO); txt(g, f[1], 40, y + 60, 24, 600, TINTA);
        txt(g, f[2], w - 230, y + 44, 26, 700, TINTA, 'right');
        g.font = '700 20px ' + FUENTE; var pw = g.measureText(f[3]).width + 32;
        g.fillStyle = f[4] === OK ? '#e6f2eb' : '#fdf1e2'; rr(g, w - 40 - pw, y + 26, pw, 38, 19); g.fill(); txt(g, f[3], w - 40 - pw / 2, y + 46, 20, 700, f[4], 'center');
        g.fillStyle = '#e6edf5'; g.fillRect(16, y + 86, w - 32, 2); });
    });
    var texCierre = lienzo(1280, 720, function(g, w, h){
      txt(g, 'Concilia', w / 2 - 22, 300, 128, 700, AZUL, 'center');
      g.font = '700 128px ' + FUENTE; var tw = g.measureText('Concilia').width;
      g.fillStyle = LUZ; g.beginPath(); g.arc(w / 2 - 22 + tw / 2 + 20, 336, 14, 0, Math.PI * 2); g.fill();
      txt(g, 'Cuadra el banco con tu contabilidad. Tú revisas solo lo pendiente.', w / 2, 430, 34, 500, TINTA, 'center');
      g.font = '700 26px ' + FUENTE;
      var p1 = '4 grupos conciliados', p2 = '2 movimientos por revisar', w1 = g.measureText(p1).width + 56, w2 = g.measureText(p2).width + 56, x0 = w / 2 - (w1 + w2 + 16) / 2;
      g.fillStyle = '#e6f2eb'; rr(g, x0, 494, w1, 56, 28); g.fill(); txt(g, p1, x0 + w1 / 2, 523, 26, 700, OK, 'center');
      g.fillStyle = '#fdf1e2'; rr(g, x0 + w1 + 16, 494, w2, 56, 28); g.fill(); txt(g, p2, x0 + w1 + 16 + w2 / 2, 523, 26, 700, '#b4691c', 'center');
      txt(g, 'Datos de ejemplo · Ambilor.Lab', w / 2, 610, 22, 600, SUAVE, 'center');
    });

    // ── composición ──
    var raiz = new THREE.Group(); escena.add(raiz);
    // piso de luz: rejilla que se pierde en la niebla
    var piso = new THREE.GridHelper(80, 64, 0x6f9fd6, 0xb7cfe9); piso.position.y = -3.1; piso.material.transparent = true; piso.material.opacity = 0; guarda(piso.geometry); guarda(piso.material); raiz.add(piso);
    var luzPiso = new THREE.Mesh(plano(26, 26), mat({ map: texHalo, blending: THREE.AdditiveBlending, opacity: 0 })); luzPiso.rotation.x = -Math.PI / 2; luzPiso.position.set(0, -3.08, -2); raiz.add(luzPiso);
    // haces de luz azul que bajan sobre la escena (volumen falso, mezcla aditiva)
    var texHaz = lienzo(64, 256, function(g){ var gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(61,127,214,.0)'); gr.addColorStop(.25, 'rgba(61,127,214,.42)'); gr.addColorStop(1, 'rgba(61,127,214,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      var gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(255,255,255,1)'); gx.addColorStop(.5, 'rgba(255,255,255,0)'); gx.addColorStop(1, 'rgba(255,255,255,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 64, 256); });
    var haces = [[-6, -8, 0.22, 3.2], [-1.5, -12, -0.12, 4.5], [4.5, -9, -0.25, 3.6], [9, -15, -0.1, 5]].map(function(h, k){
      var m = new THREE.Mesh(plano(h[3], 16), mat({ map: texHaz, blending: THREE.AdditiveBlending, opacity: 0 })); m.position.set(h[0], 3, h[1]); m.rotation.z = h[2]; m.userData = { k: k }; raiz.add(m); return m; });
    // capas de cristal al fondo (datos fuera de foco)
    var capas = [];
    [[-7.5, 2.2, -8, 0.2], [6.8, 3.1, -10, 1.1], [-4.0, -1.0, -13, 2.3], [3.6, 0.2, -6.5, 3.4], [9.5, -0.6, -15, 4.2], [-10, 0.8, -17, 5.1], [0.5, 3.8, -19, 6.3], [-2.2, 2.6, -5.5, 7.4], [12, 2.2, -12, 8.1]].forEach(function(c, k){
      var m = new THREE.Mesh(plano(4.4, 2.75), mat({ map: texCapa(c[3]), opacity: 0 })); m.position.set(c[0], c[1], c[2]); m.rotation.y = c[0] > 0 ? -0.35 : 0.35; m.userData = { base: c.slice(), k: k }; raiz.add(m); capas.push(m);
    });
    // polvo de datos: puntos que flotan
    var NP = 220, pos = new Float32Array(NP * 3), sem = [];
    for (var i = 0; i < NP; i++) { var s = [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12345.678 % 1, Math.sin(i * 39.425) * 9876.54 % 1]; sem.push(s.map(Math.abs)); }
    var geoP = guarda(new THREE.BufferGeometry()); geoP.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var polvo = new THREE.Points(geoP, guarda(new THREE.PointsMaterial({ color: 0x3d7fd6, size: 0.06, transparent: true, opacity: 0, depthWrite: false })));
    raiz.add(polvo);
    // archivos: cartola y libro mayor
    var XC = -2.55, XM = 2.55, Y0 = 1.55, PASO = 0.62;
    var archC = new THREE.Mesh(plano(3.0, 0.86), mat({ map: texArchivo('Cartola banco', 'Google Sheets · marzo') })); raiz.add(archC);
    var archM = new THREE.Mesh(plano(3.0, 0.86), mat({ map: texArchivo('Libro mayor', 'Google Sheets · marzo') })); raiz.add(archM);
    // registros
    var regs = [];
    function registro(f, lado, k){
      var g = new THREE.Group();
      var cara = new THREE.Mesh(plano(RW, RH), mat({ map: texRegistro(f, lado) })); g.add(cara);
      var borde = new THREE.Mesh(plano(RW + 0.08, RH + 0.08), mat({ color: 0x2f8a5b, opacity: 0 })); borde.position.z = -0.005; g.add(borde);
      var halo = new THREE.Mesh(plano(RW * 1.5, RH * 3.2), mat({ map: texHalo, blending: THREE.AdditiveBlending, opacity: 0 })); halo.position.z = -0.02; g.add(halo);
      g.userData = { f: f, lado: lado, k: k, cara: cara, borde: borde, halo: halo };
      raiz.add(g); regs.push(g); return g;
    }
    CARTOLA.forEach(function(f, k){ registro(f, 'c', k); });
    MAYOR.forEach(function(f, k){ registro(f, 'm', k); });
    // dónde termina cada registro en sus columnas (y al agruparse, un poco más al centro)
    function casa(r){ var u = r.userData; return { x: u.lado === 'c' ? XC : XM, y: Y0 - u.k * PASO, z: 0 }; }
    // líneas de relación (tubos que se dibujan de un registro a su pareja)
    var lazos = [];
    CARTOLA.forEach(function(f, k){ if (!f[3]) return; f[3].forEach(function(j, n){
      lazos.push({ c: k, m: j, t0: 5.75 + k * 0.16 + n * 0.1, mesh: null });
    }); });
    var matLazo = mat({ color: 0x3d7fd6, opacity: 0.9 }), matLazoOk = mat({ color: 0x2f8a5b, opacity: 0.95 });
    lazos.forEach(function(l){
      var a = new THREE.Vector3(XC + RW / 2, Y0 - l.c * PASO, 0.02), b = new THREE.Vector3(XM - RW / 2, Y0 - l.m * PASO, 0.02);
      var curva = new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x + 1.0, a.y, 0.9), new THREE.Vector3(b.x - 1.0, b.y, 0.9), b);
      var geo = guarda(new THREE.TubeGeometry(curva, 48, 0.022, 8, false));
      l.total = geo.index.count; geo.setDrawRange(0, 0);
      l.mesh = new THREE.Mesh(geo, matLazo); raiz.add(l.mesh);
      var g2 = guarda(new THREE.TubeGeometry(curva, 48, 0.09, 8, false)); g2.setDrawRange(0, 0);
      l.brillo = new THREE.Mesh(g2, mat({ color: 0x3d7fd6, opacity: 0.12, blending: THREE.AdditiveBlending })); raiz.add(l.brillo);
    });
    // plano de escaneo: una lámina de luz que baja por las dos columnas
    var escaner = new THREE.Group(); raiz.add(escaner);
    var lamina = new THREE.Mesh(plano(9.6, 0.05), mat({ color: 0x3d7fd6, opacity: 0 })); escaner.add(lamina);
    var estela = new THREE.Mesh(plano(9.6, 0.9), mat({ map: lienzo(64, 128, function(g){ var gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(61,127,214,0)'); gr.addColorStop(1, 'rgba(61,127,214,.45)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128); }), opacity: 0, blending: THREE.AdditiveBlending })); estela.position.y = 0.47; escaner.add(estela);
    // etiquetas en el espacio
    var etiq = function(s, fondo, tinta, w, ancho3){ var m = new THREE.Mesh(plano(ancho3, ancho3 * 64 / w), mat({ map: texEtiqueta(s, fondo, tinta, w), opacity: 0 })); raiz.add(m); return m; };
    var e12 = etiq('1:2 · suman $2.000.000', '#e6f2eb', OK, 440, 2.4);
    var eSin = etiq('Sin contraparte · por revisar', '#fdf1e2', '#b4691c', 480, 2.6);
    var eInt = etiq('Sin contraparte', '#fdf1e2', '#b4691c', 300, 1.6);
    // explicación del foco (texto real de la diferencia)
    var nota = new THREE.Mesh(plano(3.4, 1.25), mat({ opacity: 0, map: lienzo(680, 250, function(g, w, h){
      g.shadowColor = 'rgba(18,48,77,.18)'; g.shadowBlur = 26; g.shadowOffsetY = 8; g.fillStyle = '#fff'; rr(g, 14, 14, w - 28, h - 34, 20); g.fill(); g.shadowColor = 'transparent';
      g.fillStyle = AVISO; rr(g, 14, 14, 10, h - 34, 5); g.fill();
      txt(g, 'Comisión mantención · −$12.990', 46, 62, 28, 700, TINTA);
      txt(g, 'No tiene contraparte en el libro mayor.', 46, 110, 24, 500, TINTA);
      txt(g, 'Concilia no la da por conciliada:', 46, 150, 24, 500, TINTA);
      txt(g, 'queda por revisar (o se explica con una regla).', 46, 186, 24, 500, TINTA);
    }) }));
    raiz.add(nota);
    // la pantalla real
    var ui = new THREE.Mesh(plano(UIW, UIH), mat({ map: texUI, opacity: 0 })); ui.position.set(0, -0.1, -0.6); raiz.add(ui);
    var uiSombra = new THREE.Mesh(plano(UIW * 1.25, UIH * 1.4), mat({ map: texHalo, opacity: 0, color: 0x9fb8d6 })); uiSombra.position.set(0, -0.4, -0.7); raiz.add(uiSombra);
    var haloCierre = new THREE.Mesh(plano(16, 9), mat({ map: texHalo, blending: THREE.AdditiveBlending, opacity: 0 })); haloCierre.position.set(0, 0.6, -1.5); raiz.add(haloCierre);
    var cierre = new THREE.Mesh(plano(11.2, 6.3), mat({ map: texCierre, opacity: 0 })); cierre.position.set(0, 0.2, 0.4); raiz.add(cierre);
    // luz que barre la composición (máscara aditiva)
    var barre = new THREE.Mesh(plano(2.2, 12), mat({ map: lienzo(128, 32, function(g){ var gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(120,170,235,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 32); }), opacity: 0, blending: THREE.AdditiveBlending }));
    barre.rotation.z = -0.35; raiz.add(barre);

    // ── cámara: fotogramas clave [t, posición, mira, curva hacia el siguiente] ──
    var foco = new THREE.Vector3(XC, Y0 - FOCO * PASO, 0);
    var CAM = [
      [0.0,  [-5.5, 3.2, 19.5], [0, 0.4, -4], E.inOut],
      [2.4,  [-2.2, 1.4, 12.5], [0, 0.3, -1], E.inOutQuint],
      [4.8,  [ 0.0, 0.5, 9.2], [0, 0.0,  0], E.inOut],
      [7.4,  [ 1.0, 0.3,  8.4], [0, -0.1, 0], E.inOutQuint],
      [8.6,  [ foco.x + 1.5, foco.y + 0.1, 5.9], [foco.x + 1.25, foco.y - 0.4, 0], E.inOut],
      [9.6,  [ foco.x + 1.4, foco.y + 0.05, 5.6], [foco.x + 1.2, foco.y - 0.4, 0], E.inOutQuint],
      [11.0, [ 0.0, 0.0, 11.6], [0, -0.1, 0], E.inOut],
      [13.0, [ 0.0, 0.1, 10.8], [0, 0.1, 0], E.inOut]
    ];
    var vA = new THREE.Vector3(), vB = new THREE.Vector3();
    function camara(t){
      var k = 0; while (k < CAM.length - 2 && t >= CAM[k + 1][0]) k++;
      var a = CAM[k], b = CAM[k + 1], p = a[3](tramo(t, a[0], b[0] - a[0]));
      cam.position.set(lerp(a[1][0], b[1][0], p), lerp(a[1][1], b[1][1], p), lerp(a[1][2], b[1][2], p));
      // respiración de cámara en mano, muy leve
      cam.position.x += Math.sin(t * 0.9) * 0.05; cam.position.y += Math.sin(t * 1.3 + 1) * 0.03;
      vA.set(lerp(a[2][0], b[2][0], p), lerp(a[2][1], b[2][1], p), lerp(a[2][2], b[2][2], p));
      // recuadro más angosto que 16:9 (celular vertical): la cámara se aleja en proporción para que quepa el ancho
      var K = Math.max(1, (16 / 9) / cam.aspect);
      if (K > 1) { vB.copy(cam.position).sub(vA).multiplyScalar(Math.min(K, 2.4)); cam.position.copy(vA).add(vB); }
      cam.lookAt(vA);
    }

    // ── render(t): todo sale de t ──
    var NOCHE = new THREE.Color(0x0b1d33).convertSRGBToLinear(), DIA = new THREE.Color(FONDO).convertSRGBToLinear(), cielo = new THREE.Color();
    function render(t){
      t = cl(t, 0, DUR);
      camara(t);
      // luz de la escena: parte en azul marino (las capas y la luz azul brillan) y se ilumina al llegar los registros
      var dia = E.inOut(tramo(t, 2.5, 2.1));
      cielo.copy(NOCHE).lerp(DIA, dia); renderer.setClearColor(cielo, 1); escena.fog.color.copy(cielo);
      piso.material.color && (piso.material.vertexColors = true);
      var fin = tramo(t, 9.6, 1.4), cierreP = tramo(t, 11.4, 1.0);
      // establecimiento: piso, capas y polvo
      piso.material.opacity = 0.75 * E.out(tramo(t, 0.1, 1.4)) * (1 - fin * 0.9);
      haces.forEach(function(m){ var k = m.userData.k; m.material.opacity = (0.55 + 0.15 * Math.sin(t * 0.8 + k * 1.7)) * E.out(tramo(t, 0.2 + k * 0.25, 1.4)) * (1 - E.inOut(tramo(t, 4.6, 1.2)) * 0.7) * (1 - fin); });
      luzPiso.material.opacity = lerp(0.9, 0.4, dia) * E.out(tramo(t, 0.3, 1.6)) * (1 - fin);
      capas.forEach(function(m){ var b = m.userData.base, k = m.userData.k, e = E.out(tramo(t, 0.15 + k * 0.18, 1.1));
        m.material.opacity = 0.9 * e * (1 - fin * 0.85); m.position.set(b[0] + Math.sin(t * 0.25 + k) * 0.25, b[1] + Math.sin(t * 0.35 + k * 2) * 0.18 - (1 - e) * 1.2, b[2]); });
      for (var i = 0; i < NP; i++) { var s = sem[i]; pos[i*3] = (s[0] - 0.5) * 26 + Math.sin(t * 0.3 + i) * 0.2; pos[i*3+1] = (s[1] - 0.5) * 10 + ((t * 0.12 * (0.5 + s[2])) % 1.0); pos[i*3+2] = -2 - s[2] * 16; }
      geoP.attributes.position.needsUpdate = true; polvo.material.opacity = 0.55 * E.out(tramo(t, 0.2, 1.2)) * (1 - fin);
      // archivos: llegan desde el fondo con anticipación y se asientan sobre sus columnas
      var finArch = E.inOut(tramo(t, 9.3, 0.5));
      [[archC, XC, 1.5], [archM, XM, 1.75]].forEach(function(o){ var e = E.outQuint(tramo(t, o[2], 1.1));
        o[0].position.set(lerp(o[1] * 2.2, o[1], e), lerp(3.6, Y0 + 0.95, e), lerp(-14, 0, e)); o[0].rotation.y = (1 - e) * (o[1] < 0 ? 0.6 : -0.6);
        o[0].material.opacity = e * (1 - finArch) * (1 - E.inOut(tramo(t, 7.5, 0.6)) * 0.75 * (1 - finArch)); });
      // registros: caen desde su archivo, se agrupan, se marcan y al final vuelan a la pantalla
      var dim = E.inOut(tramo(t, 7.5, 0.6)) * (1 - E.inOut(tramo(t, 9.4, 0.5)));   // atenuación del resto durante el foco
      regs.forEach(function(r){
        var u = r.userData, h = casa(r), t0 = 2.55 + u.k * 0.12 + (u.lado === 'm' ? 0.18 : 0), e = E.rebote(tramo(t, t0, 0.75));
        var x = lerp(u.lado === 'c' ? XC : XM, h.x, e), y = lerp(Y0 + 0.95, h.y, e), z = lerp(-0.6, 0, e);
        var pareja = u.lado === 'c' ? !!CARTOLA[u.k][3] : true, sin = u.lado === 'c' && !CARTOLA[u.k][3];
        var tPaso = 4.85 + (Y0 - h.y + 0.6) / 4.6 * 1.05;   // cuándo pasa el escaneo por esta fila
        var marca = E.out(tramo(t, tPaso, 0.35));
        // agrupar: las parejas se acercan al centro, lo que no tiene pareja se adelanta un poco
        var g = E.inOutQuint(tramo(t, 6.6, 0.8));
        if (pareja) x += (u.lado === 'c' ? 0.35 : -0.35) * g; else z += 0.25 * g;
        // resolución: cada registro vuela a la pantalla y se funde con ella
        var vuelo = E.inOutQuint(tramo(t, 9.7 + u.k * 0.05 + (u.lado === 'm' ? 0.08 : 0), 0.85));
        var fila = u.lado === 'c' ? FILA_C[u.k] : FILA_M[u.k], yUI = -0.1 + (0.5 - (214 + fila * 92 + 43) / 800) * UIH;
        x = lerp(x, u.lado === 'c' ? -1.9 : 2.1, vuelo); y = lerp(y, yUI, vuelo); z = lerp(z, -0.5, vuelo);
        r.position.set(x, y, z); r.scale.set(lerp(1, 1.25, vuelo), lerp(1, 0.75, vuelo), 1);
        r.rotation.y = (1 - e) * (u.lado === 'c' ? 0.5 : -0.5);
        var esFoco = u.lado === 'c' && u.k === FOCO;
        var vis = tramo(t, t0 - 0.05, 0.25) * (1 - E.inOut(tramo(t, 10.35 + u.k * 0.05, 0.4)));
        u.cara.material.opacity = vis * (esFoco ? 1 : 1 - dim * 0.78);
        u.borde.material.color.setHex(sin ? 0xe08a2c : 0x2f8a5b);
        u.borde.material.opacity = vis * marca * (sin ? 0.95 : 0.8) * (esFoco ? 1 : 1 - dim * 0.78);
        u.halo.material.opacity = vis * (sin ? 0.55 : 0.28) * Math.sin(cl((t - tPaso) / 0.9) * Math.PI) + (esFoco ? 0.5 * dim : 0);
      });
      // escaneo: la lámina baja una vez por las dos columnas
      var pe = tramo(t, 4.85, 1.05), ae = Math.sin(pe * Math.PI);
      escaner.position.set(0, lerp(Y0 + 0.6, Y0 - 4.0, E.inOut(pe)), 0.05);
      lamina.material.opacity = 0.95 * ae; estela.material.opacity = 0.7 * ae;
      // líneas de relación: cada una se traza con su brillo; se ponen verdes cuando el grupo cuadra
      lazos.forEach(function(l){
        var p = E.inOut(tramo(t, l.t0, 0.55)), n = Math.floor(l.total * p / 3) * 3;
        var fuera = 1 - E.inOut(tramo(t, 9.6, 0.4)), d = 1 - dim * 0.8;
        l.mesh.geometry.setDrawRange(0, n); l.brillo.geometry.setDrawRange(0, n);
        l.mesh.material = t > l.t0 + 0.6 ? matLazoOk : matLazo;
        l.mesh.visible = l.brillo.visible = n > 0 && fuera > 0.02;
        l.brillo.material.opacity = 0.14 * fuera * d;
      });
      matLazo.opacity = 0.9 * (1 - E.inOut(tramo(t, 9.6, 0.4))) * (1 - dim * 0.8); matLazoOk.opacity = matLazo.opacity;
      // etiquetas del grupo y de lo que no tiene contraparte
      var ce = E.out(tramo(t, 6.55, 0.4)) * (1 - E.inOut(tramo(t, 9.5, 0.3)));
      e12.position.set(0, Y0 + 0.62, 0.5); e12.material.opacity = ce * (1 - dim * 0.8);
      eInt.position.set(XC - 0.3, Y0 - 4 * PASO + 0.02, 0.7); eInt.material.opacity = E.out(tramo(t, 7.0, 0.4)) * (1 - dim * 0.8) * (1 - E.inOut(tramo(t, 9.5, 0.3)));
      eSin.position.set(XC - 0.2, Y0 - FOCO * PASO + 0.5, 0.8); eSin.material.opacity = E.out(tramo(t, 7.0, 0.4)) * (1 - E.inOut(tramo(t, 9.5, 0.3)));
      // la explicación del foco
      var ne = E.outQuint(tramo(t, 8.3, 0.6)) * (1 - E.inOut(tramo(t, 9.45, 0.35)));
      nota.position.set(foco.x + 1.55 + (1 - ne) * 0.4, foco.y - 1.0, 0.55); nota.material.opacity = ne;
      // resolución: la pantalla real de Concilia
      var ue = E.inOutQuint(tramo(t, 9.95, 0.8)), us = E.inOut(tramo(t, 11.3, 0.8));
      ui.material.opacity = ue * (1 - us); uiSombra.material.opacity = 0.35 * ue * (1 - us);
      ui.position.set(0, lerp(-0.1, 0.6, us), lerp(-0.6, -2.4, us)); ui.rotation.x = lerp(0.12, 0, ue) - us * 0.05;
      // barrido de luz al llegar a la pantalla y al cierre
      var b1 = tramo(t, 10.6, 0.8), b2 = tramo(t, 11.9, 0.9);
      barre.visible = (b1 > 0 && b1 < 1) || (b2 > 0 && b2 < 1);
      if (b1 > 0 && b1 < 1) { barre.position.set(lerp(-6, 6, E.inOut(b1)), 0, -0.4); barre.material.opacity = Math.sin(b1 * Math.PI) * 0.8; }
      else if (b2 > 0 && b2 < 1) { barre.position.set(lerp(-7, 7, E.inOut(b2)), 0.2, 0.5); barre.material.opacity = Math.sin(b2 * Math.PI) * 0.6; }
      // cierre
      haloCierre.material.opacity = 0.32 * E.out(tramo(t, 11.5, 1.2)); cierre.material.opacity = E.out(cierreP); cierre.position.y = 0.2 - (1 - E.outQuint(cierreP)) * 0.3; cierre.scale.setScalar(lerp(0.96, 1, E.outQuint(cierreP)));
      renderer.render(escena, cam);
      return planoDe(t);
    }
    function planoDe(t){ var i = 0; PLANOS.forEach(function(p, k){ if (t >= p.a) i = k; }); return i; }

    // ── tamaño ──
    function medir(){
      var w = Math.max(1, cont.clientWidth), h = Math.max(1, cont.clientHeight || Math.round(w * 9 / 16));
      renderer.setPixelRatio(opciones.captura ? 1 : DPR); renderer.setSize(w, h, false);
      cam.aspect = w / h;
      // en recuadros angostos (celular vertical), un lente más abierto para que la composición quepa
      cam.fov = w / h < 1 ? 40 : 36;
      cam.updateProjectionMatrix(); render(T);
    }
    var ro = 'ResizeObserver' in window ? new ResizeObserver(medir) : null; if (ro) ro.observe(cont);

    // ── reproducción ──
    var T = 0, jugando = false, ultimo = 0, raf = 0, plano_ = -1, visible = true;
    function avisar(i){ if (i !== plano_) { plano_ = i; if (opciones.alCambiarPlano) opciones.alCambiarPlano(i, PLANOS[i]); } }
    function cuadro(ahora){
      raf = 0; if (!jugando) return;
      var dt = Math.min(0.1, (ahora - ultimo) / 1000); ultimo = ahora;
      if (visible) { T += dt; if (T >= DUR) { T = DUR; jugando = false; if (opciones.alTerminar) opciones.alTerminar(); } avisar(render(T)); }
      if (jugando) raf = requestAnimationFrame(cuadro);
    }
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){ visible = es[es.length - 1].isIntersecting; }, { threshold: 0.1 }) : null;
    if (io) io.observe(cont);
    var api = {
      duracion: DUR, planos: PLANOS, reducido: lento,
      play: function(){ if (T >= DUR) T = 0; if (jugando) return; jugando = true; ultimo = performance.now(); raf = requestAnimationFrame(cuadro); },
      pause: function(){ jugando = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
      seek: function(t){ T = cl(t, 0, DUR); avisar(render(T)); },
      render: function(t){ return render(t); },
      get tiempo(){ return T; }, get jugando(){ return jugando; },
      destroy: function(){ api.pause(); if (ro) ro.disconnect(); if (io) io.disconnect(); limpiar.forEach(function(o){ o.dispose(); }); renderer.dispose(); canvas.remove(); }
    };
    medir();
    // con «reducir movimiento»: el cierre quieto, sin recorrido de cámara
    if (lento) api.seek(DUR); else api.seek(0);
    return api;
  }
  window.AlCine = window.AlCine || {};
  window.AlCine.concilia = crear;
})();
