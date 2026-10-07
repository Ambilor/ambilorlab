/* Propuesta · aparato fotográfico compartido por los demos (motor de tarjetas y "Ver en acción" del V1).
   En computador, la app se ve en la pantalla de un notebook. Fotos de estudio generadas con IA (Higgsfield · Z Image), en propuesta/img/, con la
   pantalla en negro, sin reflejos verdes y recortadas sin fondo (Higgsfield · remove_background), para que el
   aparato se apoye directo en la página (fuente/preparar.py y quad.py).
   La pantalla de la foto está en perspectiva: una homografía lleva el plano de la pantalla (x, y en unidades
   del demo) a sus cuatro esquinas en la foto, y así lo que se dibuja en ella queda pegado al vidrio.
   En celular y tablet (y en una ventana angosta de computador) no hay aparato: la pantalla del visitante ya
   lo es, así que la app va de frente, de borde a borde del cuadro, en el formato de cómo lo sostiene. */
window.alFoto = (function(){
  // q: esquinas de la pantalla (sup-izq, sup-der, inf-der, inf-izq, px de la foto) · caja: el aparato completo, para encuadrar
  // prop: ancho/alto de la pantalla real · radio: esquinas redondeadas de la pantalla (fracción del ancho)
  var FOTOS = {
    notebook: { src: 'img/notebook.webp', w: 1800, h: 1111, prop: 1.6, radio: 0.008,
      q: [[61.4, 73.6], [1207.0, 119.5], [1261.3, 816.7], [82.9, 842.5]], caja: [27.6, 27.6, 1772.4, 1083.9] } };
  // ¿qué aparato tiene el visitante? (iPadOS se presenta como Mac: se distingue por la pantalla táctil)
  var _eq = null;
  function equipo(){
    if (_eq) return _eq;
    var tactil = navigator.maxTouchPoints > 0 && window.matchMedia && matchMedia('(pointer: coarse)').matches;
    return (_eq = !tactil ? 'pc' : (Math.min(screen.width, screen.height) >= 600 ? 'tablet' : 'cel'));
  }
  function homografia(de, a){   // 4 pares de puntos → matriz 3×3 (h22 = 1)
    var A = [], B = [], i, c, r, k;
    for (i = 0; i < 4; i++) { var x = de[i][0], y = de[i][1], u = a[i][0], v = a[i][1];
      A.push([x, y, 1, 0, 0, 0, -u*x, -u*y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v*x, -v*y]); B.push(v); }
    for (c = 0; c < 8; c++) {   // Gauss con pivoteo
      var p = c; for (r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      var tA = A[c]; A[c] = A[p]; A[p] = tA; var tB = B[c]; B[c] = B[p]; B[p] = tB;
      for (r = 0; r < 8; r++) if (r !== c) { var f = A[r][c] / A[c][c]; for (k = c; k < 8; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; }
    }
    return B.map(function(v, i){ return v / A[i][i]; }).concat(1);
  }
  function rr(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function lienzo(T, w, h, f){ var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
  // fondo de pantalla: degradado de marca con dos halos (el mismo del escritorio de las ventanas)
  function escritorio(c, w, h){
    var l = c.createLinearGradient(0, 0, w, h); l.addColorStop(0, '#0d2742'); l.addColorStop(0.55, '#16477a'); l.addColorStop(1, '#0b3340'); c.fillStyle = l; c.fillRect(0, 0, w, h);
    var r = c.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.3, h * 0.25, Math.max(w, h) * 0.6); r.addColorStop(0, 'rgba(110,170,240,.45)'); r.addColorStop(1, 'rgba(110,170,240,0)'); c.fillStyle = r; c.fillRect(0, 0, w, h);
    var r2 = c.createRadialGradient(w * 0.85, h * 0.9, 0, w * 0.85, h * 0.9, Math.max(w, h) * 0.5); r2.addColorStop(0, 'rgba(20,170,150,.35)'); r2.addColorStop(1, 'rgba(20,170,150,0)'); c.fillStyle = r2; c.fillRect(0, 0, w, h);
  }
  // ── Marco del equipo del visitante (celular y tablet) ──────────────────────────────────────────────
  // De frente, sin inclinación, con las medidas de su pantalla: iPhone (titanio, isla dinámica o muesca,
  // barra de estado e indicador de inicio), iPad (bisel parejo, cámara en el bisel, barra de estado) o
  // Android (cámara perforada). Las proporciones salen de las medidas reales en puntos (p. ej. iPhone 16 Pro:
  // 402 × 874, esquinas de 55, isla de 125 × 37; iPad Pro 11: 834 × 1210, esquinas de 18).
  function modelo(){
    var ua = navigator.userAgent, w = Math.min(screen.width, screen.height), h = Math.max(screen.width, screen.height);
    if (/iPhone/.test(ua)) return { tipo: 'iphone', muesca: w <= 390 && h <= 844 };
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return { tipo: 'ipad' };
    return { tipo: equipo() === 'tablet' ? 'tableta' : 'android' };
  }
  // insets de la pantalla alrededor de la app (barra de estado, isla, indicador de inicio) y del marco
  function medidas(vert, PW, PH){
    var m = modelo(), S = Math.min(PW, PH), r = { m: m, top: 0, bot: 0, side: 0 };
    if (m.tipo === 'iphone') {
      if (vert) { r.top = 0.134 * PW; r.bot = 0.085 * PW; } else { r.side = 0.154 * PH; r.bot = 0.052 * PH; }
      r.radio = 0.137 * S; r.bisel = 0.026 * S; r.canto = 0.014 * S;
    } else if (m.tipo === 'ipad') {
      r.top = 0.034 * S; r.bot = 0.03 * S; r.radio = 0.026 * S; r.bisel = 0.045 * S; r.canto = 0.009 * S;
    } else {
      r.top = 0.07 * S; r.bot = 0.035 * S; r.radio = m.tipo === 'android' ? 0.09 * S : 0.035 * S; r.bisel = m.tipo === 'android' ? 0.024 * S : 0.04 * S; r.canto = 0.01 * S;
    }
    r.SW = PW + 2 * r.side; r.SH = PH + r.top + r.bot;
    r.OW = r.SW + 2 * r.bisel; r.OH = r.SH + 2 * r.bisel;
    return r;
  }
  // proporción del cuadro en táctil (la usa el CSS de la propuesta): la del equipo completo
  if (equipo() !== 'pc') {
    var _v = medidas(true, 3.84, 4.8), _h = medidas(false, 4.8, 3.8);
    document.documentElement.style.setProperty('--p-ar-v', (_v.OW / _v.OH).toFixed(4));
    document.documentElement.style.setProperty('--p-ar-h', (_h.OW / _h.OH).toFixed(4));
  }
  function senal(c, x, y, u, col){ c.fillStyle = col; for (var i = 0; i < 4; i++) { var hh = u * (0.35 + i * 0.22); rr(c, x + i * u * 0.32, y + u * 0.5 - hh, u * 0.22, hh, u * 0.06); c.fill(); } }
  function wifi(c, x, y, u, col){ c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round'; c.lineWidth = u * 0.16;
    for (var i = 1; i <= 2; i++) { c.beginPath(); c.arc(x, y + u * 0.42, u * (0.25 + i * 0.28), Math.PI * 1.25, Math.PI * 1.75); c.stroke(); }
    c.beginPath(); c.arc(x, y + u * 0.42, u * 0.13, 0, 7); c.fill(); }
  function bateria(c, x, y, u, col){ c.strokeStyle = col; c.globalAlpha = 0.45; c.lineWidth = u * 0.08; rr(c, x, y - u * 0.3, u * 1.25, u * 0.62, u * 0.17); c.stroke();
    c.globalAlpha = 1; c.fillStyle = col; rr(c, x + u * 0.12, y - u * 0.18, u * 1.01, u * 0.38, u * 0.09); c.fill();
    c.globalAlpha = 0.45; rr(c, x + u * 1.31, y - u * 0.1, u * 0.08, u * 0.22, u * 0.03); c.fill(); c.globalAlpha = 1; }
  function marco(T, g, pantalla, o){
    var vert = o.vert, PW = o.ventana.w, PH = o.ventana.h, d = medidas(vert, PW, PH), m = d.m;
    var pad = 0.02 * Math.min(PW, PH), FW = d.OW + 2 * pad, FH = d.OH + 2 * pad;
    var k = 1600 / Math.max(FW, FH), cw = Math.round(FW * k), ch = Math.round(FH * k);
    var X = function(v){ return v * k; };
    var ox = X(pad), oy = X(pad), OW = X(d.OW), OH = X(d.OH), bz = X(d.bisel), Ro = X(d.radio + d.bisel);
    var sx = ox + bz, sy = oy + bz, SW = X(d.SW), SH = X(d.SH), Ri = X(d.radio);
    var metal = m.tipo === 'iphone' ? ['#77746f', '#c9c5be', '#a29e98', '#d8d4cd', '#6c6965'] : (m.tipo === 'ipad' ? ['#5b5e63', '#b8bbc0', '#8e9196', '#c9ccd0', '#55585c'] : ['#2a2c30', '#5d6066', '#3a3d42', '#62656b', '#25272a']);
    // cuerpo: canto metálico, vidrio negro y el hueco de la pantalla
    var cuerpo = lienzo(T, cw, ch, function(c){
      // botones laterales (asoman del canto)
      c.fillStyle = metal[1];
      var bot = function(x, y, w, h){ rr(c, x, y, w, h, Math.min(w, h) / 2); c.fill(); };
      var bw = X(pad) * 0.9;
      if (m.tipo === 'iphone') {
        if (vert) { bot(ox - bw + 2, oy + OH * 0.17, bw, OH * 0.05); bot(ox - bw + 2, oy + OH * 0.25, bw, OH * 0.09); bot(ox - bw + 2, oy + OH * 0.36, bw, OH * 0.09); bot(ox + OW - 2, oy + OH * 0.27, bw, OH * 0.14); bot(ox + OW - 2, oy + OH * 0.62, bw, OH * 0.07); }
        else { bot(ox + OW * 0.17, oy - bw + 2, OW * 0.05, bw); bot(ox + OW * 0.25, oy - bw + 2, OW * 0.09, bw); bot(ox + OW * 0.36, oy - bw + 2, OW * 0.09, bw); bot(ox + OW * 0.27, oy + OH - 2, OW * 0.14, bw); bot(ox + OW * 0.62, oy + OH - 2, OW * 0.07, bw); }
      } else if (m.tipo === 'ipad') {
        if (vert) { bot(ox + OW * 0.78, oy - bw + 2, OW * 0.09, bw); bot(ox + OW - 2, oy + OH * 0.08, bw, OH * 0.05); bot(ox + OW - 2, oy + OH * 0.14, bw, OH * 0.05); }
        else { bot(ox - bw + 2, oy + OH * 0.1, bw, OH * 0.09); bot(ox + OW * 0.08, oy - bw + 2, OW * 0.05, bw); bot(ox + OW * 0.14, oy - bw + 2, OW * 0.05, bw); }
      } else { bot(ox + OW - 2, oy + OH * 0.22, bw, OH * 0.12); bot(ox + OW - 2, oy + OH * 0.38, bw, OH * 0.07); }
      var l = c.createLinearGradient(ox, oy, ox + OW, oy + OH);
      metal.forEach(function(col, i){ l.addColorStop(i / (metal.length - 1), col); });
      c.fillStyle = l; rr(c, ox, oy, OW, OH, Ro); c.fill();
      var e = X(d.canto);
      c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, ox + e * 0.35, oy + e * 0.35, OW - e * 0.7, OH - e * 0.7, Ro - e * 0.35); c.fill();
      c.fillStyle = '#0a0b0d'; rr(c, ox + e, oy + e, OW - 2 * e, OH - 2 * e, Ro - e); c.fill();
      // cámara frontal en el bisel (iPad)
      if (m.tipo === 'ipad') { c.fillStyle = '#1c2a3a'; c.beginPath(); if (vert) c.arc(ox + bz / 2 + e / 2, oy + OH / 2, bz * 0.13, 0, 7); else c.arc(ox + OW / 2, oy + bz / 2 + e / 2, bz * 0.13, 0, 7); c.fill(); }
      c.globalCompositeOperation = 'destination-out'; rr(c, sx, sy, SW, SH, Ri); c.fill();
    });
    // encima de la app: barra de estado, isla o muesca, cámara perforada, indicador de inicio y brillo del vidrio
    var capa = function(col){ return lienzo(T, cw, ch, function(c){
      c.save(); rr(c, sx, sy, SW, SH, Ri); c.clip();
      var W = vert ? SW : SH;   // el lado corto de la pantalla, para escalar
      var negro = '#000';
      if (m.tipo === 'iphone') {
        if (vert) {
          var iw = W * 0.31, ih = W * 0.092, iy = sy + W * 0.027;
          c.fillStyle = negro;
          if (m.muesca) { rr(c, sx + SW / 2 - W * 0.21, sy - ih, W * 0.42, ih * 2.05, ih * 0.6); c.fill(); }
          else { rr(c, sx + SW / 2 - iw / 2, iy, iw, ih, ih / 2); c.fill(); }
          var yc = iy + ih / 2;
          c.fillStyle = col; c.font = '600 ' + Math.round(W * 0.045) + 'px -apple-system, "SF Pro Text", Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('9:41', sx + W * 0.17, yc);
          var u = W * 0.042; senal(c, sx + W * 0.7, yc - u * 0.5, u, col); wifi(c, sx + W * 0.8, yc - u * 0.55, u, col); bateria(c, sx + W * 0.85, yc, u, col);
          c.fillStyle = '#111'; rr(c, sx + SW / 2 - W * 0.18, sy + SH - X(d.bot) / 2 - W * 0.007, W * 0.36, W * 0.013, W * 0.007); c.fill();
        } else {
          var lw = W * 0.092, lh = W * 0.31; c.fillStyle = negro;
          if (m.muesca) { rr(c, sx - lw, sy + SH / 2 - W * 0.21, lw * 2.05, W * 0.42, lw * 0.6); c.fill(); }
          else { rr(c, sx + W * 0.027, sy + SH / 2 - lh / 2, lw, lh, lw / 2); c.fill(); }
          c.fillStyle = '#111'; rr(c, sx + SW / 2 - W * 0.32, sy + SH - X(d.bot) / 2 - W * 0.007, W * 0.64, W * 0.013, W * 0.007); c.fill();
        }
      } else {
        var sb = X(d.top), yc2 = sy + sb / 2, f = Math.round(sb * 0.5);
        c.fillStyle = col; c.font = '600 ' + f + 'px -apple-system, "SF Pro Text", Inter, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
        c.fillText(m.tipo === 'ipad' ? '9:41   lun 7 oct' : '9:41', sx + sb * 0.7, yc2);
        var u2 = f * 0.95; wifi(c, sx + SW - sb * 0.7 - u2 * 3.4, yc2 - u2 * 0.55, u2, col); bateria(c, sx + SW - sb * 0.7 - u2 * 1.4, yc2, u2, col);
        if (m.tipo !== 'ipad') { senal(c, sx + SW - sb * 0.7 - u2 * 5.2, yc2 - u2 * 0.5, u2, col); c.fillStyle = negro; c.beginPath(); c.arc(sx + SW / 2, yc2, sb * 0.28, 0, 7); c.fill(); }
        c.fillStyle = '#111'; rr(c, sx + SW / 2 - W * 0.12, sy + SH - X(d.bot) / 2 - W * 0.006, W * 0.24, W * 0.012, W * 0.006); c.fill();
      }
      var gl = c.createLinearGradient(sx, sy, sx + SW, sy + SH); gl.addColorStop(0, 'rgba(255,255,255,.06)'); gl.addColorStop(0.42, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,.05)'); gl.addColorStop(0.58, 'rgba(255,255,255,0)');
      c.fillStyle = gl; c.fillRect(sx, sy, SW, SH);
      c.restore();
    }); };
    var MB = T.MeshBasicMaterial, mat = function(map){ return new MB({ map: map, transparent: true, depthWrite: false, toneMapped: false }); };
    var cy = 0;   // el centro de la pantalla es el origen
    var plano = function(mt, z, orden){ var me = new T.Mesh(new T.PlaneGeometry(FW, FH), mt); me.position.set(0, cy, z); me.renderOrder = orden; me.frustumCulled = false; g.add(me); return me; };
    // pantalla apagada detrás de la app (se ve en los fundidos)
    var fondo = new T.Mesh(new T.PlaneGeometry(d.SW, d.SH), new MB({ color: 0x000000, toneMapped: false })); fondo.position.z = -0.02; fondo.renderOrder = 0; pantalla.add(fondo);
    plano(mat(cuerpo), 0.05, 40);
    var claro = plano(mat(capa('#ffffff')), 0.06, 41), oscuro = plano(mat(capa('#111111')), 0.06, 41); oscuro.visible = false;
    if (o.vert) document.documentElement.style.setProperty('--p-ar-v', (FW / FH).toFixed(4)); else document.documentElement.style.setProperty('--p-ar-h', (FW / FH).toFixed(4));
    return { d: d, ext: { w: FW, h: FH },
      // el color de la barra de estado sigue a la app: texto blanco sobre fondo oscuro, negro sobre claro
      tono: function(cx){ try { var p = cx.getImageData(Math.round(cx.canvas.width / 2), 3, 1, 1).data, lum = (0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]) / 255; var os = p[3] > 10 && lum > 0.6; claro.visible = !os; oscuro.visible = os; } catch (e) {} } };
  }
  // Ventana de frente, sin aparato: en computador (ventana angosta) con su sombra; en celular y tablet,
  // dentro del marco del equipo del visitante, a pantalla completa.
  function plana(T, escena, o){
    var g = new T.Group(); escena.add(g);
    var pantalla = new T.Group(); g.add(pantalla);
    if (equipo() !== 'pc') {
      var mc = marco(T, g, pantalla, o), d = mc.d;
      g.userData = { plano: true, pleno: true, pantalla: pantalla, SW: d.SW, SH: d.SH, ventanaY: (d.bot - d.top) / 2, marco: mc, ext: mc.ext,
        sombraVentana: { material: {} }, caja: { x: 0, y: 0, w: mc.ext.w, h: mc.ext.h } };
      g.visible = false; return g;
    }
    var c = document.createElement('canvas'); c.width = c.height = 256; var x = c.getContext('2d');
    x.filter = 'blur(14px)'; x.fillStyle = 'rgba(0,8,20,.75)'; x.fillRect(36, 40, 184, 184);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    var vs = new T.Mesh(new T.PlaneGeometry(o.ventana.w + 0.7, o.ventana.h + 0.7), new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    vs.position.set(0, -0.1, -0.005); vs.renderOrder = 2; pantalla.add(vs);
    // "aparato completo" = la ventana con algo de aire: el alejamiento entre pasos es leve
    g.userData = { plano: true, pantalla: pantalla, SW: o.ventana.w, SH: o.ventana.h, sombraVentana: vs, caja: { x: 0, y: -o.ventana.h * 0.05, w: o.ventana.w * 1.3, h: o.ventana.h * 1.3 } };
    g.visible = false; return g;
  }
  // ¿Con qué foto? null = sin aparato (ventana sola, de frente)
  // en celular y tablet la pantalla del visitante ya es el aparato: la app va sola, de borde a borde del cuadro
  function elegir(vert){ return equipo() === 'pc' && !vert ? FOTOS.notebook : null; }
  // Arma el aparato dentro de la escena (ver elegir()).
  // o: { vert, ventana: {w, h} (ventana centrada sobre un escritorio) o alto: alto de la pantalla, anis, listo }
  function crear(T, escena, o){
    var FOTO = elegir(o.vert), MB = T.MeshBasicMaterial;
    if (!FOTO) return plana(T, escena, o);
    var g = new T.Group(); escena.add(g);
    // con ventana, la app va a pantalla completa: la pantalla tiene el alto de la ventana (o su ancho, si es más angosta)
    var SH = o.ventana ? Math.max(o.ventana.h, o.ventana.w / FOTO.prop) : o.alto, SW = SH * FOTO.prop;
    var q = FOTO.q, cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
    var k = SH / (((q[3][1] - q[0][1]) + (q[2][1] - q[1][1])) / 2);   // unidades por píxel de la foto
    var W = function(x, y){ return [(x - cx) * k, -(y - cy) * k]; };
    // la foto
    var tex = new T.TextureLoader().load(FOTO.src, o.listo); tex.encoding = T.sRGBEncoding; tex.anisotropy = o.anis || 1;
    var foto = new T.Mesh(new T.PlaneGeometry(FOTO.w * k, FOTO.h * k), new MB({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    foto.position.set((FOTO.w / 2 - cx) * k, -(FOTO.h / 2 - cy) * k, -0.02); foto.renderOrder = -1; g.add(foto);
    // la pantalla: grupo con matriz proyectiva (homografía) en vez de posición/rotación
    var H = homografia([[-SW/2, SH/2], [SW/2, SH/2], [SW/2, -SH/2], [-SW/2, -SH/2]], q.map(function(p){ return W(p[0], p[1]); }));
    var pantalla = new T.Group(); pantalla.matrixAutoUpdate = false;
    pantalla.matrix.set(H[0], H[1], 0, H[2],  H[3], H[4], 0, H[5],  0, 0, 1, 0,  H[6], H[7], 0, H[8]);
    g.add(pantalla);
    var plano = function(w, h, mat, z, orden){ var m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.position.z = z; m.renderOrder = orden; m.frustumCulled = false; pantalla.add(m); return m; };
    var mate = function(map){ return new MB({ map: map, side: T.DoubleSide, transparent: true, depthWrite: false, toneMapped: false }); };
    var ancho = 512, alto = Math.round(ancho / FOTO.prop);
    // esquinas redondeadas de la pantalla (para lo que se dibuje encima de ella)
    var esquinas = lienzo(T, ancho, alto, function(c, w, h){ c.fillStyle = '#fff'; rr(c, 0, 0, w, h, FOTO.radio * w); c.fill(); });
    var u = { pantalla: pantalla, SW: SW, SH: SH, esquinas: esquinas, escritorio: function(){ return lienzo(T, ancho, alto, escritorio); } };
    if (o.ventana) {   // la ventana del paso se estira a lo ancho de la pantalla con su propio borde (ver el motor)
      u.pleno = true; u.ventanaY = SH / 2 - o.ventana.h / 2;   // arriba, como una app
      u.sombraVentana = { material: {} };
    }
    // brillo del vidrio: franja diagonal muy tenue sobre toda la pantalla
    plano(SW, SH, mate(lienzo(T, 256, 256, function(c, w, h){
      var l = c.createLinearGradient(0, 0, w, h); l.addColorStop(0, 'rgba(255,255,255,.07)'); l.addColorStop(0.38, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,.06)'); l.addColorStop(0.62, 'rgba(255,255,255,0)'); c.fillStyle = l; c.fillRect(0, 0, w, h); })), 0.06, 30);
    var a = W(FOTO.caja[0], FOTO.caja[1]), b = W(FOTO.caja[2], FOTO.caja[3]);
    u.caja = { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, w: b[0] - a[0], h: a[1] - b[1] };
    // sombra de apoyo: el aparato descansa sobre la página
    var piso = new T.Mesh(new T.PlaneGeometry(u.caja.w * 1.05, u.caja.h * 0.16), new MB({ transparent: true, depthWrite: false, toneMapped: false, map: lienzo(T, 256, 64, function(c, w, h){
      var r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,6,16,.55)'); r.addColorStop(0.6, 'rgba(0,6,16,.18)'); r.addColorStop(1, 'rgba(0,6,16,0)');
      c.setTransform(1, 0, 0, h / w, 0, 0); c.fillStyle = r; c.fillRect(0, 0, w, w); }) }));
    piso.position.set(u.caja.x, b[1] + u.caja.h * 0.01, -0.03); piso.renderOrder = -2; g.add(piso);
    g.userData = u; g.visible = false; return g;
  }
  // Cámara estilo grabación de pantalla (Screen Studio), de frente a la foto. Tres encuadres, con resortes suaves:
  // el aparato completo (al empezar y un alejamiento breve al cambiar de paso), la ventana llenando el cuadro
  // (abajo queda la barra de controles) y un acercamiento que sigue al cursor mientras trabaja.
  // st: estado { z, x, y, a } · o: { T, dt, ip, lt, quiere, foco: {x, y} o null, vent: {w, h}, vert, px: {x, y} }
  function camara(cam, u, st, o){
    var cl = function(v, a, b){ return Math.max(a, Math.min(b, v)); }, lerp = function(a, b, t){ return a + (b - a) * t; };
    var ease = function(x){ x = cl(x, 0, 1); return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };
    var dt = o.dt, tactil = equipo() !== 'pc';
    if (tactil && u.plano) {   // en celular y tablet la app se usa quieta: sin zoom, sin alejarse, de borde a borde
      var tg0 = Math.tan(cam.fov * Math.PI / 360);
      var e0 = u.ext || o.vent;
      cam.position.set(0, 0, Math.max(e0.h / 2 / tg0, e0.w / 2 / (tg0 * cam.aspect)));
      cam.lookAt(0, 0, 0); return;
    }
    st.z += (o.quiere - st.z) * (1 - Math.exp(-dt * 3.2));
    if (o.foco) { var kp = 1 - Math.exp(-dt * 4.5), lx = u.SW * 0.2, ly = u.SH * 0.2;
      st.x += (cl(o.foco.x, -lx, lx) - st.x) * kp; st.y += (cl(o.foco.y, -ly, ly) - st.y) * kp; }
    var ver = o.T < 1.4 ? 1 : (o.ip > 0 && o.lt < 0.55 ? 0.4 : 0);
    st.a += (ver - st.a) * (1 - Math.exp(-dt * (ver > st.a ? 5 : 2.4)));
    var cj = u.caja, tg = Math.tan(cam.fov * Math.PI / 360), as = cam.aspect, v = o.vert;
    var aparatoD = Math.max(cj.h * (v ? 1.2 : 1.38) / 2 / tg, cj.w * (v ? 1.06 : 1.22) / 2 / (tg * as));
    var fh = u.plano ? 1.04 : (v ? 1.1 : 1.24), fw = u.plano ? 1.03 : (v ? 1.06 : 1.1);   // sin aparato: la app de borde a borde
    var ventanaD = Math.max(o.vent.h * fh / 2 / tg, o.vent.w * fw / 2 / (tg * as)), cerca = ventanaD * 0.68;
    var z = ease(st.z), a = ease(st.a), px = o.px || { x: 0, y: 0 };
    var mx = lerp(lerp(0, st.x, z), cj.x, a) + px.x * 0.12, my = lerp(lerp(-o.vent.h * (v || u.plano ? 0 : 0.06), st.y, z), cj.y - cj.h * 0.07, a) + px.y * 0.08;
    cam.position.set(mx, my, lerp(lerp(ventanaD, cerca, z), aparatoD, a) * (1 - Math.sin(o.T * 0.3) * 0.008));
    cam.lookAt(mx, my, 0);
  }
  // indicador de toque (en táctil, en vez de la flecha del mouse)
  function dedo(T){
    var t = lienzo(T, 128, 128, function(c, w){ c.beginPath(); c.arc(w/2, w/2, 46, 0, 7); c.fillStyle = 'rgba(18,48,77,.30)'; c.fill(); c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.95)'; c.stroke(); });
    return t;
  }
  return { crear: crear, camara: camara, elegir: elegir, tactil: function(){ return equipo() !== 'pc'; }, dedo: dedo };
})();
