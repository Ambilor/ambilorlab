# Recorridos de cámara (propuesta E): cambios al motor de los demos, solo en la copia.
def aplicar(s):
    def rep(a, b, n=1):
        nonlocal s
        c = s.count(a); assert c == n, (c, a[:90]); s = s.replace(a, b)
    # 1 · la línea de tiempo queda accesible para el recorrido guiado por desplazamiento
    rep("  const L = { T: 0, playing: !reduce, current: -1, sucio: true };",
        "  const L = { T: 0, playing: !reduce, current: -1, sucio: true }; root._L = L; L.DUR = DUR; L.STEPS = STEPS;")
    # 2 · motor de tarjetas: pared y piso viajan con la cámara
    rep("  AL3D.ambiente(scene, { z:-4.5 });\n  AL3D.piso(scene, { y:-2.35 });",
        "  const PARED = AL3D.ambiente(scene, { z:-4.5 });\n  const PISO = AL3D.piso(scene, { y:-2.35 });\n"
        "  // Recorrido: cada paso tiene su lugar en un pasillo que se adentra en la escena (zigzag a izquierda y derecha)\n"
        "  const RUTA = i => ({ x: i === 0 ? 0 : (i % 2 ? 1.7 : -1.7), y: 0, z: -i * 5.4, ry: i === 0 ? 0 : (i % 2 ? -0.2 : 0.2) });")
    a = s.index("      const ein = i === 0 ? clamp((t + 0.3) / 0.9) : clamp((t - (s.a - 0.35)) / 0.9);")
    b = s.index("      c.m.updateMatrixWorld();", a)
    s = s[:a] + """      const ein = i === 0 ? clamp((t + 0.3) / 0.9) : clamp((t - (s.a - 0.35)) / 0.9);
      const e = AL3D.rebote(ein);
      const cur = stepOf(t), dist = i - cur;
      const vis = Math.abs(dist) <= 1;   // el paso actual y sus vecinos: el anterior queda atrás, el siguiente espera adelante
      c.m.visible = c.sh.visible = vis;
      if (!vis) { soltarLienzo(c); return; }
      tomarLienzo(c);
      J.DRAW[i](c.g, Math.max(0, t - s.a)); c.tx.needsUpdate = true;
      const cf = J.CURSOR[i], lt = t - s.a;
      let hundir = 0;
      if (cf) cf.clicks.forEach(ck => { const d = lt - ck; if (d >= 0 && d < 0.8) hundir = Math.max(hundir, Math.exp(-7*d) * Math.cos(9*d)); });
      const P = RUTA(i), lado = i % 2 ? 1 : -1;
      c.m.position.set(P.x + (1 - e) * lado * 0.9, P.y - (1 - e) * 0.5, P.z - 0.16*hundir);
      c.m.rotation.set(-0.04 + (1 - e) * 0.12, P.ry + (1 - e) * 0.45 * lado + Math.sin(t*0.5)*0.03*e, 0);
      // el anterior se desvanece mientras la cámara pasa a su lado; el siguiente espera tenue al fondo
      c.m.material.opacity = dist === 0 ? Math.max(0.3, clamp(ein*1.6)) : (dist < 0 ? 0.5 * clamp(1 - (t - STEPS[cur].a + 0.35) / 1.0) : 0.28 + 0.4*clamp(ein*1.6));
      if (dist === 0) {
        sombraCard.visible = true;
        sombraCard.position.set(c.m.position.x, -2.33, c.m.position.z + 0.2);
        sombraCard.material.opacity = 0.8 * c.m.material.opacity;
      }
      c.sh.position.set(c.m.position.x + 0.06, c.m.position.y - 0.08, c.m.position.z - 0.05);
      c.sh.rotation.copy(c.m.rotation);
      c.sh.material.opacity = 0.13 * c.m.material.opacity;
""" + s[b:]
    # 3 · motor de tarjetas: la cámara vuela de un paso al siguiente (arco: sube y se aleja a mitad de camino), gira despacio mientras explica y se acerca a cada clic
    a = s.index("      const ip = stepOf(T), sp = STEPS[ip], lt = T - sp.a, lado = ip % 2 ? -1 : 1;")
    b = s.index("      camera.lookAt(bx*0.3 + fx, by*0.4 + fy, 0);", a) + len("      camera.lookAt(bx*0.3 + fx, by*0.4 + fy, 0);")
    s = s[:a] + """      const ip = stepOf(T), sp = STEPS[ip], lt = T - sp.a;
      const A = RUTA(Math.max(0, ip - 1)), B = RUTA(ip);
      const fl = ip === 0 ? 1 : ease(clamp((lt + 0.35) / 1.3));
      const arco = Math.sin(fl * Math.PI);
      const tx = lerp(A.x, B.x, fl), tz = lerp(A.z, B.z, fl);
      const giro = ((ease(clamp(lt / (sp.b - sp.a))) - 0.5) * 0.24 * (ip % 2 ? -1 : 1) - B.ry * 0.6 * fl) * (J.vert ? 0.5 : 1);
      let fx = 0, fy = 0, f = 0;
      const cf = J.CURSOR[ip];
      if (cf && cursor.visible) {
        cf.clicks.forEach(ck => { f = Math.max(f, clamp(1 - Math.abs(lt - ck) / 0.9)); });
        f = ease(f); fx = (cursor.position.x - tx)*0.55*f; fy = (cursor.position.y - 0.1)*0.55*f;
      }
      const Z = (J.vert ? zV * 1.07 : 9.55) - 0.75*f + arco*2.2;
      camera.position.set(tx + Math.sin(giro)*Z + PX.x*1.05 + fx*0.6, 0.24 + arco*1.1 + Math.sin(T*0.4)*0.06 + PX.y*0.65 + fy*0.6, tz + Math.cos(giro)*Z);
      camera.lookAt(tx + fx, 0.05 + fy - arco*0.25, tz);
      PARED.position.set(Math.round(tx / 3) * 3, PARED.position.y, camera.position.z - 14.05);
      PISO.position.set(Math.round(tx / 3) * 3, PISO.position.y, Math.round((camera.position.z - 12.55) / 3) * 3);""" + s[b:]
    # 4 · demo "Ver en acción" del V1: tomas de cine (curvas, grúas y órbitas) y viajes en arco entre pasos
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
