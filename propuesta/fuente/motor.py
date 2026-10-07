# Cambios al motor de los demos, solo para la copia propuesta/.
# F · estilo "grabación de pantalla pro": las ventanas de cada paso se ven dentro de la pantalla
#     de una foto de estudio (notebook; en el formato vertical, la ventana sola de frente) sobre un fondo degradado de
#     marca; la cámara hace zoom automático hacia el cursor mientras interactúa y se aleja entre pasos.
# El "Ver en acción" del V1 pasa al mismo motor (fuente/v1.js).
APARATO = r"""
  // aparato fotográfico compartido (fuente/foto.js): notebook en horizontal; en vertical, la ventana sola
  // señal dentro de la app: un anillo suave que late donde se va a tocar (la frase del paso va bajo el demo,
  // así no tapa nada de la pantalla)
  function notaPaso(g, i, lt){
    const cf = J.CURSOR[i]; if (!cf || !cf.clicks || !cf.clicks.length) return;
    const ck = cf.clicks[0]; let k0 = cf.keys[0];
    cf.keys.forEach(k => { if (Math.abs(k[0] - ck) < Math.abs(k0[0] - ck)) k0 = k; });
    const a = clamp((lt - (ck - 1.1)) / 0.3) * (1 - clamp((lt - ck) / 0.25)); if (a <= 0) return;
    const p = (lt * 1.6) % 1, r = (J.vert ? 34 : 30) * (1 + p * 0.8);
    g.save(); g.globalAlpha = a * (1 - p) * 0.9; g.strokeStyle = '#3d7fd6'; g.lineWidth = 5;
    g.beginPath(); g.arc(k0[1], k0[2], r, 0, Math.PI * 2); g.stroke(); g.restore();
  }
  // pestañas de la app (barra inferior en el celular), solo en los demos del panel; en los de instalación se
  // ven Drive y Apps Script, que no las tienen
  const MENU = /instala/.test(root.id) ? null : /^ped/.test(root.id) ? ['Pedidos','Catálogo','Reportes','Clientes','Ajustes']
    : /^v2/.test(root.id) ? ['Resumen','Resultados','Sugerencias','Historial','Ajustes'] : ['Resumen','Resultados','Ajustes','Historial','Config.'];
  function aparato(vert, PW, PH){ return alFoto.crear(THREE, scene, { vert, ventana: { w: PW, h: PH }, menu: MENU, anis: ANISO, listo: () => { needsRender = true; } }); }
  // pantalla completa: la tarjeta cubre toda la pantalla del aparato; fuera de su dibujo la textura repite el
  // borde (ClampToEdge), así la barra superior y el fondo de la app llegan de lado a lado sin deformar la letra
  function pantallaCompleta(m, u, PW, PH){
    const geo = new THREE.PlaneGeometry(u.SW, u.SH); geo.translate(-(u.ventanaX || 0), -u.ventanaY, 0);
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

    # 0b · momentos de logro: la insignia de éxito («✓ …») entra con un rebote, una onda que sale de ella y el
    #      check que se dibuja trazo a trazo (el avance lo da la opacidad con que la pinta cada paso)
    rep("  function banner(g, x, y, w, h, label, color = C.ok){ g.fillStyle = color; rr(g, x, y, w, h, h/2); g.fill(); txt(g, label, x + w/2, y + h/2 + 1, 35, 800, '#fff', 'center', w - h*0.7); }",
        """  function banner(g, x, y, w, h, label, color = C.ok){
    const a = g.globalAlpha, p = Math.min(1, a), cx = x + w/2, cy = y + h/2, pop = p < 1 ? 1 + Math.sin(p * Math.PI) * 0.07 : 1;
    g.save(); g.translate(cx, cy); g.scale(pop, pop); g.translate(-cx, -cy);
    if (p < 1) { const e = p * 28; g.globalAlpha = a * (1 - p) * 0.55; g.strokeStyle = color; g.lineWidth = 6; rr(g, x - e, y - e, w + 2*e, h + 2*e, h/2 + e); g.stroke(); g.globalAlpha = a; }
    g.fillStyle = color; rr(g, x, y, w, h, h/2); g.fill();
    if (label.indexOf('✓ ') === 0) {
      const s = label.slice(2), maxW = w - h*0.7 - 44; let size = 35; g.font = '800 ' + size + 'px ' + FONT;
      while (size > 14 && g.measureText(s).width > maxW) { size -= 1; g.font = '800 ' + size + 'px ' + FONT; }
      const tw = g.measureText(s).width, kx = cx - tw/2 - 14, k = size / 35, q = p < 1 ? p : 1;
      const P = [[kx - 13*k, cy + 1*k], [kx - 4*k, cy + 10*k], [kx + 13*k, cy - 9*k]], l1 = Math.hypot(9, 9), l2 = Math.hypot(17, 19), t = q * (l1 + l2);
      g.strokeStyle = '#fff'; g.lineWidth = 6*k; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(P[0][0], P[0][1]);
      if (t <= l1) g.lineTo(P[0][0] + (P[1][0] - P[0][0]) * t / l1, P[0][1] + (P[1][1] - P[0][1]) * t / l1);
      else { g.lineTo(P[1][0], P[1][1]); const u = (t - l1) / l2; g.lineTo(P[1][0] + (P[2][0] - P[1][0]) * u, P[1][1] + (P[2][1] - P[1][1]) * u); }
      g.stroke();
      txt(g, s, cx + 18, cy + 1, size, 800, '#fff', 'center', maxW);
    } else txt(g, label, cx, cy + 1, 35, 800, '#fff', 'center', w - h*0.7);
    g.restore();
  }""")

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
      c.m.position.set(sx * (J.disp.userData.marco ? 0 : J.disp.userData.pleno ? 0.25 : 1) + (J.disp.userData.ventanaX || 0), J.disp.userData.ventanaY || 0, dist === 0 ? 0.004 : 0.002);
      if (dist === 0 && J.disp.userData.marco && J.tonoPaso !== i && t - s.a > 0.2) { J.tonoPaso = i; J.disp.userData.marco.tono(c.g); }   // barra de estado según la app (una vez por paso: leer píxeles es caro en Safari)
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
    # 9 · el tiempo del demo corre al ritmo real aunque el equipo dibuje menos cuadros (antes, con pocos
    #     cuadros por segundo, el celular lo mostraba en cámara lenta)
    rep("    const dt = Math.min(0.05, (now - last) / 1000); last = now;\n    if (PX.update(dt)) needsRender = true;\n    const mueve = L.tick(dt, visible);",
        "    const dt = Math.min(0.12, (now - last) / 1000); last = now;\n    if (PX.update(dt)) needsRender = true;\n    const mueve = L.tick(dt, visible);")
    # 10 · App de Pedidos, diseño vertical en celular y tablet: el catálogo y el pedido del cliente a pantalla
    #      completa (la pantalla ya es la de un teléfono: no se dibuja otro adentro); sin etiquetas flotantes
    rep("    const cel = (g, top = 18) => { g.clearRect(0, 0, CW, CH); g.fillStyle = '#f4f7fb'; rr(g, 0, 0, CW, CH, 34); g.fill(); return celular(g, 150 + (top - 18)*0.25, top, 500 - (top - 18)*0.5, 982 - top); };\n    const flota = (g, x, y, s, ink, size, h, align) => {",
        "    const TELEFONO = !!(window.alFoto && alFoto.tactil());   // propuesta: en celular y tablet, a pantalla completa\n"
        "    const cel = (g, top = 18) => { g.clearRect(0, 0, CW, CH); if (TELEFONO) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, CW, CH); return { x: 48, y: 82, w: CW - 96, h: CH - 110 }; } g.fillStyle = '#f4f7fb'; rr(g, 0, 0, CW, CH, 34); g.fill(); return celular(g, 150 + (top - 18)*0.25, top, 500 - (top - 18)*0.5, 982 - top); };\n"
        "    const flota = (g, x, y, s, ink, size, h, align) => { if (TELEFONO) return;")
    # 11 · celular vertical: la app se dibuja más alta, con la altura de la pantalla del teléfono (alFoto.estirar).
    #      El lienzo se estira solo en alto; el texto y los círculos se dibujan compensados, así conservan su forma.
    rep("    const CW = vert ? 800 : 1200, CH = vert ? 1000 : 950, PW = vert ? 3.84 : 4.8, PH = PW * CH / CW;",
        "    const CW = vert ? 800 : 1200, CH = vert ? 1000 : 950, PW = vert ? 3.84 : 4.8, K = alFoto.estirar(vert, !!MENU), PH = PW * CH / CW * K;")
    rep("      return { m, sh, g:null, tx:null, cv:null, CW, CH };", "      return { m, sh, g:null, tx:null, cv:null, CW, CH, K };")
    rep("    c.cv = document.createElement('canvas'); c.cv.width = c.CW * TEX_S; c.cv.height = c.CH * TEX_S;\n    c.g = c.cv.getContext('2d'); c.g.scale(TEX_S, TEX_S);",
        "    c.cv = document.createElement('canvas'); c.cv.width = c.CW * TEX_S; c.cv.height = Math.round(c.CH * TEX_S * (c.K || 1));\n"
        "    c.g = c.cv.getContext('2d'); c.g.scale(TEX_S, TEX_S * (c.K || 1));\n"
        "    if (c.K > 1) {   // propuesta: lienzo estirado en alto; el texto y los círculos, compensados\n"
        "      const g = c.g, k = c.K, ft = g.fillText.bind(g), st = g.strokeText.bind(g);\n"
        "      g.fillText = (s, x, y, w) => { g.save(); g.translate(x, y); g.scale(1, 1 / k); w == null ? ft(s, 0, 0) : ft(s, 0, 0, w); g.restore(); };\n"
        "      g.strokeText = (s, x, y, w) => { g.save(); g.translate(x, y); g.scale(1, 1 / k); w == null ? st(s, 0, 0) : st(s, 0, 0, w); g.restore(); };\n"
        "      g.arc = (x, y, r, a0, a1, ccw) => g.ellipse(x, y, r, r / k, 0, a0, a1, !!ccw);\n"
        "    }")
    return s
