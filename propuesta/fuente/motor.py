# Cambios al motor de los demos, solo para la copia propuesta/.
# F · estilo "grabación de pantalla pro": las ventanas de cada paso se ven dentro de un
#     laptop 3D (teléfono en el formato vertical) sobre un fondo degradado de marca; la
#     cámara hace zoom automático hacia el cursor mientras interactúa y se aleja entre pasos.
# Además: tomas de cine en "Ver en acción" del V1 (curvas y viajes en arco), sobre el mismo fondo.
APARATO = r"""
  // ── aparato 3D (propuesta): laptop de aluminio con reflejos de estudio, o teléfono en el formato vertical ──
  const pmrem = new THREE.PMREMGenerator(renderer);
  // Estudio fotográfico para los reflejos: RoomEnvironment de three.js (MIT, © three.js authors;
  // viene de model-viewer de Google). Es la iluminación de los visores de productos.
  scene.environment = (() => {
    const env = new THREE.Scene(), geo = new THREE.BoxGeometry(); geo.deleteAttribute('uv');
    const sala = new THREE.MeshStandardMaterial({ side: THREE.BackSide }), caja = new THREE.MeshStandardMaterial();
    const luzP = new THREE.PointLight(0xffffff, 5.0, 28, 2); luzP.position.set(0.418, 16.199, 0.3); env.add(luzP);
    const m = (mat, p, r, e) => { const o = new THREE.Mesh(geo, mat); o.position.set(p[0], p[1], p[2]); if (r) o.rotation.set(0, r, 0); o.scale.set(e[0], e[1], e[2]); env.add(o); };
    m(sala, [-0.757, 13.219, 0.717], 0, [31.713, 28.305, 28.591]);
    m(caja, [-10.906, 2.009, 1.846], -0.195, [2.328, 7.905, 4.651]); m(caja, [-5.607, -0.754, -0.758], 0.994, [1.970, 1.534, 3.955]);
    m(caja, [6.167, 0.857, 7.803], 0.561, [3.927, 6.285, 3.687]);   m(caja, [-2.017, 0.018, 6.124], 0.333, [2.002, 4.566, 2.064]);
    m(caja, [2.291, -0.756, -2.621], -0.286, [1.546, 1.552, 1.496]); m(caja, [-2.193, -0.369, -5.547], 0.516, [3.875, 3.487, 2.986]);
    const area = k => { const mm = new THREE.MeshBasicMaterial(); mm.color.setScalar(k); return mm; };
    m(area(50), [-16.116, 14.37, 8.208], 0, [0.1, 2.428, 2.739]); m(area(50), [-16.109, 18.021, -8.207], 0, [0.1, 2.425, 2.751]);
    m(area(17), [14.904, 12.198, -1.832], 0, [0.15, 4.265, 6.331]); m(area(43), [-0.462, 8.89, 14.52], 0, [4.38, 5.441, 0.088]);
    m(area(20), [3.235, 11.486, -12.541], 0, [2.5, 2.0, 0.1]);     m(area(100), [0, 20, 0], 0, [1.0, 0.1, 1.0]);
    const t = pmrem.fromScene(env, 0.04).texture; pmrem.dispose(); return t;
  })();
  // mapeo de tonos de cine para el aparato (la interfaz no lo usa: sus materiales van sin tone mapping)
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  // aluminio cepillado: rugosidad con vetas horizontales finas, para que el metal no se vea de cartón
  const veta = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = 'rgb(120,120,120)'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const y = Math.random() * 512, v = 95 + Math.random() * 60 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.55)'; g.fillRect(0, y, 512, 0.6 + Math.random()); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; })();
  function aparato(vert, PW, PH){
    const g = new THREE.Group(); scene.add(g);
    const alu = new THREE.MeshPhysicalMaterial({ color: 0x9aa3b0, metalness: 1.0, roughness: 0.42, roughnessMap: veta, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 1.0 });
    const aluOsc = new THREE.MeshPhysicalMaterial({ color: 0x4a5260, metalness: 1.0, roughness: 0.45, roughnessMap: veta, envMapIntensity: 0.9 });
    const vidrioNegro = new THREE.MeshPhysicalMaterial({ color: 0x030405, metalness: 0.0, roughness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.03, reflectivity: 0.6, envMapIntensity: 1.2 });
    const tecla = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.0, roughness: 0.75, envMapIntensity: 0.03 });
    const pozo = new THREE.MeshStandardMaterial({ color: 0x1a1f27, metalness: 0.6, roughness: 0.6, envMapIntensity: 0.35 });
    const rr = (w, h, r) => { const x = -w/2, y = -h/2, sh = new THREE.Shape(); sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh; };
    const losa = (w, h, r, d, mat, bisel) => new THREE.Mesh(new THREE.ExtrudeGeometry(rr(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: bisel || 0.02, bevelSize: bisel || 0.02, bevelSegments: 4, curveSegments: 14 }), mat);
    const pantalla = new THREE.Group();   // marco de la pantalla: aquí viven las ventanas de cada paso
    if (vert) {   // teléfono
      const cuerpo = losa(PW + 0.36, PH + 0.46, 0.46, 0.16, alu, 0.05); cuerpo.position.z = -0.21; g.add(cuerpo);
      const frente = losa(PW + 0.22, PH + 0.32, 0.36, 0.01, vidrioNegro, 0.01); frente.position.z = -0.03; g.add(frente);
      const isla = losa(0.9, 0.2, 0.1, 0.01, vidrioNegro, 0.005); isla.position.set(0, PH/2 - 0.04, 0.012); g.add(isla);
      [[-1, 0.9], [-1, 0.45], [1, 0.7]].forEach(([lado, y]) => { const b = losa(0.06, 0.34, 0.03, 0.04, aluOsc, 0.01); b.position.set(lado * (PW/2 + 0.2), y, -0.15); g.add(b); });
      g.add(pantalla); g.userData.base = -(PH + 0.46) / 2;
    } else {      // laptop: tapa inclinada hacia atrás sobre una bisagra, base con teclado y trackpad
      const MENTON = 0.2, INC = 0.13, BX = PW + 1.0, BZ = 3.2;
      const bisagraY = -PH/2 - MENTON;
      const tapa = new THREE.Group(); tapa.position.set(0, bisagraY, 0); tapa.rotation.x = -INC; g.add(tapa);
      const tapaAlu = losa(PW + 0.34, PH + MENTON + 0.2, 0.18, 0.035, alu, 0.02); tapaAlu.position.set(0, (PH + MENTON + 0.2)/2 - 0.03, -0.12); tapa.add(tapaAlu);
      const marco = losa(PW + 0.26, PH + MENTON + 0.12, 0.14, 0.008, vidrioNegro, 0.006); marco.position.set(0, (PH + MENTON + 0.12)/2, -0.028); tapa.add(marco);
      const cam = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), new THREE.MeshStandardMaterial({ color: 0x1b2430, metalness: 0.3, roughness: 0.15 })); cam.position.set(0, PH + MENTON + 0.035, -0.012); tapa.add(cam);
      pantalla.position.set(0, MENTON + PH/2, 0); tapa.add(pantalla);
      const bis = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, PW * 0.78, 24), aluOsc); bis.rotation.z = Math.PI/2; bis.position.set(0, bisagraY - 0.02, -0.06); g.add(bis);
      const base = losa(BX, BZ, 0.22, 0.07, alu, 0.03); base.rotation.x = -Math.PI/2; base.position.set(0, bisagraY - 0.14, 0.02 + BZ/2 - 0.12); g.add(base);
      const topY = bisagraY - 0.14 + 0.07 + 0.03;   // cara superior de la base
      const hueco = new THREE.Mesh(new THREE.PlaneGeometry(BX - 0.7, 1.42), pozo); hueco.rotation.x = -Math.PI/2; hueco.position.set(0, topY + 0.001, 0.92); g.add(hueco);
      // teclado: 5 filas de teclas y la barra espaciadora (una sola malla instanciada)
      const filas = [14, 14, 13, 12, 1], paso = (BX - 0.9) / 14, tg = new THREE.BoxGeometry(paso * 0.82, 0.03, 0.22);
      const total = filas.reduce((a, n) => a + n, 0) + 6, inst = new THREE.InstancedMesh(tg, tecla, total), dm = new THREE.Object3D(); let k = 0;
      filas.forEach((n, f) => {
        for (let i = 0; i < n; i++) {
          const ancho = f === 4 ? 6 : 1, x0 = -(n - 1) * paso / 2 - (f === 4 ? 0 : 0);
          dm.position.set(x0 + i * paso, topY + 0.016, 0.38 + f * 0.27); dm.scale.set(ancho, 1, 1); dm.updateMatrix(); inst.setMatrixAt(k++, dm.matrix);
        }
      });
      [-1, 1].forEach(l => { for (let i = 0; i < 3; i++) { dm.position.set(l * (2.2 + i) * paso, topY + 0.016, 0.38 + 4 * 0.27); dm.scale.set(1, 1, 1); dm.updateMatrix(); inst.setMatrixAt(k++, dm.matrix); } });
      inst.count = k; g.add(inst);
      // sombra suave de la pantalla sobre el teclado y oclusión entre teclas (degradado oscuro junto a la bisagra)
      const sc = document.createElement('canvas'); sc.width = 4; sc.height = 128; const sg = sc.getContext('2d'), sgr = sg.createLinearGradient(0, 0, 0, 128);
      sgr.addColorStop(0, 'rgba(0,0,0,.55)'); sgr.addColorStop(0.5, 'rgba(0,0,0,.18)'); sgr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = sgr; sg.fillRect(0, 0, 4, 128);
      const somb = new THREE.Mesh(new THREE.PlaneGeometry(BX - 0.1, 1.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }));
      somb.rotation.x = -Math.PI/2; somb.position.set(0, topY + 0.035, 0.62); somb.renderOrder = 3; g.add(somb);
      const pad = losa(1.7, 1.05, 0.08, 0.004, new THREE.MeshStandardMaterial({ color: 0x9aa6b8, metalness: 0.7, roughness: 0.22 }), 0.004); pad.rotation.x = -Math.PI/2; pad.position.set(0, topY - 0.002, 2.45); g.add(pad);
      // rejillas de parlantes a los lados del teclado
      const rc = document.createElement('canvas'); rc.width = 64; rc.height = 256; const rg = rc.getContext('2d'); rg.fillStyle = '#1a1f27';
      for (let y = 4; y < 256; y += 8) for (let x = 4; x < 64; x += 8) { rg.beginPath(); rg.arc(x, y, 1.6, 0, 7); rg.fill(); }
      const rej = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(rc), transparent: true, metalness: 0.5, roughness: 0.5 });
      [-1, 1].forEach(l => { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.25), rej); r.rotation.x = -Math.PI/2; r.position.set(l * (BX/2 - 0.22), topY + 0.002, 0.92); g.add(r); });
      const ranura = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.06), aluOsc); ranura.position.set(0, topY - 0.06, 0.02 + BZ - 0.12); g.add(ranura);
      g.userData.base = bisagraY - 0.15;
    }
    // reflejo de vidrio: franja diagonal tenue sobre la pantalla
    const rc2 = document.createElement('canvas'); rc2.width = 256; rc2.height = 256; const rg2 = rc2.getContext('2d');
    const gr = rg2.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, 'rgba(255,255,255,.06)'); gr.addColorStop(0.4, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.13)'); gr.addColorStop(0.6, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.03)');
    rg2.fillStyle = gr; rg2.fillRect(0, 0, 256, 256);
    const brillo = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(rc2), transparent: true, depthWrite: false }));
    brillo.position.z = 0.03; brillo.renderOrder = 15; pantalla.add(brillo);
    g.userData.pantalla = pantalla;
    g.visible = false; return g;
  }"""

def aplicar(s):
    def rep(a, b, n=1):
        nonlocal s
        c = s.count(a); assert c == n, (c, a[:90]); s = s.replace(a, b)

    # ── motor de tarjetas ──────────────────────────────────────────────────────
    # 1 · sin sala blanca ni niebla: el fondo lo pone la página (degradado); luces para el aparato
    rep("  AL3D.ambiente(scene, { z:-4.5 });\n  AL3D.piso(scene, { y:-2.35 });",
        "  scene.fog = null;   // propuesta: sin sala; el fondo degradado lo pone la página\n"
        "  scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x0d1520, 0.15));\n"
        "  { const sol = new THREE.DirectionalLight(0xffffff, 0.8); sol.position.set(-4, 7, 5); scene.add(sol); }\n"
        "  const SS = { z: 0, x: 0, y: 0, t0: 0 };   // estado del zoom automático (como Screen Studio)\n"
        + APARATO)
    # 2 · cada formato (horizontal / vertical) arma su aparato y lo muestra al usarse
    rep("    const sombraCard = AL3D.sombra(scene, PW*1.1, 1.6); sombraCard.visible = false;\n    return { vert, CW, CH, PW, PH, DRAW, CURSOR, cards, sombraCard };",
        "    const sombraCard = AL3D.sombra(scene, PW*1.4, 2.6); sombraCard.visible = false;\n    const disp = aparato(vert, PW, PH);\n    cards.forEach(c => { disp.userData.pantalla.add(c.m); disp.userData.pantalla.add(c.sh); });\n    return { vert, CW, CH, PW, PH, DRAW, CURSOR, cards, sombraCard, disp };")
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
        sombraCard.position.set(0, J.disp.userData.base - 0.02, J.vert ? 0 : 1.5);
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
    # 6 · la pantalla del laptop está inclinada: matrices al día, y cursor y onda siguen su orientación real
    rep("    const sombraCard = J.sombraCard;\n", "    const sombraCard = J.sombraCard;\n    J.disp.updateMatrixWorld(true);\n")
    rep("    cursor.position.copy(tmp); cursor.rotation.copy(card.rotation);", "    cursor.position.copy(tmp); card.getWorldQuaternion(cursor.quaternion);")
    rep("ring.rotation.copy(card.rotation);", "card.getWorldQuaternion(ring.quaternion);")
    rep("  const basic = (opts) => new THREE.MeshBasicMaterial(Object.assign({ transparent:true, side:THREE.DoubleSide, depthWrite:false }, opts));",
        "  const basic = (opts) => new THREE.MeshBasicMaterial(Object.assign({ transparent:true, side:THREE.DoubleSide, depthWrite:false, toneMapped:false }, opts));")
    return s
