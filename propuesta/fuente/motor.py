# Cambios al motor de los demos, solo para la copia propuesta/.
# F · estilo "grabación de pantalla pro": las ventanas de cada paso se ven dentro de la pantalla
#     de una foto de estudio (notebook; tablet en el formato vertical) sobre un fondo degradado de
#     marca; la cámara hace zoom automático hacia el cursor mientras interactúa y se aleja entre pasos.
# Además: tomas de cine en "Ver en acción" del V1 (curvas y viajes en arco), sobre el mismo fondo.
APARATO = r"""
  // ── aparato fotográfico (propuesta): fotos de estudio generadas con IA (Higgsfield · Z Image) ──
  // propuesta/img/notebook.webp y tablet.webp: pantalla en negro, reflejos verdes quitados y bordes difuminados
  // (fuente/preparar.py y quad.py). La pantalla de la foto está en perspectiva: una homografía lleva el
  // plano de la pantalla (x, y en unidades del demo) a sus cuatro esquinas en la foto, y así las
  // ventanas, el cursor y los clics quedan pegados al vidrio.
  // q: esquinas de la pantalla (sup-izq, sup-der, inf-der, inf-izq, px de la foto) · caja: el aparato completo, para encuadrar
  // prop: ancho/alto de la pantalla real · radio: esquinas redondeadas de la pantalla (fracción del ancho)
  const FOTOS = {
    notebook: { src: 'img/notebook.webp', w: 2048, h: 1536, prop: 1.6, radio: 0.008,
      q: [[441.5, 394.1], [1438.0, 433.9], [1485.4, 1040.3], [460.0, 1063.1]], caja: [410, 346, 1933, 1280] },
    tablet: { src: 'img/tablet.webp', w: 1536, h: 2048, prop: 0.72, radio: 0.035,
      q: [[239.9, 373.2], [1001.4, 419.7], [1289.8, 1619.2], [476.6, 1679.2]], caja: [174, 312, 1336, 1761] } };
  function homografia(de, a){   // 4 pares de puntos → matriz 3×3 (h22 = 1)
    const A = [], B = [];
    for (let i = 0; i < 4; i++) { const [x, y] = de[i], [u, v] = a[i];
      A.push([x, y, 1, 0, 0, 0, -u*x, -u*y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v*x, -v*y]); B.push(v); }
    for (let c = 0; c < 8; c++) {   // Gauss con pivoteo
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
      for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; }
    }
    return B.map((v, i) => v / A[i][i]).concat(1);
  }
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const lienzo = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
  // horizontal: notebook; vertical: tablet. La ventana del paso va centrada en la pantalla.
  function aparato(vert, PW, PH){
    const FOTO = vert ? FOTOS.tablet : FOTOS.notebook;
    const g = new THREE.Group(); scene.add(g);
    const SH = vert ? PW * 1.06 / FOTO.prop : PH * 1.06, SW = SH * FOTO.prop;
    const q = FOTO.q, cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
    const k = SH / (((q[3][1] - q[0][1]) + (q[2][1] - q[1][1])) / 2);   // unidades por píxel de la foto
    const W = (x, y) => [(x - cx) * k, -(y - cy) * k];
    // la foto
    const tex = new THREE.TextureLoader().load(FOTO.src, () => { needsRender = true; });
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = ANISO;
    const foto = new THREE.Mesh(new THREE.PlaneGeometry(FOTO.w * k, FOTO.h * k), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    foto.position.set((FOTO.w / 2 - cx) * k, -(FOTO.h / 2 - cy) * k, -0.02); foto.renderOrder = -1; g.add(foto);
    // la pantalla: grupo con matriz proyectiva (homografía) en vez de posición/rotación
    const H = homografia([[-SW/2, SH/2], [SW/2, SH/2], [SW/2, -SH/2], [-SW/2, -SH/2]], q.map(p => W(p[0], p[1])));
    const pantalla = new THREE.Group(); pantalla.matrixAutoUpdate = false;
    pantalla.matrix.set(H[0], H[1], 0, H[2],  H[3], H[4], 0, H[5],  0, 0, 1, 0,  H[6], H[7], 0, H[8]);
    g.add(pantalla);
    // escritorio: degradado de marca con un halo, como fondo de pantalla
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, toneMapped: false, depthWrite: false, map: lienzo(vert ? 320 : 512, vert ? 444 : 320, (c, w, h) => {
      const l = c.createLinearGradient(0, 0, w, h); l.addColorStop(0, '#0d2742'); l.addColorStop(0.55, '#16477a'); l.addColorStop(1, '#0b3340'); c.fillStyle = l; c.fillRect(0, 0, w, h);
      const r = c.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.3, h * 0.25, w * 0.6); r.addColorStop(0, 'rgba(110,170,240,.45)'); r.addColorStop(1, 'rgba(110,170,240,0)'); c.fillStyle = r; c.fillRect(0, 0, w, h);
      const r2 = c.createRadialGradient(w * 0.85, h * 0.9, 0, w * 0.85, h * 0.9, w * 0.5); r2.addColorStop(0, 'rgba(20,170,150,.35)'); r2.addColorStop(1, 'rgba(20,170,150,0)'); c.fillStyle = r2; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'destination-in'; c.fillStyle = '#000'; rr(c, 0, 0, w, h, FOTO.radio * w); c.fill();   // esquinas de la pantalla
    }) }));
    fondo.position.z = -0.01; fondo.renderOrder = 1; fondo.frustumCulled = false; pantalla.add(fondo);
    // sombra suave de la ventana sobre el escritorio
    const vs = new THREE.Mesh(new THREE.PlaneGeometry(PW + 0.7, PH + 0.7), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false, toneMapped: false, map: lienzo(256, 256, (c, w, h) => {
      c.filter = 'blur(14px)'; c.fillStyle = 'rgba(0,8,20,.75)'; c.fillRect(36, 40, w - 72, h - 72); }) }));
    vs.position.set(0, -0.08, -0.005); vs.renderOrder = 2; vs.frustumCulled = false; pantalla.add(vs);
    // brillo del vidrio: franja diagonal muy tenue sobre toda la pantalla
    const brillo = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false, toneMapped: false, map: lienzo(256, 256, (c, w, h) => {
      const l = c.createLinearGradient(0, 0, w, h); l.addColorStop(0, 'rgba(255,255,255,.07)'); l.addColorStop(0.38, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,.06)'); l.addColorStop(0.62, 'rgba(255,255,255,0)'); c.fillStyle = l; c.fillRect(0, 0, w, h); }) }));
    brillo.position.z = 0.06; brillo.renderOrder = 30; brillo.frustumCulled = false; pantalla.add(brillo);
    const [x0, y0] = W(FOTO.caja[0], FOTO.caja[1]), [x1, y1] = W(FOTO.caja[2], FOTO.caja[3]);
    Object.assign(g.userData, { pantalla, sombraVentana: vs, caja: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y0 - y1 }, SW, SH });
    g.visible = false; return g;
  }
"""

def aplicar(s):
    def rep(a, b, n=1):
        nonlocal s
        c = s.count(a); assert c == n, (c, a[:90]); s = s.replace(a, b)

    # ── motor de tarjetas ──────────────────────────────────────────────────────
    # 1 · sin sala blanca ni niebla: el fondo lo pone la página (degradado)
    rep("  AL3D.ambiente(scene, { z:-4.5 });\n  AL3D.piso(scene, { y:-2.35 });",
        "  scene.fog = null;   // propuesta: sin sala; el fondo degradado lo pone la página\n"
        "  const SS = { z: 0, x: 0, y: 0, a: 1 };   // zoom automático (como Screen Studio): z = acercamiento al cursor, a = vista del aparato completo\n"
        + APARATO)
    # 2 · cada formato (horizontal / vertical) arma su aparato y lo muestra al usarse
    rep("    const sombraCard = AL3D.sombra(scene, PW*1.1, 1.6); sombraCard.visible = false;\n    return { vert, CW, CH, PW, PH, DRAW, CURSOR, cards, sombraCard };",
        "    const sombraCard = AL3D.sombra(scene, PW*1.1, 1.6); sombraCard.visible = false;\n    const disp = aparato(vert, PW, PH);\n    cards.forEach(c => { disp.userData.pantalla.add(c.m); disp.userData.pantalla.add(c.sh); c.m.frustumCulled = false; c.m.children.forEach(h => { h.visible = false; }); });   // ventanas planas, sin canto\n    return { vert, CW, CH, PW, PH, DRAW, CURSOR, cards, sombraCard, disp };")
    rep("    if (J) { J.cards.forEach(c => { c.m.visible = c.sh.visible = false; soltarLienzo(c); }); J.sombraCard.visible = false; }\n    J = vert ? (JV || (JV = juego(true))) : (JH || (JH = juego(false)));",
        "    if (J) { J.cards.forEach(c => { c.m.visible = c.sh.visible = false; soltarLienzo(c); }); J.sombraCard.visible = false; J.disp.visible = false; }\n    J = vert ? (JV || (JV = juego(true))) : (JH || (JH = juego(false)));\n    J.disp.visible = true;")
    # 3 · las ventanas viven en la pantalla: la del paso entra con un fundido corto, la anterior sale hacia la izquierda
    a = s.index("      const ein = i === 0 ? clamp((t + 0.3) / 0.9) : clamp((t - (s.a - 0.35)) / 0.9);")
    b = s.index("      c.m.updateMatrixWorld();", a)
    s = s[:a] + """      const cur = stepOf(t), dist = i - cur;
      const ein = i === 0 ? 1 : clamp((t - s.a + 0.05) / 0.38);                       // entra
      const sale = dist === -1 ? clamp((t - STEPS[cur].a + 0.05) / 0.38) : 0;        // la anterior se va
      const vis = dist === 0 || (dist === -1 && sale < 1);
      c.m.visible = vis; c.sh.visible = false;
      if (!vis) { soltarLienzo(c); return; }
      tomarLienzo(c);
      J.DRAW[i](c.g, Math.max(0, t - s.a)); c.tx.needsUpdate = true;
      const e = ease(ein), sx = dist === 0 ? (1 - e) * 0.35 : -ease(sale) * 0.35;
      c.m.position.set(sx, 0, dist === 0 ? 0.004 : 0.002);
      c.m.rotation.set(0, 0, 0);
      c.m.material.opacity = dist === 0 ? e : 1 - ease(sale);
      if (dist === 0) J.disp.userData.sombraVentana.material.opacity = 0.9 * e;
""" + s[b:]
    # 4 · cámara estilo Screen Studio: de frente a la foto (zoom y paneo, como en una edición de video);
    #     la ventana llena el cuadro; mientras el cursor trabaja, acercamiento suave que lo sigue;
    #     el aparato completo se ve al empezar y en un alejamiento breve entre pasos
    a = s.index("      const ip = stepOf(T), sp = STEPS[ip], lt = T - sp.a, lado = ip % 2 ? -1 : 1;")
    b = s.index("      camera.lookAt(bx*0.3 + fx, by*0.4 + fy, 0);", a) + len("      camera.lookAt(bx*0.3 + fx, by*0.4 + fy, 0);")
    s = s[:a] + """      const ip = stepOf(T), sp = STEPS[ip], lt = T - sp.a;
      const cf = J.CURSOR[ip];
      let quiere = 0;
      if (cf && cursor.visible) { const k = cf.keys; quiere = clamp((lt - k[0][0] + 0.15) / 0.35) * (1 - clamp((lt - k[k.length - 1][0] - 0.9) / 0.4)); }
      const kz = 1 - Math.exp(-dt * 3.2), kp = 1 - Math.exp(-dt * 4.5);
      SS.z += (quiere - SS.z) * kz;
      // el aparato completo se ve al empezar y en un alejamiento breve al cambiar de paso; el resto del
      // tiempo la ventana llena el cuadro para que se lea
      const verAparato = T < 1.4 ? 1 : (ip > 0 && lt < 0.55 ? 0.4 : 0);
      SS.a += (verAparato - SS.a) * (1 - Math.exp(-dt * (verAparato > SS.a ? 5 : 2.4)));
      const u = J.disp.userData, cj = u.caja, tg = Math.tan(camera.fov * Math.PI / 360);
      if (cursor.visible) {   // el encuadre sigue al cursor sin salirse de la pantalla
        const lx = u.SW * 0.2, ly = u.SH * 0.2;
        SS.x += (clamp(cursor.position.x, -lx, lx) - SS.x) * kp; SS.y += (clamp(cursor.position.y, -ly, ly) - SS.y) * kp;
      }
      const z = ease(SS.z);
      // tres encuadres (abajo queda la barra de controles): aparato completo · ventana · acercamiento al cursor
      const aparatoD = Math.max(cj.h * (J.vert ? 1.2 : 1.38) / 2 / tg, cj.w * (J.vert ? 1.06 : 1.22) / 2 / (tg * camera.aspect));
      const ventanaD = Math.max(J.PH * (J.vert ? 1.36 : 1.24) / 2 / tg, J.PW * (J.vert ? 1.02 : 1.1) / 2 / (tg * camera.aspect)), cerca = ventanaD * 0.68;
      const a = ease(SS.a);
      const mx = lerp(lerp(0, SS.x, z), cj.x, a) + PX.x * 0.12, my = lerp(lerp(-J.PH * (J.vert ? 0.125 : 0.06), SS.y, z), cj.y - cj.h * 0.07, a) + PX.y * 0.08;
      camera.position.set(mx, my, lerp(lerp(ventanaD, cerca, z), aparatoD, a) * (1 - Math.sin(T * 0.3) * 0.008));
      camera.lookAt(mx, my, 0);""" + s[b:]

    # ── "Ver en acción" del V1 ─────────────────────────────────────────────────
    rep("AL3D.ambiente(scene, { z:-4.5, y:-0.85 });\nAL3D.piso(scene, { y:-3.95 });",
        "scene.fog = null;   // propuesta: sin sala blanca; fondo degradado de la página")
    a = s.index("const TOMAS = [\n  { p0:V3(-2.8, 0.9, 9.6)")
    b = s.index("function camara(t){", a)
    c = s.index("\n}\n", b) + 3
    s = s[:a] + """const TOMAS = [
  { p0:V3(-5.2, 2.4, 8.4), c:V3(-1.4, 0.2, 7.4), p1:V3(3.4, -0.5, 9.6), m0:V3(-0.6, -0.5, -1.2), m1:V3(0.2, -0.8, -1.2) },   // El problema: travelling en diagonal entre las fichas
  { p0:V3(2.4, 3.6, 8.2),  c:V3(1.4, 1.8, 9.8),  p1:V3(0.2, 0.2, 10.0), m0:V3(-0.2, -0.9, 0),  m1:V3(-0.3, -0.7, 0) },     // Conecta: grúa que baja hasta la tabla
  { p0:V3(-1.6, -1.8, 7.6), c:V3(-0.2, -1.4, 8.4), p1:V3(0.6, -0.9, 9.0), m0:V3(0, -1.0, 0),   m1:V3(0, -1.0, 0.4) },     // Ejecuta: entra bajo y sube con el panel
  { p0:V3(6.0, -3.4, 6.2), c:V3(5.2, -2.2, 8.8),  p1:V3(2.4, -1.8, 9.4), m0:V3(-0.3, -1.1, 0), m1:V3(-0.3, -1.1, 0) },     // Matching: órbita lateral baja
  { p0:V3(-4.4, 1.4, 7.8), c:V3(-3.0, 0.6, 9.4),  p1:V3(-0.9, 0.1, 9.0), m0:V3(0, -1.2, 0),    m1:V3(0, -1.3, 0) },       // Revisa: barrido desde la izquierda
  { p0:V3(0, -0.5, 8.2),   c:V3(0.6, 1.4, 10.8),  p1:V3(1.4, 0.8, 13.0), m0:V3(0, -0.85, 0.5), m1:V3(0.2, -0.9, 0.5) }    // Resultado: se aleja y sube, revela todo
];
const _p = V3(0, 0, 0), _m = V3(0, 0, 0), _pp = V3(0, 0, 0), _mp = V3(0, 0, 0), _mid = V3(0, 0, 0);
function bez(a, c, b, u, out){ const k = 1 - u; return out.set(k*k*a.x + 2*k*u*c.x + u*u*b.x, k*k*a.y + 2*k*u*c.y + u*u*b.y, k*k*a.z + 2*k*u*c.z + u*u*b.z); }
function toma(i, u, pos, mira){ const k = TOMAS[i], e = ease(u); bez(k.p0, k.c, k.p1, e, pos); mira.lerpVectors(k.m0, k.m1, e); }
function camara(t){
  const i = stepOf(t), s = STEPS[i];
  toma(i, (t - s.a) / (s.b - s.a), _p, _m);
  // entre pasos la cámara viaja en arco: sube y se aleja a mitad de camino, como un dron
  const b = ease((t - s.a) / 1.4);
  if (b < 1) {
    toma((i + STEPS.length - 1) % STEPS.length, 1, _pp, _mp);
    _mid.copy(_pp).add(_p).multiplyScalar(0.5); _mid.y += 1.8; _mid.z += 2.4;
    bez(_pp, _mid, _p.clone(), b, _p); _m.lerpVectors(_mp, _m, b);
  }
  camera.position.set(_p.x + PX.x*1.15 + Math.sin(t*0.35)*0.12, _p.y + PX.y*0.7 + Math.cos(t*0.3)*0.08, _p.z * zAlto);
  camera.lookAt(_m);
}
""" + s[c:]
    # 6 · la pantalla es una homografía: matrices al día; el cursor y la onda miran a la cámara (la foto es plana)
    rep("    const sombraCard = J.sombraCard;\n", "    const sombraCard = J.sombraCard;\n    J.disp.updateMatrixWorld(true);\n")
    rep("    cursor.position.copy(tmp); cursor.rotation.copy(card.rotation);", "    cursor.position.copy(tmp); cursor.rotation.set(0, 0, 0);")
    rep("ring.rotation.copy(card.rotation);", "ring.rotation.set(0, 0, 0);")
    rep("  const basic = (opts) => new THREE.MeshBasicMaterial(Object.assign({ transparent:true, side:THREE.DoubleSide, depthWrite:false }, opts));",
        "  const basic = (opts) => new THREE.MeshBasicMaterial(Object.assign({ transparent:true, side:THREE.DoubleSide, depthWrite:false, toneMapped:false }, opts));")
    return s
