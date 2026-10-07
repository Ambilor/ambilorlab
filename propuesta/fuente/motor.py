# Cambios al motor de los demos, solo para la copia propuesta/.
# F · estilo "grabación de pantalla pro": las ventanas de cada paso se ven dentro de la pantalla
#     de una foto de estudio (notebook; en el formato vertical, la ventana sola de frente) sobre un fondo degradado de
#     marca; la cámara hace zoom automático hacia el cursor mientras interactúa y se aleja entre pasos.
# El "Ver en acción" del V1 pasa al mismo motor (fuente/v1.js).
APARATO = r"""
  // aparato fotográfico compartido (fuente/foto.js): notebook en horizontal; en vertical, la ventana sola
  // nota dentro de la app (fuente/notas.js): burbuja junto al primer toque del paso, o arriba si no hay toque
  function notaPaso(g, i, lt){
    const N = window.AL_NOTAS && AL_NOTAS[root.id]; if (!N || !N[i]) return;
    const CW = J.CW, CH = J.CH, cf = J.CURSOR[i], dur = STEPS[i].b - STEPS[i].a;
    let ax = CW / 2, ay = 96, t0 = 0.3, abajo = true;
    if (cf && cf.clicks && cf.clicks.length) {
      const ck = cf.clicks[0]; let mejor = cf.keys[0];
      cf.keys.forEach(k => { if (Math.abs(k[0] - ck) < Math.abs(mejor[0] - ck)) mejor = k; });
      ax = mejor[1]; ay = mejor[2]; t0 = Math.max(0.2, ck - 0.8); abajo = ay < 300;
    }
    const a = clamp((lt - t0) / 0.3) * (1 - clamp((lt - (dur - 0.5)) / 0.3)); if (a <= 0) return;
    let f = J.vert ? 30 : 27; const fam = '600 ' + f + 'px Inter, -apple-system, sans-serif';
    g.save(); g.font = fam; let w = g.measureText(N[i]).width + 48;
    while (w > CW - 48 && f > 18) { f -= 1; g.font = '600 ' + f + 'px Inter, -apple-system, sans-serif'; w = g.measureText(N[i]).width + 48; }
    const h = f * 2.1, bx = Math.max(24, Math.min(CW - 24 - w, ax - w / 2)), by = abajo ? ay + 44 : ay - 44 - h, px = Math.max(bx + 26, Math.min(bx + w - 26, ax));
    const e = 0.9 + 0.1 * ease(clamp((lt - t0) / 0.35));
    g.globalAlpha = a; g.translate(px, abajo ? by : by + h); g.scale(e, e); g.translate(-px, -(abajo ? by : by + h));
    g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
    const r = 16; g.beginPath(); g.moveTo(bx + r, by); g.arcTo(bx + w, by, bx + w, by + h, r); g.arcTo(bx + w, by + h, bx, by + h, r); g.arcTo(bx, by + h, bx, by, r); g.arcTo(bx, by, bx + w, by, r); g.closePath();
    g.fillStyle = 'rgba(28,28,30,.93)'; g.fill(); g.shadowColor = 'transparent';
    g.beginPath(); if (abajo) { g.moveTo(px - 12, by); g.lineTo(px, by - 12); g.lineTo(px + 12, by); } else { g.moveTo(px - 12, by + h); g.lineTo(px, by + h + 12); g.lineTo(px + 12, by + h); } g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(N[i], bx + w / 2, by + h / 2 + 1);
    g.restore();
  }
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
V1_JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'v1.js'), encoding='utf-8').read()
NOTAS_JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'notas.js'), encoding='utf-8').read()
FOTO_JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'foto.js'), encoding='utf-8').read()

def aplicar(s):
    s = s.replace('</head>', '<script>\n' + FOTO_JS + NOTAS_JS + '</script>\n</head>', 1)
    def rep(a, b, n=1):
        nonlocal s
        c = s.count(a); assert c == n, (c, a[:90]); s = s.replace(a, b)

    # 0 · con aparato fotográfico la ventana va a pantalla completa: su fondo sin esquinas redondeadas ni borde
    rep("  function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }\n  function txt(",
        "  const PLENO = !!(window.alFoto && (alFoto.elegir(CH > CW) || alFoto.tactil()));   // propuesta: app a pantalla completa (en el notebook, o en celular y tablet)\n"
        "  function rr(g,x,y,w,h,r){ if (PLENO && !x && !y && w === CW && h === CH) r = 0; g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }\n  function txt(")
    # en celular y tablet el formato lo decide la orientación del equipo (no la medida del cuadro)
    rep("    usar(w / h < 1.2);   // el diseño sigue la forma del recuadro: así la tarjeta siempre llena su marco",
        "    usar(alFoto.tactil() ? matchMedia('(orientation: portrait)').matches : w / h < 1.2);   // propuesta: en táctil, la orientación del equipo")
    rep("  const cursorGeo = new THREE.PlaneGeometry(0.24, 0.31); cursorGeo.translate(0.12, -0.155, 0);",
        "  const DEDO = alFoto.tactil();   // propuesta: en celular y tablet se toca con el dedo, no hay flecha\n"
        "  const cursorGeo = DEDO ? new THREE.PlaneGeometry(0.36, 0.36) : new THREE.PlaneGeometry(0.24, 0.31); if (!DEDO) cursorGeo.translate(0.12, -0.155, 0);")
    rep("  const cursor = new THREE.Mesh(cursorGeo, basic({ map:ctex })); cursor.renderOrder = 20; scene.add(cursor);",
        "  const cursor = new THREE.Mesh(cursorGeo, basic({ map: DEDO ? alFoto.dedo(THREE) : ctex })); cursor.renderOrder = 20; scene.add(cursor);")
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
      J.DRAW[i](c.g, Math.max(0, t - s.a)); if (dist === 0) notaPaso(c.g, i, Math.max(0, t - s.a)); c.tx.needsUpdate = true;
      const e = ease(ein), sx = dist === 0 ? (1 - e) * 0.35 : -ease(sale) * 0.35;
      c.m.position.set(sx * (J.disp.userData.marco ? 0 : J.disp.userData.pleno ? 0.25 : 1), J.disp.userData.ventanaY || 0, dist === 0 ? 0.004 : 0.002);
      if (dist === 0 && J.disp.userData.marco) J.disp.userData.marco.tono(c.g);   // barra de estado: blanca u oscura según la app
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

    # 6 · la pantalla es una homografía: matrices al día; el cursor y la onda miran a la cámara (la foto es plana)
    rep("    const sombraCard = J.sombraCard;\n", "    const sombraCard = J.sombraCard;\n    J.disp.updateMatrixWorld(true);\n")
    rep("    cursor.position.copy(tmp); cursor.rotation.copy(card.rotation);", "    cursor.position.copy(tmp); cursor.rotation.set(0, 0, 0);")
    rep("ring.rotation.copy(card.rotation);", "ring.rotation.set(0, 0, 0);")
    rep("  const basic = (opts) => new THREE.MeshBasicMaterial(Object.assign({ transparent:true, side:THREE.DoubleSide, depthWrite:false }, opts));",
        "  const basic = (opts) => new THREE.MeshBasicMaterial(Object.assign({ transparent:true, side:THREE.DoubleSide, depthWrite:false, toneMapped:false }, opts));")
    # ── "Ver en acción" del V1 ─────────────────────────────────────────────────
    # 7 · pasa al motor de tarjetas (fuente/v1.js): pantallas planas como se usa de verdad (hoja, panel y
    #     cursor), en vez de la escena 3D con partidas flotando, que en la copia ya no se inicia
    rep("var root = document.getElementById('ver-en-accion');\nif (!root) return;",
        "var root = null;   // propuesta: el V1 usa el motor de tarjetas (fuente/v1.js)\nif (!root) return;")
    rep("  const r1 = document.getElementById('como-se-instala');\n  if (r1 && v1i && window.alDemoTarjetas) alDemoTarjetas(r1, v1i);",
        V1_JS + "\n  const r0 = document.getElementById('ver-en-accion');\n  if (r0 && window.alDemoTarjetas) alDemoTarjetas(r0, AL_DEMOS['ver-en-accion']);\n"
        "  const r1 = document.getElementById('como-se-instala');\n  if (r1 && v1i && window.alDemoTarjetas) alDemoTarjetas(r1, v1i);")
    # 8 · al terminar, el demo se detiene en el último cuadro y muestra el resumen de los pasos (capa.js);
    #     el texto completo queda para el final (y para el modo manual)
    rep("    if (L.playing && visible) { L.T += dt; if (L.T >= DUR) L.T = 0; L.sucio = true; }",
        "    if (L.playing && visible) { L.T += dt; if (L.T >= DUR) { L.T = DUR - 0.001; L.setPlaying(false); root.classList.add('al-demo--fin'); } L.sucio = true; }")
    rep("    if (p && L.T >= DUR - 0.02) L.T = 0;\n", "    if (p && L.T >= DUR - 0.02) L.T = 0;\n    if (p) root.classList.remove('al-demo--fin');\n")
    rep("    L.T = L.playing ? STEPS[i].a + 0.001 : STEPS[i].b - HOLD;\n", "    L.T = L.playing ? STEPS[i].a + 0.001 : STEPS[i].b - HOLD; root.classList.remove('al-demo--fin');\n")
    return s
