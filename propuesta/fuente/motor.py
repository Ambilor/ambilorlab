# Cambios al motor de los demos, solo para la copia propuesta/.
# F · estilo "grabación de pantalla pro": las ventanas de cada paso se ven dentro de un
#     laptop 3D (teléfono en el formato vertical) sobre un fondo degradado de marca; la
#     cámara hace zoom automático hacia el cursor mientras interactúa y se aleja entre pasos.
# Además: tomas de cine en "Ver en acción" del V1 (curvas y viajes en arco), sobre el mismo fondo.
def aplicar(s):
    def rep(a, b, n=1):
        nonlocal s
        c = s.count(a); assert c == n, (c, a[:90]); s = s.replace(a, b)

    # ── motor de tarjetas ──────────────────────────────────────────────────────
    # 1 · sin sala blanca ni niebla: el fondo lo pone la página (degradado); luces para el aparato
    rep("  AL3D.ambiente(scene, { z:-4.5 });\n  AL3D.piso(scene, { y:-2.35 });",
        "  scene.fog = null;   // propuesta: sin sala; el fondo degradado lo pone la página\n"
        "  scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x0d1520, 0.55));\n"
        "  { const sol = new THREE.DirectionalLight(0xffffff, 0.65); sol.position.set(-3, 5, 6); scene.add(sol); }\n"
        "  const SS = { z: 0, x: 0, y: 0, t0: 0 };   // estado del zoom automático (como Screen Studio)\n"
        "  function aparato(vert, PW, PH){\n"
        "    const g = new THREE.Group(); scene.add(g);\n"
        "    const metal = new THREE.MeshStandardMaterial({ color: 0x1c2431, metalness: 0.6, roughness: 0.38 }), cubierta = new THREE.MeshStandardMaterial({ color: 0x161d28, metalness: 0.5, roughness: 0.45 });\n"
        "    const negro = new THREE.MeshBasicMaterial({ color: 0x07090d });\n"
        "    const rr = (w, h, r) => { const x = -w/2, y = -h/2, sh = new THREE.Shape(); sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh; };\n"
        "    const caja = (w, h, r, d, mat) => { const geo = new THREE.ExtrudeGeometry(rr(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 10 }); return new THREE.Mesh(geo, mat); };\n"
        "    if (vert) {   // teléfono\n"
        "      const cuerpo = caja(PW + 0.34, PH + 0.42, 0.42, 0.16, metal); cuerpo.position.z = -0.2; g.add(cuerpo);\n"
        "      const vidrio = caja(PW + 0.2, PH + 0.28, 0.34, 0.01, negro); vidrio.position.z = -0.035; g.add(vidrio);\n"
        "      const isla = caja(0.9, 0.18, 0.09, 0.01, negro); isla.position.set(0, PH/2 - 0.02, 0.012); g.add(isla);\n"
        "      g.userData.base = -(PH + 0.42) / 2;\n"
        "    } else {      // laptop\n"
        "      const tapa = caja(PW + 0.36, PH + 0.44, 0.16, 0.08, metal); tapa.position.set(0, 0.03, -0.14); g.add(tapa);\n"
        "      const marco = caja(PW + 0.24, PH + 0.32, 0.12, 0.01, negro); marco.position.set(0, 0.03, -0.035); g.add(marco);\n"
        "      const cam = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), new THREE.MeshBasicMaterial({ color: 0x1d2633 })); cam.position.set(0, PH/2 + 0.11, -0.02); g.add(cam);\n"
        "      const base = new THREE.Mesh(new THREE.BoxGeometry(PW + 1.0, 0.1, 3.1), cubierta); base.position.set(0, -PH/2 - 0.21, 1.42); g.add(base);\n"
        "      const teclas = new THREE.Mesh(new THREE.PlaneGeometry(PW + 0.2, 1.3), new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 0.6 })); teclas.rotation.x = -Math.PI/2; teclas.position.set(0, -PH/2 - 0.155, 0.95); g.add(teclas);\n"
        "      const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), new THREE.MeshStandardMaterial({ color: 0x2c3646, metalness: 0.4, roughness: 0.25 })); pad.rotation.x = -Math.PI/2; pad.position.set(0, -PH/2 - 0.155, 2.25); g.add(pad);\n"
        "      g.userData.base = -PH/2 - 0.26;\n"
        "    }\n"
        "    // reflejo de vidrio: una franja diagonal muy tenue sobre la pantalla\n"
        "    const rc = document.createElement('canvas'); rc.width = 256; rc.height = 256; const rg = rc.getContext('2d');\n"
        "    const gr = rg.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.16)'); gr.addColorStop(0.58, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.05)');\n"
        "    rg.fillStyle = gr; rg.fillRect(0, 0, 256, 256);\n"
        "    const brillo = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(rc), transparent: true, depthWrite: false }));\n"
        "    brillo.position.z = 0.03; brillo.renderOrder = 15; g.add(brillo);\n"
        "    g.visible = false; return g;\n"
        "  }")
    # 2 · cada formato (horizontal / vertical) arma su aparato y lo muestra al usarse
    rep("    const sombraCard = AL3D.sombra(scene, PW*1.1, 1.6); sombraCard.visible = false;\n    return { vert, CW, CH, PW, PH, DRAW, CURSOR, cards, sombraCard };",
        "    const sombraCard = AL3D.sombra(scene, PW*1.4, 2.6); sombraCard.visible = false;\n    const disp = aparato(vert, PW, PH);\n    return { vert, CW, CH, PW, PH, DRAW, CURSOR, cards, sombraCard, disp };")
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
      if (dist === 0) {
        sombraCard.visible = true;
        sombraCard.position.set(0, J.disp.userData.base - 0.02, J.vert ? 0 : 1.2);
        sombraCard.material.opacity = 0.85;
      }
""" + s[b:]
    # 4 · cámara estilo Screen Studio: vista general del aparato en tres cuartos; mientras el cursor
    #     trabaja, zoom suave (≈1,9x) que lo sigue; entre pasos se aleja
    a = s.index("      const ip = stepOf(T), sp = STEPS[ip], lt = T - sp.a, lado = ip % 2 ? -1 : 1;")
    b = s.index("      camera.lookAt(bx*0.3 + fx, by*0.4 + fy, 0);", a) + len("      camera.lookAt(bx*0.3 + fx, by*0.4 + fy, 0);")
    s = s[:a] + """      const ip = stepOf(T), sp = STEPS[ip], lt = T - sp.a;
      const cf = J.CURSOR[ip];
      let quiere = 0;
      if (cf && cursor.visible) { const k = cf.keys; quiere = clamp((lt - k[0][0] + 0.15) / 0.35) * (1 - clamp((lt - k[k.length - 1][0] - 0.9) / 0.4)); }
      const kz = 1 - Math.exp(-dt * 3.2), kp = 1 - Math.exp(-dt * 4.5);
      SS.z += (quiere - SS.z) * kz;
      if (cursor.visible) {   // el encuadre sigue al cursor sin salirse de la pantalla del aparato
        const lx = J.PW / 2 - (J.vert ? 0.9 : 1.25), ly = J.PH / 2 - (J.vert ? 1.1 : 0.95);
        SS.x += (clamp(cursor.position.x, -lx, lx) - SS.x) * kp; SS.y += (clamp(cursor.position.y, -ly, ly) - SS.y) * kp;
      }
      const z = ease(SS.z), Zb = (J.vert ? zV * 1.12 : 9.55 * 1.06), dist = lerp(Zb, Zb * 0.52, z);
      const ang = lerp(0.2, 0.05, z) * (J.vert ? 0.6 : 1), alt = lerp(J.vert ? 0.1 : 0.42, 0.04, z);
      const mx = lerp(0, SS.x, z), my = lerp(J.vert ? 0 : -0.25, SS.y, z);
      camera.position.set(mx + Math.sin(ang) * dist + PX.x * 0.8, my + alt * dist * 0.18 + PX.y * 0.5 + Math.sin(T * 0.4) * 0.03, Math.cos(ang) * dist);
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
    return s
