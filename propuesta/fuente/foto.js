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
  // De frente, con las medidas reales en puntos (pt) de cada equipo. El panel se abre en el navegador, así
  // que se ve como una página en Safari (o Chrome en Android): barra de estado, barra del navegador con la
  // dirección e indicador de inicio. La app llena el ancho de la página; lo que sobra abajo es página en blanco.
  //   iPhone 16 Pro: 402 × 874, esquinas de 55, isla de 125 × 37 a 11 del borde, barra de estado de 54.
  //   iPhone con muesca (12 a 14): 390 × 844, esquinas de 47, muesca de 162 × 32.
  //   iPad Pro 11: 834 × 1194, esquinas de 18, bisel de unos 28; barra de estado de 24 y Safari arriba (50).
  //   Android: 412 × 915, esquinas de 40, cámara perforada; barra de estado de 32 y Chrome arriba (56).
  function modelo(){
    var ua = navigator.userAgent, w = Math.min(screen.width, screen.height), h = Math.max(screen.width, screen.height);
    if (/iPhone/.test(ua)) return w <= 390 && h <= 844 ? { tipo: 'iphone', muesca: true, w: 390, h: 844, r: 47 } : { tipo: 'iphone', w: 402, h: 874, r: 55 };
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return { tipo: 'ipad', w: 834, h: 1194, r: 18 };
    return equipo() === 'tablet' ? { tipo: 'tableta', w: 800, h: 1280, r: 20 } : { tipo: 'android', w: 412, h: 915, r: 40 };
  }
  // geometría en pt del equipo según la orientación: pantalla, franjas de sistema y bisel
  function especie(m, vert){
    var e = { W: vert ? m.w : m.h, H: vert ? m.h : m.w, r: m.r, top: 0, bot: 0, side: 0 };
    if (m.tipo === 'iphone') {
      e.bisel = 4.5; e.canto = 2.2;
      if (vert) { e.top = m.muesca ? 47 : 54; e.bot = 96; }        // Safari compacto abajo (dirección + botones) e indicador
      else { e.side = 62; e.top = 40; e.bot = 21; }                // horizontal: sin barra de estado; dirección arriba
    } else if (m.tipo === 'ipad') { e.bisel = 26; e.canto = 2.5; e.top = 24 + 50; e.bot = 20; }
    else { e.bisel = m.tipo === 'android' ? 5 : 22; e.canto = 2; e.top = 32 + 56; e.bot = 24; }
    return e;
  }
  // medidas en unidades del demo: la app llena el ancho útil (o el alto, si así cabe mejor)
  function medidas(vert, PW, PH, pestanas){
    var m = modelo(), e = especie(m, vert), tel = m.tipo === 'iphone' || m.tipo === 'android', tab = vert && tel && pestanas ? 56 : 0;
    var cw = e.W - 2 * e.side, chh = e.H - e.top - e.bot - tab;
    // celular vertical: la app usa todo el ancho de la pantalla (su margen interno de los lados queda fuera)
    var ancho = vert && (m.tipo === 'iphone' || m.tipo === 'android') ? 1.09 : 1;
    var u = Math.max(PW / (cw * ancho), PH / chh);   // unidades por pt
    // tablet horizontal: la pantalla es más ancha que la app; como en Safari de iPad, la barra lateral llena el resto
    var lado = !vert && !tel ? Math.max(0, cw - PW / u) : 0;
    var r = { m: m, e: e, u: u, top: e.top * u, bot: e.bot * u, side: e.side * u, radio: e.r * u, bisel: (e.bisel + e.canto) * u, canto: e.canto * u, tab: tab, lado: lado };
    r.SW = e.W * u; r.SH = e.H * u; r.OW = r.SW + 2 * r.bisel; r.OH = r.SH + 2 * r.bisel;
    r.appY = r.SH / 2 - r.top - PH / 2;   // la app, arriba de la página (bajo las barras)
    r.appX = lado * u / 2;                 // a la derecha de la barra lateral, si la hay
    return r;
  }
  // proporción del cuadro en táctil (la usa el CSS de la propuesta): la del equipo completo
  if (equipo() !== 'pc') {
    var _v = medidas(true, 3.84, 4.8, true), _h = medidas(false, 4.8, 3.8, true);
    document.documentElement.style.setProperty('--p-ar-v', (_v.OW / _v.OH).toFixed(4));
    document.documentElement.style.setProperty('--p-ar-h', (_h.OW / _h.OH).toFixed(4));
  }
  // íconos de la barra de estado, dibujados en pt (como los de iOS): x, y = esquina izquierda, centro vertical
  function senal(c, x, y, P, col){ c.fillStyle = col; [4, 6.3, 8.6, 11].forEach(function(h, i){ rr(c, x + P(i * 4.6), y + P(5.5 - h), P(3.1), P(h), P(1)); c.fill(); }); return P(17); }
  function wifi(c, x, y, P, col){
    var cx = x + P(8), by = y + P(5.4);
    c.fillStyle = col;
    [[10.6, 7.9], [7.2, 4.6], [3.6, 0]].forEach(function(r){ c.beginPath(); c.arc(cx, by, P(r[0]), Math.PI * 1.25, Math.PI * 1.75); if (r[1]) c.arc(cx, by, P(r[1]), Math.PI * 1.75, Math.PI * 1.25, true); else c.lineTo(cx, by); c.closePath(); c.fill(); });
    return P(16);
  }
  function bateria(c, x, y, P, col, pct){
    c.strokeStyle = col; c.globalAlpha = 0.4; c.lineWidth = P(1); rr(c, x + P(0.5), y - P(6), P(24), P(12), P(3.8)); c.stroke();
    c.fillStyle = col; rr(c, x + P(25.4), y - P(2), P(1.6), P(4), P(0.8)); c.fill(); c.globalAlpha = 1;
    rr(c, x + P(2.5), y - P(4), P(20), P(8), P(2.2)); c.fill();
    return P(27);
  }
  function fuenteSF(px, peso){ return (peso || 600) + ' ' + Math.round(px) + 'px -apple-system, "SF Pro Text", "Helvetica Neue", Inter, sans-serif'; }
  function marco(T, g, pantalla, o){
    var vert = o.vert, PW = o.ventana.w, PH = o.ventana.h, d = medidas(vert, PW, PH, o.menu), m = d.m, e = d.e;
    var pad = 0.012 * Math.max(d.OW, d.OH), FW = d.OW + 2 * pad, FH = d.OH + 2 * pad;
    var k = (equipo() === 'cel' ? 1536 : 2048) / Math.max(FW, FH), cw = Math.round(FW * k), ch = Math.round(FH * k);
    var X = function(v){ return v * k; }, P = function(pt){ return pt * d.u * k; };   // unidades → px · pt → px
    var ox = X(pad), oy = X(pad), OW = X(d.OW), OH = X(d.OH), bz = X(d.bisel), Ro = X(d.radio + d.bisel);
    var sx = ox + bz, sy = oy + bz, SW = X(d.SW), SH = X(d.SH), Ri = X(d.radio);
    var metal = m.tipo === 'iphone' ? ['#6f6c67', '#cfcbc4', '#9d9993', '#dcd8d1', '#6a6762'] : (m.tipo === 'ipad' ? ['#7d8086', '#d3d6da', '#a6a9ae', '#dcdfe2', '#76797e'] : ['#2a2c30', '#5d6066', '#3a3d42', '#62656b', '#25272a']);
    var cuerpo = lienzo(T, cw, ch, function(c){
      // botones laterales (asoman del canto), en pt sobre el lado largo
      c.fillStyle = metal[2];
      var largo = function(t0, t1, lado){   // tramo del lado largo (fracciones) en el canto izquierdo (-1) o derecho (1)
        var g0 = (vert ? OH : OW) * t0, g1 = (vert ? OH : OW) * (t1 - t0), bw = X(pad) * 0.95;
        if (vert) rr(c, lado < 0 ? ox - bw + 3 : ox + OW - 3, oy + g0, bw, g1, bw / 2);
        else rr(c, ox + g0, lado < 0 ? oy - bw + 3 : oy + OH - 3, g1, bw, bw / 2);
        c.fill();
      };
      if (m.tipo === 'iphone') { largo(0.195, 0.235, -1); largo(0.27, 0.335, -1); largo(0.355, 0.42, -1); largo(0.27, 0.375, 1); largo(0.6, 0.655, 1); }
      else if (m.tipo === 'ipad') { if (vert) { largo(0.06, 0.11, 1); largo(0.12, 0.17, 1); } else { largo(0.06, 0.11, -1); largo(0.12, 0.17, -1); } }
      else { largo(0.22, 0.32, 1); largo(0.36, 0.42, 1); }
      var l = c.createLinearGradient(ox, oy, ox + OW, oy + OH);
      metal.forEach(function(col, i){ l.addColorStop(i / (metal.length - 1), col); });
      c.fillStyle = l; rr(c, ox, oy, OW, OH, Ro); c.fill();
      var ec = X(d.canto);
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = Math.max(1, ec * 0.25); rr(c, ox + ec * 0.3, oy + ec * 0.3, OW - ec * 0.6, OH - ec * 0.6, Ro - ec * 0.3); c.stroke();
      c.fillStyle = '#050506'; rr(c, ox + ec, oy + ec, OW - 2 * ec, OH - 2 * ec, Ro - ec); c.fill();
      if (m.tipo === 'ipad') {   // cámara frontal en el bisel del lado largo (como el iPad Pro actual)
        c.fillStyle = '#16202b'; c.beginPath();
        if (vert) c.arc(ox + ec + (bz - ec) / 2, oy + OH / 2, (bz - ec) * 0.16, 0, 7); else c.arc(ox + OW / 2, oy + ec + (bz - ec) / 2, (bz - ec) * 0.16, 0, 7);
        c.fill();
      }
      c.globalCompositeOperation = 'destination-out'; rr(c, sx, sy, SW, SH, Ri); c.fill();
    });
    // encima de la app: barras del sistema y del navegador, isla o muesca, indicador de inicio y brillo del vidrio
    var capa = function(col){ return lienzo(T, cw, ch, function(c){
      c.save(); rr(c, sx, sy, SW, SH, Ri); c.clip();
      var px = function(pt){ return sx + P(pt); }, py = function(pt){ return sy + P(pt); };
      var gris = 'rgba(246,246,248,.97)', azul = '#0a84ff', tinta = '#1c1c1e';
      var direccion = function(x, y, w, h, tam){   // campo de dirección con candado
        c.fillStyle = 'rgba(118,118,128,.14)'; rr(c, x, y, w, h, h * 0.3); c.fill();
        c.fillStyle = tinta; c.font = fuenteSF(P(tam), 500); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('script.google.com', x + w / 2 + P(6), y + h / 2 + P(0.5));
        var lw = c.measureText('script.google.com').width; c.fillStyle = '#3c3c43';
        rr(c, x + w / 2 - lw / 2 - P(9), y + h / 2 - P(1.5), P(8), P(6.5), P(1.5)); c.fill();
        c.strokeStyle = '#3c3c43'; c.lineWidth = P(1.4); c.beginPath(); c.arc(x + w / 2 - lw / 2 - P(5), y + h / 2 - P(2), P(2.6), Math.PI, 0); c.stroke();
      };
      var flecha = function(x, y, dir, col2){ c.strokeStyle = col2; c.lineWidth = P(2.2); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x + dir * P(4), y - P(7)); c.lineTo(x - dir * P(4), y); c.lineTo(x + dir * P(4), y + P(7)); c.stroke(); };
      var compartir = function(x, y, col2){ c.strokeStyle = col2; c.lineWidth = P(1.8); c.lineCap = 'round'; c.beginPath(); c.moveTo(x - P(6), y - P(2)); c.lineTo(x - P(8), y - P(2)); c.lineTo(x - P(8), y + P(9)); c.lineTo(x + P(8), y + P(9)); c.lineTo(x + P(8), y - P(2)); c.lineTo(x + P(6), y - P(2)); c.moveTo(x, y + P(3)); c.lineTo(x, y - P(10)); c.moveTo(x - P(4), y - P(6)); c.lineTo(x, y - P(10)); c.lineTo(x + P(4), y - P(6)); c.stroke(); };
      var pestanas = function(x, y, col2){ c.strokeStyle = col2; c.lineWidth = P(1.8); rr(c, x - P(7), y - P(5), P(12), P(12), P(2.5)); c.stroke(); c.beginPath(); c.moveTo(x - P(3), y - P(9)); c.lineTo(x + P(5), y - P(9)); c.quadraticCurveTo(x + P(9), y - P(9), x + P(9), y - P(5)); c.lineTo(x + P(9), y + P(3)); c.stroke(); };
      var libro = function(x, y, col2){ c.strokeStyle = col2; c.lineWidth = P(1.8); c.beginPath(); c.moveTo(x, y - P(6)); c.quadraticCurveTo(x - P(5), y - P(9), x - P(10), y - P(8)); c.lineTo(x - P(10), y + P(7)); c.quadraticCurveTo(x - P(5), y + P(6), x, y + P(9)); c.quadraticCurveTo(x + P(5), y + P(6), x + P(10), y + P(7)); c.lineTo(x + P(10), y - P(8)); c.quadraticCurveTo(x + P(5), y - P(9), x, y - P(6)); c.lineTo(x, y + P(9)); c.stroke(); };
      var inicio = function(ancho, color){ c.fillStyle = color; rr(c, sx + SW / 2 - P(ancho / 2), sy + SH - P(8) - P(5), P(ancho), P(5), P(2.5)); c.fill(); };
      var estadoDer = function(xd, y, col2, sen){ var x = xd - P(27); bateria(c, x, y, P, col2); x -= P(6 + 16); wifi(c, x, y, P, col2); if (sen) { x -= P(6 + 17); senal(c, x, y, P, col2); } };
      if (m.tipo === 'iphone' && vert) {
        var ih = 37, iw = 125, iy = 11, yc = py(iy + ih / 2);
        c.fillStyle = '#000';
        if (m.muesca) { var nw = 162, nh = 32; rr(c, px(e.W / 2 - nw / 2), sy - P(10), P(nw), P(nh + 10), P(20)); c.fill(); yc = py(23); }
        else { rr(c, px(e.W / 2 - iw / 2), py(iy), P(iw), P(ih), P(ih / 2)); c.fill(); }
        c.fillStyle = col; c.font = fuenteSF(P(17), 600); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('9:41', px(e.W * 0.165), yc + P(0.5));
        estadoDer(px(e.W - 26), yc, col, true);
        // Safari compacto: dirección y botones, sobre una barra translúcida
        var by = e.H - e.bot;
        c.fillStyle = gris; c.fillRect(sx, py(by), SW, SH - P(by)); c.fillStyle = 'rgba(60,60,67,.18)'; c.fillRect(sx, py(by), SW, Math.max(1, P(0.5)));
        direccion(px(12), py(by + 6), P(e.W - 24), P(36), 15);
        var fy = py(by + 6 + 36 + 17), xs = [0.1, 0.3, 0.5, 0.7, 0.9].map(function(f){ return px(e.W * f); });
        flecha(xs[0], fy, 1, azul); flecha(xs[1], fy, -1, 'rgba(10,132,255,.35)'); compartir(xs[2], fy, azul); libro(xs[3], fy, azul); pestanas(xs[4], fy, azul);
        inicio(140, '#000');
      } else if (m.tipo === 'iphone') {
        c.fillStyle = '#000';
        if (m.muesca) { rr(c, sx - P(10), py(e.H / 2 - 81), P(42), P(162), P(20)); c.fill(); }
        else { rr(c, px(11), py(e.H / 2 - 62.5), P(37), P(125), P(18.5)); c.fill(); }
        c.fillStyle = gris; c.fillRect(sx, sy, SW, P(e.top)); c.fillStyle = 'rgba(60,60,67,.18)'; c.fillRect(sx, py(e.top), SW, Math.max(1, P(0.5)));
        direccion(px(e.W / 2 - 150), py(5), P(300), P(30), 14);
        inicio(210, '#000');
      } else {
        // tablet o Android: barra de estado y barra del navegador arriba
        var ipad = m.tipo === 'ipad', sb = ipad ? 24 : 32;
        c.fillStyle = gris; c.fillRect(sx, sy, SW, P(e.top)); c.fillStyle = 'rgba(60,60,67,.18)'; c.fillRect(sx, py(e.top), SW, Math.max(1, P(0.5)));
        var ys = py(sb / 2 + (ipad ? 1 : 2));
        c.fillStyle = tinta; c.textAlign = 'left'; c.textBaseline = 'middle';
        if (ipad) { c.font = fuenteSF(P(14), 600); c.fillText('9:41', px(20), ys); var tw = c.measureText('9:41').width; c.font = fuenteSF(P(14), 500); c.fillText('lun 7 oct', px(20) + tw + P(6), ys); estadoDer(px(e.W - 20), ys, tinta, false); }
        else { c.font = fuenteSF(P(14), 500); c.fillText('9:41', px(18), ys); estadoDer(px(e.W - 16), ys, tinta, true); c.fillStyle = '#000'; c.beginPath(); c.arc(px(e.W / 2), ys, P(6), 0, 7); c.fill(); }
        var ty = sb + (e.top - sb) / 2;
        if (ipad) {
          direccion(px(e.W / 2 - Math.min(170, e.W * 0.22)), py(ty - 17), P(Math.min(340, e.W * 0.44)), P(34), 14);
          flecha(px(26), py(ty), 1, azul); flecha(px(58), py(ty), -1, 'rgba(10,132,255,.35)');
          compartir(px(e.W - 92), py(ty), azul); c.strokeStyle = azul; c.lineWidth = P(2); c.beginPath(); c.moveTo(px(e.W - 60), py(ty - 8)); c.lineTo(px(e.W - 60), py(ty + 8)); c.moveTo(px(e.W - 68), py(ty)); c.lineTo(px(e.W - 52), py(ty)); c.stroke(); pestanas(px(e.W - 28), py(ty), azul);
        } else {
          direccion(px(14), py(ty - 20), P(e.W - 28 - 64), P(40), 15);
          c.fillStyle = tinta; [0, 1, 2].forEach(function(i){ c.beginPath(); c.arc(px(e.W - 24), py(ty - 6 + i * 6), P(1.7), 0, 7); c.fill(); });
          rr(c, px(e.W - 58), py(ty - 9), P(18), P(18), P(4)); c.strokeStyle = tinta; c.lineWidth = P(1.8); c.stroke();
        }
        inicio(ipad ? 200 : 110, '#111');
      }
      var icono = function(x, y, t, col2){   // íconos simples de línea, en pt
        c.strokeStyle = col2; c.fillStyle = col2; c.lineWidth = P(1.8); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
        if (t === 0) { rr(c, x - P(9), y - P(8), P(18), P(16), P(3)); c.stroke(); c.beginPath(); c.moveTo(x - P(5), y + P(3)); c.lineTo(x - P(5), y - P(1)); c.moveTo(x, y + P(3)); c.lineTo(x, y - P(4)); c.moveTo(x + P(5), y + P(3)); c.lineTo(x + P(5), y + P(1)); }
        else if (t === 1) { for (var q = 0; q < 3; q++) { c.moveTo(x - P(8), y - P(6) + P(q * 6)); c.lineTo(x + P(8), y - P(6) + P(q * 6)); } }
        else if (t === 2) { c.arc(x, y, P(8), 0, 7); c.moveTo(x, y - P(4)); c.lineTo(x, y); c.lineTo(x + P(3), y + P(3)); }
        else if (t === 3) { c.arc(x, y, P(3.2), 0, 7); c.moveTo(x + P(8), y); c.arc(x, y, P(8), 0, 7); }
        else { rr(c, x - P(8), y - P(9), P(16), P(18), P(3)); c.moveTo(x - P(4), y - P(3)); c.lineTo(x + P(4), y - P(3)); c.moveTo(x - P(4), y + P(2)); c.lineTo(x + P(4), y + P(2)); }
        c.stroke();
      };
      if (d.lado > 1) {        // tablet horizontal: barra lateral de Safari
        var lw = P(d.lado), ly = py(e.top);
        c.fillStyle = '#f2f2f7'; c.fillRect(sx, ly, lw, SH - P(e.top)); c.fillStyle = 'rgba(60,60,67,.2)'; c.fillRect(sx + lw - Math.max(1, P(0.5)), ly, Math.max(1, P(0.5)), SH - P(e.top));
        var fila = function(y, txt2, ico, on, gris2){ if (on) { c.fillStyle = 'rgba(10,132,255,.12)'; rr(c, px(10), py(y - 15), lw - P(20), P(30), P(8)); c.fill(); }
          icono(px(30), py(y), ico, on ? azul : '#0a84ff'); c.fillStyle = gris2 ? '#8e8e93' : tinta; c.font = fuenteSF(P(15), on ? 600 : 400); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt2, px(50), py(y)); };
        var y0 = e.top + 30;
        fila(y0, '3 pestañas', 0, false); fila(y0 + 36, 'Privado', 4, false);
        c.fillStyle = '#8e8e93'; c.font = fuenteSF(P(12), 600); c.textAlign = 'left'; c.fillText('GRUPOS DE PESTAÑAS', px(16), py(y0 + 84));
        fila(y0 + 112, 'Ambilor.Lab', 1, true); fila(y0 + 148, 'Contabilidad', 1, false); fila(y0 + 184, 'Clientes', 1, false);
        c.fillStyle = '#8e8e93'; c.font = fuenteSF(P(12), 600); c.fillText('BIBLIOTECA', px(16), py(y0 + 232));
        fila(y0 + 260, 'Favoritos', 3, false); fila(y0 + 296, 'Lista de lectura', 2, false); fila(y0 + 332, 'Historial', 2, false);
      }
      var gl = c.createLinearGradient(sx, sy, sx + SW, sy + SH); gl.addColorStop(0, 'rgba(255,255,255,.05)'); gl.addColorStop(0.42, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,.04)'); gl.addColorStop(0.58, 'rgba(255,255,255,0)');
      c.fillStyle = gl; c.fillRect(sx, sy, SW, SH);
      c.restore();
    }); };
    // barra de pestañas de la app (celular): en su propia capa, porque solo va en las pantallas del panel
    var barraTab = function(){ return lienzo(T, cw, ch, function(c){
      c.save(); rr(c, sx, sy, SW, SH, Ri); c.clip();
      var px = function(pt){ return sx + P(pt); }, py = function(pt){ return sy + P(pt); };
      var icono = function(x, y, t, col2){   // íconos simples de línea, en pt
        c.strokeStyle = col2; c.fillStyle = col2; c.lineWidth = P(1.8); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
        if (t === 0) { rr(c, x - P(9), y - P(8), P(18), P(16), P(3)); c.stroke(); c.beginPath(); c.moveTo(x - P(5), y + P(3)); c.lineTo(x - P(5), y - P(1)); c.moveTo(x, y + P(3)); c.lineTo(x, y - P(4)); c.moveTo(x + P(5), y + P(3)); c.lineTo(x + P(5), y + P(1)); }
        else if (t === 1) { for (var q = 0; q < 3; q++) { c.moveTo(x - P(8), y - P(6) + P(q * 6)); c.lineTo(x + P(8), y - P(6) + P(q * 6)); } }
        else if (t === 2) { c.arc(x, y, P(8), 0, 7); c.moveTo(x, y - P(4)); c.lineTo(x, y); c.lineTo(x + P(3), y + P(3)); }
        else if (t === 3) { c.arc(x, y, P(3.2), 0, 7); c.moveTo(x + P(8), y); c.arc(x, y, P(8), 0, 7); }
        else { rr(c, x - P(8), y - P(9), P(16), P(18), P(3)); c.moveTo(x - P(4), y - P(3)); c.lineTo(x + P(4), y - P(3)); c.moveTo(x - P(4), y + P(2)); c.lineTo(x + P(4), y + P(2)); }
        c.stroke();
      };
      if (d.tab && o.menu) {   // celular: la barra de pestañas de la app, sobre la del navegador
        var ty0 = e.H - e.bot - d.tab;
        c.fillStyle = 'rgba(250,250,252,.98)'; c.fillRect(sx, py(ty0), SW, P(d.tab)); c.fillStyle = 'rgba(60,60,67,.18)'; c.fillRect(sx, py(ty0), SW, Math.max(1, P(0.5)));
        o.menu.forEach(function(it, i){ var x = px(e.W * (i + 0.5) / o.menu.length), on = i === 0, col2 = on ? '#1f5c99' : '#8e8e93';
          icono(x, py(ty0 + 20), i, col2); c.fillStyle = col2; c.font = fuenteSF(P(10), on ? 600 : 500); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it, x, py(ty0 + 41)); });
      }
      c.restore();
    }); };
    var MB = T.MeshBasicMaterial, mat = function(map){ return new MB({ map: map, transparent: true, depthWrite: false, toneMapped: false }); };
    var plano = function(mt, z, orden){ var me = new T.Mesh(new T.PlaneGeometry(FW, FH), mt); me.position.z = z; me.renderOrder = orden; me.frustumCulled = false; g.add(me); return me; };
    var fondo = new T.Mesh(new T.PlaneGeometry(d.SW, d.SH), new MB({ color: 0xffffff, toneMapped: false })); fondo.position.z = -0.02; fondo.renderOrder = 0; pantalla.add(fondo);
    plano(mat(cuerpo), 0.05, 40);
    var claro = plano(mat(capa('#ffffff')), 0.06, 41), oscuro = plano(mat(capa('#000000')), 0.06, 41); oscuro.visible = false;
    var solo = !(m.tipo === 'iphone' && vert); if (solo) { oscuro.visible = true; claro.visible = false; }   // la barra de estado va sobre el navegador
    var tabs = d.tab && o.menu ? plano(mat(barraTab()), 0.055, 41) : null;
    var vis = { w: FW, h: FH, cy: 0 };
    document.documentElement.style.setProperty(vert ? '--p-ar-v' : '--p-ar-h', (vis.w / vis.h).toFixed(4));
    return { d: d, ext: vis, zoom: 1,   // sin acercamiento al tocar: el demo quieto se entiende mejor
      // en el iPhone la barra de estado va sobre la página: blanca sobre fondo oscuro, negra sobre claro
      // y la barra de pestañas va solo en las pantallas del panel (cabecera de color), no en las del cliente
      tono: function(cx){ if (solo && !tabs) return; try { var p = cx.getImageData(Math.round(cx.canvas.width / 2), 3, 1, 1).data, lum = (0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]) / 255; var os = p[3] > 10 && lum > 0.6;
        if (!solo) { claro.visible = !os; oscuro.visible = os; } if (tabs) tabs.visible = !os; } catch (er) {} } };
  }
  // Ventana de frente, sin aparato: en computador (ventana angosta) con su sombra; en celular y tablet,
  // dentro del marco del equipo del visitante, a pantalla completa.
  function plana(T, escena, o){
    var g = new T.Group(); escena.add(g);
    var pantalla = new T.Group(); g.add(pantalla);
    if (equipo() !== 'pc') {
      var mc = marco(T, g, pantalla, o), d = mc.d;
      g.userData = { plano: true, pleno: true, pantalla: pantalla, SW: d.SW, SH: d.SH, ventanaY: d.appY, ventanaX: d.appX, marco: mc, ext: mc.ext,
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
    if (tactil && u.plano) {   // en celular y tablet: el equipo completo y quieto (el acercamiento distraía de lo que se explica)
      var tg0 = Math.tan(cam.fov * Math.PI / 360), e0 = u.ext || o.vent;
      var lejos0 = Math.max(e0.h / 2 / tg0, e0.w / 2 / (tg0 * cam.aspect)), cerca0 = lejos0 * (u.marco ? u.marco.zoom : 1);
      st.z += (o.quiere - st.z) * (1 - Math.exp(-dt * 3.2));
      if (o.foco) { var kq = 1 - Math.exp(-dt * 4.5); st.x += (cl(o.foco.x, -u.SW * 0.3, u.SW * 0.3) - st.x) * kq; st.y += (cl(o.foco.y, -u.SH * 0.3, u.SH * 0.3) - st.y) * kq; }
      var z0 = (u.marco && u.marco.zoom < 1) ? ease(st.z) : 0;
      var cy0 = e0.cy || 0; cam.position.set(lerp(0, st.x, z0), lerp(cy0, st.y, z0), lerp(lejos0, cerca0, z0));
      cam.lookAt(cam.position.x, cam.position.y, 0); return;
    }
    st.z += (o.quiere - st.z) * (1 - Math.exp(-dt * 3.2));
    if (o.foco) { var kp = 1 - Math.exp(-dt * 4.5), lx = u.SW * 0.2, ly = u.SH * 0.2;
      st.x += (cl(o.foco.x, -lx, lx) - st.x) * kp; st.y += (cl(o.foco.y, -ly, ly) - st.y) * kp; }
    var ver = o.T < 1.4 ? 1 : (o.ip > 0 && o.lt < 0.55 ? 0.4 : 0);
    st.a += (ver - st.a) * (1 - Math.exp(-dt * (ver > st.a ? 5 : 2.4)));
    var cj = u.caja, tg = Math.tan(cam.fov * Math.PI / 360), as = cam.aspect, v = o.vert;
    var aparatoD = Math.max(cj.h * (v ? 1.2 : 1.38) / 2 / tg, cj.w * (v ? 1.06 : 1.22) / 2 / (tg * as));
    var fh = u.plano ? 1.04 : (v ? 1.1 : 1.24), fw = u.plano ? 1.03 : (v ? 1.06 : 1.1);   // sin aparato: la app de borde a borde
    var ventanaD = Math.max(o.vent.h * fh / 2 / tg, o.vent.w * fw / 2 / (tg * as)), cerca = ventanaD * 0.84;   // acercamiento suave: el foco acompaña sin hacer perder el hilo
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
  // Celular vertical: cuánto más alta se dibuja la app (diseñada en 800 × 1000) para llenar la pantalla del
  // teléfono hasta la barra de abajo. Se reparte en alto (filas, campos, botones y espacios) y la letra y los
  // círculos conservan su forma (ver el motor).
  function estirar(vert, pestanas){
    var m = modelo(); if (!vert || equipo() === 'pc' || !(m.tipo === 'iphone' || m.tipo === 'android')) return 1;
    var e = especie(m, true), chh = e.H - e.top - e.bot - (pestanas ? 56 : 0), cw = e.W * 1.09;
    return Math.max(1, (800 / 1000) * chh / cw);
  }
  return { crear: crear, camara: camara, elegir: elegir, estirar: estirar, tactil: function(){ return equipo() !== 'pc'; }, dedo: dedo };
})();
