# Cambios al motor de los demos, solo para la copia propuesta/.
# F · estilo "grabación de pantalla pro": las ventanas de cada paso se ven dentro de la pantalla
#     de una foto de estudio (notebook; en el formato vertical, la ventana sola de frente) sobre un fondo degradado de
#     marca; la cámara hace zoom automático hacia el cursor mientras interactúa y se aleja entre pasos.
# Además: tomas de cine en "Ver en acción" del V1 (curvas y viajes en arco), sobre el mismo fondo.
APARATO = r"""
  // aparato fotográfico compartido (fuente/foto.js): notebook en horizontal; en vertical, la ventana sola
  function aparato(vert, PW, PH){ return alFoto.crear(THREE, scene, { vert, ventana: { w: PW, h: PH }, anis: ANISO, listo: () => { needsRender = true; } }); }
  // pantalla completa: la tarjeta cubre toda la pantalla del aparato; fuera de su dibujo la textura repite el
  // borde (ClampToEdge), así la barra superior y el fondo de la app llegan de lado a lado sin deformar la letra
  function pantallaCompleta(m, u, PW, PH){
    const geo = new THREE.PlaneGeometry(u.SW, u.SH); geo.translate(0, -u.ventanaY, 0);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / PW + 0.5, p.getY(i) / PH + 0.5);
    m.geometry.dispose(); m.geometry = geo;
  }"""
import os
FOTO_JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'foto.js'), encoding='utf-8').read()

def aplicar(s):
    s = s.replace('</head>', '<script>\n' + FOTO_JS + '</script>\n</head>', 1)
    def rep(a, b, n=1):
        nonlocal s
        c = s.count(a); assert c == n, (c, a[:90]); s = s.replace(a, b)

    # 0 · con aparato fotográfico la ventana va a pantalla completa: su fondo sin esquinas redondeadas ni borde
    rep("  function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }\n  function txt(",
        "  const PLENO = !!(window.alFoto && alFoto.elegir(CH > CW));   // propuesta: app a pantalla completa\n"
        "  function rr(g,x,y,w,h,r){ if (PLENO && !x && !y && w === CW && h === CH) r = 0; g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }\n  function txt(")
    rep("    g.strokeStyle = C.line; g.lineWidth = 4; rr(g, 2, 2, CW - 4, CH - 4, 32); g.stroke();",
        "    if (!PLENO) { g.strokeStyle = C.line; g.lineWidth = 4; rr(g, 2, 2, CW - 4, CH - 4, 32); g.stroke(); }")

    # ── motor de tarjetas ──────────────────────────────────────────────────────
    # 1 · sin sala blanca ni niebla: el fondo lo pone la página (degradado)
    rep("  AL3D.ambiente(scene, { z:-4.5 });\n  AL3D.piso(scene, { y:-2.35 });",
        "  scene.fog = null;   // propuesta: sin sala; el fondo degradado lo pone la página\n"
        "  const SS = { z: 0, x: 0, y: 0, a: 1 };   // zoom automático (como Screen Studio): z = acercamiento al cursor, a = vista del aparato completo\n"
        + APARATO)
    # 2 · cada formato (horizontal / vertical) arma su aparato y lo muestra al usarse
    rep("    const sombraCard = AL3D.sombra(scene, PW*1.1, 1.6); sombraCard.visible = false;\n    return { vert, CW, CH, PW, PH, DRAW, CURSOR, cards, sombraCard };",
        "    const sombraCard = AL3D.sombra(scene, PW*1.1, 1.6); sombraCard.visible = false;\n    const disp = aparato(vert, PW, PH);\n    cards.forEach(c => { disp.userData.pantalla.add(c.m); disp.userData.pantalla.add(c.sh); c.m.frustumCulled = false; c.m.children.forEach(h => { h.visible = false; }); });   // ventanas planas, sin canto\n"
        "    if (disp.userData.pleno) cards.forEach(c => pantallaCompleta(c.m, disp.userData, PW, PH));\n    return { vert, CW, CH, PW, PH, DRAW, CURSOR, cards, sombraCard, disp };")
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
      c.m.position.set(sx * (J.disp.userData.pleno ? 0.25 : 1), J.disp.userData.ventanaY || 0, dist === 0 ? 0.004 : 0.002);
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
      alFoto.camara(camera, J.disp.userData, SS, { T, dt, ip, lt, quiere, foco: cursor.visible ? cursor.position : null, vent: J.disp.userData.pleno ? { w: J.disp.userData.SW, h: J.disp.userData.SH } : { w: J.PW, h: J.PH }, vert: J.vert, px: PX });""" + s[b:]

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
    # 7 · "Ver en acción" del V1 dentro del aparato del visitante: la escena 3D se dibuja como imagen en la
    #     pantalla (homografía), con su cámara de frente encuadrando el contenido de cada paso para que llene
    #     la pantalla; por fuera va la misma cámara de grabación que en los otros demos
    rep("\n\nfunction resize(){", """

// propuesta: la escena se dibuja en la pantalla de un aparato fotográfico (fuente/foto.js); en celular, directa
const PANT = (() => {
  const fuera = new THREE.Scene(), camF = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  const RTC = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
  const rt = new RTC(2, 2, { format: THREE.RGBAFormat }); if (rt.samples !== undefined) rt.samples = 4; rt.texture.encoding = THREE.sRGBEncoding;
  const disp = {}, st = { z: 0, x: 0, y: 0, a: 1 }, v3 = new THREE.Vector3(), tam = new THREE.Vector2();
  let D = null, vert = false;
  // lo que está a la vista, de frente y llenando la pantalla: se mide en cada cuadro (sin lo desvanecido ni las
  // sombras del piso) y la cámara lo sigue con un resorte suave
  const cb = new THREE.Box3(), caja = new THREE.Box3(), _c = new THREE.Vector3(), _s = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const fuera3 = new Set([sombraTabla, sombraRes, cursor]);
  const tenue = o => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return m && m.opacity < 0.5; };
  let listo = false;
  function encuadrar(dt){
    scene.updateMatrixWorld(true); caja.makeEmpty();
    scene.traverseVisible(o => {
      if (!o.isMesh || fuera3.has(o) || tenue(o) || (o.parent && o.parent.isMesh && tenue(o.parent))) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      caja.union(cb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
    });
    if (!caja.isEmpty()) {
      caja.getCenter(_c); caja.getSize(_s);
      const tg = Math.tan(camera.fov * Math.PI / 360), d = Math.max(_s.y * 1.18 / 2 / tg, _s.x * 1.12 / 2 / (tg * camera.aspect));
      _b.set(_c.x, _c.y, caja.max.z + d);
      if (!listo) { _a.copy(_b); listo = true; } else _a.lerp(_b, 1 - Math.exp(-dt * 2.6));
    }
    camera.position.set(_a.x + PX.x * 0.08, _a.y + PX.y * 0.05, _a.z);
    camera.lookAt(camera.position.x, camera.position.y, _a.z - 10);
  }
  function armar(v){
    const g = alFoto.crear(THREE, fuera, { vert: v, alto: 4, anis: ANISO, listo: () => { needsRender = true; } }), u = g.userData;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(u.SW, u.SH), new THREE.MeshBasicMaterial({ map: rt.texture, alphaMap: u.esquinas, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.renderOrder = 5; m.frustumCulled = false; u.pantalla.add(m);
    u.fondo = u.escritorio(); return g;
  }
  return {
    // devuelve la proporción con que se dibuja la escena: la de la pantalla del aparato, o la del lienzo
    usar(w, h){
      vert = w / h < 1.2;
      if (D) D.visible = false;
      D = alFoto.elegir(vert) ? (disp[vert] || (disp[vert] = armar(vert))) : null;
      if (D) D.visible = true;
      scene.background = D ? D.userData.fondo : null;
      camera.fov = D ? 30 : 35;
      camF.aspect = w / h; camF.updateProjectionMatrix();
      return D ? D.userData.SW / D.userData.SH : w / h;
    },
    dibujar(t, dt){
      if (!D) { renderer.render(scene, camera); return; }
      const u = D.userData;
      encuadrar(dt);
      renderer.getDrawingBufferSize(tam);   // la imagen de la pantalla, con margen para el acercamiento
      const alto = Math.min(2048, Math.round(tam.y * 1.3)), ancho = Math.min(2560, Math.round(alto * u.SW / u.SH));
      if (rt.width !== ancho || rt.height !== alto) rt.setSize(ancho, alto);
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null);
      // el cursor de la corrección manual, llevado al vidrio: la cámara se acerca y lo sigue
      let foco = null;
      if (cursor.visible) { cursor.getWorldPosition(v3).project(camera); v3.set(v3.x * u.SW / 2, v3.y * u.SH / 2, 0); D.updateMatrixWorld(true); u.pantalla.localToWorld(v3); foco = v3; }
      const i = stepOf(t);
      alFoto.camara(camF, u, st, { T: t, dt, ip: i, lt: t - STEPS[i].a, quiere: foco ? 1 : 0, foco, vent: { w: u.SW, h: u.SH }, vert, px: PX });
      renderer.render(fuera, camF);
    }
  };
})();

function resize(){""")
    rep("  camera.aspect = w / h; camera.updateProjectionMatrix();\n  // recuadro más alto que ancho (vertical)",
        "  camera.aspect = PANT.usar(w, h); camera.updateProjectionMatrix();\n  // recuadro más alto que ancho (vertical)")
    rep("updateTable(t, ps.pres); updateCube(t); updateExport(t);\n    renderer.render(scene, camera);",
        "updateTable(t, ps.pres); updateCube(t); updateExport(t);\n    PANT.dibujar(t, dt);")
    return s
