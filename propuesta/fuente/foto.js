/* Propuesta · aparato fotográfico compartido por los demos (motor de tarjetas y "Ver en acción" del V1).
   El aparato es el del visitante: notebook en computador, tablet en iPad/tablet (horizontal o vertical, según
   cómo la tenga). Fotos de estudio generadas con IA (Higgsfield · Z Image), en propuesta/img/, con la
   pantalla en negro, sin reflejos verdes y recortadas sin fondo (Higgsfield · remove_background), para que el
   aparato se apoye directo en la página (fuente/preparar.py y quad.py).
   La pantalla de la foto está en perspectiva: una homografía lleva el plano de la pantalla (x, y en unidades
   del demo) a sus cuatro esquinas en la foto, y así lo que se dibuja en ella queda pegado al vidrio.
   En celular (y en una ventana angosta de computador) no hay aparato: la ventana va de frente y llena el
   cuadro, que en pantalla chica es lo que se tiene que leer. */
window.alFoto = (function(){
  // q: esquinas de la pantalla (sup-izq, sup-der, inf-der, inf-izq, px de la foto) · caja: el aparato completo, para encuadrar
  // prop: ancho/alto de la pantalla real · radio: esquinas redondeadas de la pantalla (fracción del ancho)
  var FOTOS = {
    notebook: { src: 'img/notebook.webp', w: 1800, h: 1111, prop: 1.6, radio: 0.008,
      q: [[61.4, 73.6], [1207.0, 119.5], [1261.3, 816.7], [82.9, 842.5]], caja: [27.6, 27.6, 1772.4, 1083.9] },
    tablet: { src: 'img/tablet.webp', w: 1800, h: 1578, prop: 1.43, radio: 0.025,
      q: [[86.5, 149.7], [1658.4, 110.8], [1656.3, 1473.9], [88.5, 1320.5]], caja: [31.9, 31.9, 1768.1, 1545.9] },
    tabletV: { src: 'img/tablet_v.webp', w: 1578, h: 1800, prop: 0.7, radio: 0.035,   // la misma foto, girada
      q: [[257.5, 88.5], [1428.3, 86.5], [1467.2, 1658.4], [104.1, 1656.3]], caja: [32.1, 31.9, 1546.1, 1768.1] } };
  // ¿qué aparato tiene el visitante? (iPadOS se presenta como Mac: se distingue por la pantalla táctil)
  function equipo(){
    var tactil = navigator.maxTouchPoints > 0 && window.matchMedia && matchMedia('(pointer: coarse)').matches;
    return !tactil ? 'pc' : (Math.min(screen.width, screen.height) >= 600 ? 'tablet' : 'cel');
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
  // Ventana de frente, sin aparato (formato vertical): solo su sombra sobre el fondo de la página.
  function plana(T, escena, o){
    var g = new T.Group(); escena.add(g);
    var pantalla = new T.Group(); g.add(pantalla);
    var c = document.createElement('canvas'); c.width = c.height = 256; var x = c.getContext('2d');
    x.filter = 'blur(14px)'; x.fillStyle = 'rgba(0,8,20,.75)'; x.fillRect(36, 40, 184, 184);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    var vs = new T.Mesh(new T.PlaneGeometry(o.ventana.w + 0.7, o.ventana.h + 0.7), new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    vs.position.set(0, -0.1, -0.005); vs.renderOrder = 2; pantalla.add(vs);
    // "aparato completo" = la ventana con algo de aire: el alejamiento entre pasos es leve
    g.userData = { pantalla: pantalla, SW: o.ventana.w, SH: o.ventana.h, sombraVentana: vs, caja: { x: 0, y: -o.ventana.h * 0.05, w: o.ventana.w * 1.3, h: o.ventana.h * 1.3 } };
    g.visible = false; return g;
  }
  // ¿Con qué foto? null = sin aparato (ventana sola, de frente)
  function elegir(vert){ var e = equipo(); return e === 'tablet' ? (vert ? FOTOS.tabletV : FOTOS.tablet) : (e === 'pc' && !vert ? FOTOS.notebook : null); }
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
    var dt = o.dt;
    st.z += (o.quiere - st.z) * (1 - Math.exp(-dt * 3.2));
    if (o.foco) { var kp = 1 - Math.exp(-dt * 4.5), lx = u.SW * 0.2, ly = u.SH * 0.2;
      st.x += (cl(o.foco.x, -lx, lx) - st.x) * kp; st.y += (cl(o.foco.y, -ly, ly) - st.y) * kp; }
    var ver = o.T < 1.4 ? 1 : (o.ip > 0 && o.lt < 0.55 ? 0.4 : 0);
    st.a += (ver - st.a) * (1 - Math.exp(-dt * (ver > st.a ? 5 : 2.4)));
    var cj = u.caja, tg = Math.tan(cam.fov * Math.PI / 360), as = cam.aspect, v = o.vert;
    var aparatoD = Math.max(cj.h * (v ? 1.2 : 1.38) / 2 / tg, cj.w * (v ? 1.06 : 1.22) / 2 / (tg * as));
    var ventanaD = Math.max(o.vent.h * (v ? 1.1 : 1.24) / 2 / tg, o.vent.w * (v ? 1.06 : 1.1) / 2 / (tg * as)), cerca = ventanaD * 0.68;
    var z = ease(st.z), a = ease(st.a), px = o.px || { x: 0, y: 0 };
    var mx = lerp(lerp(0, st.x, z), cj.x, a) + px.x * 0.12, my = lerp(lerp(-o.vent.h * (v ? 0 : 0.06), st.y, z), cj.y - cj.h * 0.07, a) + px.y * 0.08;
    cam.position.set(mx, my, lerp(lerp(ventanaD, cerca, z), aparatoD, a) * (1 - Math.sin(o.T * 0.3) * 0.008));
    cam.lookAt(mx, my, 0);
  }
  return { crear: crear, camara: camara, elegir: elegir };
})();
