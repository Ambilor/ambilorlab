/* Propuesta · "Ver en acción" del Conciliador V1 como grabación de pantalla: pantallas planas (motor de
   tarjetas, igual que V2 y PedidoApp) en vez de la escena 3D con partidas flotando. Cada paso se ve como se
   usa de verdad: la hoja de Google Sheets, el panel del complemento y el cursor haciendo cada acción.
   Mismos textos, tiempos y datos de ejemplo que la escena 3D. Un solo dibujo sirve a los dos formatos
   (horizontal 1200×950 y vertical 800×1000): las medidas salen de CW y CH. */
AL_DEMOS['ver-en-accion'] = (function(){
  const DATA = [
    ['03/09','Factura F-101','+500.000'], ['04/09','Pago F-101','-500.000'],
    ['05/09','Honorario B-22','+120.000'], ['06/09','Comisión mantención','-6.200'],
    ['08/09','Factura F-102','+245.000'], ['09/09','Factura F-103','+89.700'],
    ['10/09','Pago F-103','-89.700'], ['11/09','Factura F-104','+410.500'],
    ['12/09','Pago F-102','-245.000'], ['15/09','Honorario B-23','+64.000'],
    ['16/09','Pago F-104','-410.500'], ['17/09','Transf. sin referencia','-64.000']
  ];
  const PAIRS = [[0,1],[4,8],[5,6],[7,10]], MANUAL = [9, 11], PEND = [2, 3, 9, 11];
  const PAR = {}; PAIRS.forEach((p, k) => { PAR[p[0]] = PAR[p[1]] = k; });
  const TABS = ['Resumen','Resultados','Ajustes','Configuración','Historial'];
  const M = 40;
  // medidas de cada formato (las comparten el dibujo y el recorrido del cursor)
  function L(CW, CH){
    const V = CH > CW, W = CW - 2*M;
    return { V, W, CW, CH,
      hojaY: V ? 212 : 196, fila: V ? 58 : 50,                                  // hoja: primera fila y alto de fila
      col: V ? { n: M + 22, f: M + 64, d: M + 168, dW: 300, m: CW - M - 18, e: 0 }
             : { n: M + 22, f: M + 70, d: M + 200, dW: 360, m: M + 740, e: M + 790 },
      imp: V ? { x: M, y: 262, w: W } : { x: M, y: 262, w: 380 },             // Conecta: botón Importar
      ext: V ? { x: M, y: 342, w: W } : { x: M + 400, y: 262, w: 440 },
      arch: V ? 438 : 362, mapY: V ? 540 : 460, mapH: V ? 86 : 74,
      conf: V ? { x: M, y: 832, w: W } : { x: M, y: 742, w: 460 },
      bannerConf: V ? { x: M, y: 914, w: W } : { x: M + 490, y: 742, w: W - 490 },
      ejec: { x: M, y: 250, w: W },                                             // Ejecuta
      revY: V ? 318 : 312, revH: V ? 104 : 90,                                  // Revisa: filas de pendientes
      empa: V ? { x: M, y: 770, w: W } : { x: M, y: 700, w: 420 },
      expo: V ? { x: M, y: 870, w: W } : { x: CW - M - 420, y: 820, w: 420 }
    };
  }
  const centro = r => [r.x + r.w/2, r.y + 32];
  function recorrido(l){
    const y = i => l.hojaY + 52 + i*l.fila, xm = l.col.d + 120;
    const [ix, iy] = centro(l.imp), [cx, cy] = centro(l.conf), [ex, ey] = [l.CW/2, l.ejec.y + 36];
    const rv = k => l.revY + k*l.revH + l.revH/2 - 8, [px, py] = centro(l.empa), [ox, oy] = centro(l.expo);
    const reposo = [l.CW * 0.8, l.CH * 0.92];
    return [
      { keys:[[0.3, xm, y(0)], [1.0, xm, y(5)], [1.25, xm, y(5)], [1.9, xm, y(6)], [2.15, xm, y(6)], [3.0, reposo[0], reposo[1]]], clicks:[1.12, 2.02] },
      { keys:[[0.2, reposo[0], reposo[1]], [0.75, ix, iy], [1.0, ix, iy], [3.0, cx, cy], [3.3, cx, cy], [4.0, reposo[0], reposo[1]]], clicks:[0.88, 3.15] },
      { keys:[[0.1, reposo[0], reposo[1]], [0.75, ex, ey], [1.0, ex, ey], [1.8, reposo[0], reposo[1]]], clicks:[0.88] },
      null,
      { keys:[[0.3, reposo[0], reposo[1]], [1.0, M + 34, rv(2)], [1.25, M + 34, rv(2)], [1.8, M + 34, rv(3)], [2.05, M + 34, rv(3)], [2.7, px, py], [2.95, px, py], [3.7, reposo[0], reposo[1]]], clicks:[1.12, 1.92, 2.82] },
      { keys:[[2.6, reposo[0], reposo[1]], [3.3, ox, oy], [3.6, ox, oy], [4.4, reposo[0], reposo[1]]], clicks:[3.45] }
    ];
  }
  function dibujo(H){
    const { C, CW, CH, clamp, ease, easeOut, lerp, rr, txt, press, btn, base, banner, pill, campo, panelBar, checkDot } = H;
    const l = L(CW, CH), V = l.V, W = l.W;
    const SHEET = '#188038';
    const tinte = (g, y, color, a) => { if (a <= 0) return; g.globalAlpha = a; g.fillStyle = color; g.fillRect(M, y - l.fila/2 + 2, W, l.fila - 4); g.globalAlpha = 1; };
    // hoja de cálculo: barra de fórmulas, letras de columna, encabezados y filas
    function hoja(g, titulo, celda, filas, extra){
      base(g, titulo);
      g.fillStyle = '#f1f4f8'; g.fillRect(4, 78, CW - 8, 52);
      txt(g, celda, M + 8, 104, 24, 700, C.muted); g.fillStyle = C.line; g.fillRect(M + 84, 88, 2, 32);
      txt(g, 'fx', M + 104, 104, 24, 700, C.soft, 'left');
      const y0 = l.hojaY, c = l.col;
      g.fillStyle = '#f6f8fb'; g.fillRect(M, y0 - 52, W, 36);
      ['A','B','C','D'].slice(0, V ? 3 : 4).forEach((k, i) => txt(g, k, [c.f + 30, c.d + 120, c.m - 60, c.e + 90][i], y0 - 34, 20, 700, C.soft, 'center'));
      txt(g, 'Fecha', c.f, y0, 25, 800, C.ink); txt(g, 'Descripción', c.d, y0, 25, 800, C.ink); txt(g, 'Monto', c.m, y0, 25, 800, C.ink, 'right');
      if (!V) txt(g, 'Estado', c.e, y0, 25, 800, C.ink);
      g.fillStyle = C.line; g.fillRect(M, y0 + 24, W, 2);
      filas.forEach((r, i) => {
        const y = y0 + 52 + i*l.fila;
        if (extra) extra(g, i, y);
        txt(g, String(i + 2), c.n, y, 20, 600, C.soft, 'center');
        txt(g, r[0], c.f, y, V ? 24 : 25, 600, C.muted);
        txt(g, r[1], c.d, y, V ? 25 : 26, 600, C.ink, 'left', c.dW);
        txt(g, r[2], c.m, y, V ? 25 : 26, 800, r[2][0] === '-' ? C.muted : C.ink, 'right');
        g.fillStyle = '#e3e9f0'; g.fillRect(M, y + l.fila/2 - 1, W, 1);
      });
    }
    const estado = (g, y, label, fill, ink) => { if (V) pill(g, M + 44, y - 18, label, fill, ink, 18, 30, 'left'); else pill(g, l.col.e, y - 20, label, fill, ink, 21, 38); };
    return [
      // 0 · El problema: la hoja, revisada a mano fila por fila
      (g, lt) => {
        const marca = i => (i === 5 || i === 6) ? easeOut((lt - 1.1 - (i - 5)*0.9) / 0.25) : 0;
        hoja(g, 'Movimientos septiembre', 'B' + (lt < 1.5 ? 7 : 8), DATA, (g, i, y) => {
          const busca = clamp((lt - 0.3) / 0.7) * 5;
          if (Math.abs(i - busca) < 0.6 && lt < 1.3) tinte(g, y, '#dbe8f7', 1);
          tinte(g, y, 'rgba(245,200,76,.45)', marca(i));
        });
        const q = easeOut((lt - 2.2) / 0.3);
        if (q > 0) { g.globalAlpha = q; const y = l.hojaY + 52 + 6*l.fila; pill(g, V ? CW - M - 8 : l.col.e, y - 22, '¿calza con F-103?', '#fdf1e2', C.warn, V ? 20 : 22, V ? 36 : 42, V ? 'right' : 'left'); g.globalAlpha = 1; }
        const r = easeOut((lt - 2.6) / 0.35);
        if (r > 0) { g.globalAlpha = r; pill(g, CW/2, CH - (V ? 80 : 70), '⏱ 2 h 40 min revisando… y quedan 188 filas', C.bad, '#fff', V ? 24 : 28, V ? 50 : 56, 'center'); g.globalAlpha = 1; }
      },
      // 1 · Conecta: importa el .xlsx, detecta las columnas y las confirma
      (g, lt) => {
        base(g, 'Conciliador V1'); panelBar(g, 'Conciliador V1', TABS, 3);
        btn(g, l.imp.x, l.imp.y, l.imp.w, 64, 'Importar .xlsx', 'primary', press(lt, 0.88), 32);
        btn(g, l.ext.x, l.ext.y, l.ext.w, 64, 'Conectar sheet externo', 'secondary', 0, 32);
        const f = easeOut((lt - 1.1) / 0.35);
        if (f > 0) { g.globalAlpha = f; pill(g, M, l.arch, '▦ cartola_septiembre.xlsx · 12 filas', '#e6f2eb', SHEET, V ? 24 : 26, 50); g.globalAlpha = 1; }
        const t = easeOut((lt - 1.5) / 0.3);
        if (t > 0) { g.globalAlpha = t; txt(g, 'Encabezados detectados', M, l.mapY - 30, 30, 800, C.ink); g.globalAlpha = 1; }
        [['Fecha','FECHA'],['Concepto','DESCRIPCION'],['Monto','IMPORTE']].forEach((m, k) => {
          const a = easeOut((lt - 1.7 - k*0.35) / 0.3); if (a <= 0) return;
          const y = l.mapY + k*l.mapH, w = V ? 300 : 340;
          g.globalAlpha = a;
          g.fillStyle = '#f6f8fb'; rr(g, M, y, w, 58, 12); g.fill(); txt(g, m[0], M + 20, y + 30, 28, 700, C.ink);
          txt(g, '→', M + w + 34, y + 30, 32, 800, C.soft, 'center');
          campo(g, M + w + 70, y, V ? W - w - 150 : 380, 58, '', m[1] + ' ▾', false);
          checkDot(g, V ? CW - M - 24 : M + w + 500, y + 29, lt > 1.95 + k*0.35, 1);
          g.globalAlpha = 1;
        });
        btn(g, l.conf.x, l.conf.y, l.conf.w, 64, 'Confirmar columnas', 'primary', press(lt, 3.15), 32);
        const b = easeOut((lt - 3.4) / 0.3);
        if (b > 0) { g.globalAlpha = b; banner(g, l.bannerConf.x, l.bannerConf.y, l.bannerConf.w, 64, '✓ 12 movimientos listos'); g.globalAlpha = 1; }
      },
      // 2 · Ejecuta: un clic en el panel; valida los datos antes de procesar
      (g, lt) => {
        base(g, 'Conciliador V1'); panelBar(g, 'Conciliador V1', TABS, 0);
        btn(g, l.ejec.x, l.ejec.y, l.ejec.w, 72, '▶ Ejecutar conciliación', 'primary', press(lt, 0.88), 36);
        const v = lt > 1.0;
        txt(g, !v ? 'Listo para ejecutar' : (lt < 2.0 ? 'Validando datos…' : '✓ Datos validados'), M, l.ejec.y + 120, 30, 700, lt < 2.0 ? C.soft : C.ok);
        if (v && lt < 2.0) { g.fillStyle = '#e3e9f0'; rr(g, M, l.ejec.y + 150, W, 10, 5); g.fill(); g.fillStyle = C.brand; rr(g, M, l.ejec.y + 150, W * clamp((lt - 1.0) / 1.0), 10, 5); g.fill(); }
        const tiles = [['0%','conciliación', C.ok], ['0','pares', C.ink], ['12','pendientes', C.warn], ['$0','conciliado', C.ink]];
        const tw = V ? (W - 20) / 2 : (W - 60) / 4, th = V ? 150 : 170, ty = l.ejec.y + 190;
        tiles.forEach(([n, s, c], i) => {
          const x = M + (V ? (i % 2) : i) * (tw + 20), y = ty + (V ? Math.floor(i / 2) * (th + 20) : 0);
          g.fillStyle = '#f6f8fb'; rr(g, x, y, tw, th, 20); g.fill();
          txt(g, n, x + 28, y + th*0.42, V ? 56 : 62, 800, c); txt(g, s, x + 28, y + th*0.78, 26, 700, C.muted);
        });
        const y2 = ty + (V ? 2*th + 50 : th + 50);
        txt(g, 'Historial', M, y2, 28, 800, C.ink);
        for (let k = 0; k < 3; k++) { g.fillStyle = '#e3e9f0'; rr(g, M, y2 + 36 + k*44, [W*0.7, W*0.55, W*0.62][k], 14, 7); g.fill(); }
      },
      // 3 · Matching: recorre la hoja y empareja cada movimiento con su contraparte
      (g, lt) => {
        const run = clamp((lt - 0.2) / 3.0);
        hoja(g, 'Movimientos septiembre', 'D2', DATA, (g, i, y) => {
          const k = PAR[i];
          if (k !== undefined) { const a = easeOut((lt - 0.5 - k*0.55) / 0.3); tinte(g, y, 'rgba(47,138,91,.13)', a); if (a > 0) { g.globalAlpha = a; estado(g, y, '✓ Par ' + (k + 1), '#e6f2eb', C.ok); g.globalAlpha = 1; } }
          const barre = (lt - 0.2) / 0.5 % 1 * 12;
          if (lt < 3.2 && Math.abs(i - barre) < 0.5) tinte(g, y, 'rgba(31,92,153,.12)', 1);
        });
        // franja del motor con el contador
        const n = Math.round(3000 * run).toLocaleString('es-CL');
        pill(g, CW/2, CH - (V ? 76 : 66), (run >= 1 ? '✓ ' : '') + n + ' movimientos · ' + (3.0 * run).toFixed(1).replace('.', ',') + ' s', run >= 1 ? C.ok : C.brand, '#fff', V ? 24 : 28, V ? 50 : 56, 'center');
        const k = Math.min(3, Math.floor((lt - 0.5) / 0.55));
        if (k >= 0 && lt < 3.4) { const p = PAIRS[k]; g.globalAlpha = 0.95; pill(g, CW/2, V ? 140 : 136, DATA[p[0]][1] + ' ↔ ' + DATA[p[1]][1] + ' · mismo monto', C.ok, '#fff', V ? 20 : 23, V ? 40 : 44, 'center'); g.globalAlpha = 1; }
      },
      // 4 · Revisa: lo que no calzó; empareja a mano y el ajuste queda guardado
      (g, lt) => {
        base(g, 'Conciliador V1'); panelBar(g, 'Conciliador V1', TABS, 1);
        let x = M; [['Todos (12)', false], ['Pendientes (4)', true], ['Conciliados (8)', false]].forEach(([s, on]) => { x += pill(g, x, 236, s, on ? C.brand : '#eef2f7', on ? '#fff' : C.muted, V ? 21 : 24, 46) + 12; });
        const sel = [lt > 1.12, lt > 1.92], hecho = lt > 3.0;
        PEND.forEach((i, k) => {
          const y = l.revY + k*l.revH, r = DATA[i], man = MANUAL.indexOf(i), h = l.revH - 16;
          const on = man >= 0 && sel[man];
          g.fillStyle = on ? (hecho ? 'rgba(47,138,91,.1)' : '#e8f0fa') : '#f6f8fb'; rr(g, M, y, W, h, 16); g.fill();
          if (on && !hecho) { g.strokeStyle = C.brand; g.lineWidth = 3; rr(g, M, y, W, h, 16); g.stroke(); }
          g.strokeStyle = on ? C.brand : C.line; g.lineWidth = 3; rr(g, M + 22, y + h/2 - 15, 30, 30, 7); g.stroke();
          if (on) { g.fillStyle = C.brand; rr(g, M + 22, y + h/2 - 15, 30, 30, 7); g.fill(); txt(g, '✓', M + 37, y + h/2 + 1, 22, 800, '#fff', 'center'); }
          if (V) { txt(g, r[1], M + 74, y + h*0.34, 27, 700, C.ink, 'left', 380); txt(g, r[0], M + 74, y + h*0.72, 22, 600, C.soft); }
          else { txt(g, r[0], M + 74, y + h/2, 25, 600, C.soft); txt(g, r[1], M + 170, y + h/2, 28, 700, C.ink, 'left', 420); }
          txt(g, r[2], V ? CW - M - 22 : M + 760, V ? y + h*0.34 : y + h/2, 28, 800, C.ink, 'right');
          const ok = man >= 0 && hecho, pop = ok ? 1 + Math.sin(clamp((lt - 3.0) / 0.3) * Math.PI) * 0.1 : 1;
          g.save(); g.translate(V ? CW - M - 22 : CW - M - 24, V ? y + h*0.72 : y + h/2); g.scale(pop, pop);
          pill(g, 0, -19, ok ? '✓ Par manual' : 'Sin par', ok ? C.ok : '#fdf1e2', ok ? '#fff' : C.warn, 21, 38, 'right');
          g.restore();
        });
        btn(g, l.empa.x, l.empa.y, l.empa.w, 64, 'Emparejar a mano', sel[1] ? 'primary' : 'disabled', press(lt, 2.82), 32);
        const b = easeOut((lt - 3.3) / 0.35);
        if (b > 0) { g.globalAlpha = b; const y = l.empa.y + (V ? 90 : 0), x0 = V ? M : M + 450; banner(g, x0, y, V ? W : W - 450, 64, '✓ Guardado para la próxima ejecución'); g.globalAlpha = 1; }
      },
      // 5 · Resultado: indicadores, estado de cada movimiento y exportación
      (g, lt) => {
        base(g, 'Conciliador V1'); panelBar(g, 'Conciliador V1', TABS, 0);
        const p = ease((lt - 0.2) / 1.4);
        const tiles = [[Math.round(lerp(0, 83, p)) + '%','conciliación', C.ok], [String(Math.round(lerp(0, 5, p))),'pares', C.ok], [String(Math.round(lerp(12, 2, p))),'pendientes', C.warn], ['$' + Math.round(lerp(0, 1309200, p)).toLocaleString('es-CL'),'conciliado', C.ink]];
        const tw = V ? (W - 20) / 2 : (W - 60) / 4, th = V ? 140 : 160, ty = 240;
        tiles.forEach(([n, s, c], i) => {
          const x = M + (V ? (i % 2) : i) * (tw + 20), y = ty + (V ? Math.floor(i / 2) * (th + 20) : 0);
          g.fillStyle = '#f6f8fb'; rr(g, x, y, tw, th, 20); g.fill();
          txt(g, n, x + 26, y + th*0.42, i === 3 ? (V ? 40 : 44) : (V ? 54 : 60), 800, c, 'left', tw - 40); txt(g, s, x + 26, y + th*0.78, 25, 700, C.muted);
        });
        // estado de los movimientos: barra apilada
        const by = ty + (V ? 2*th + 60 : th + 60), q = ease((lt - 1.0) / 0.9);
        txt(g, 'Estado de los 12 movimientos', M, by, 28, 800, C.ink);
        const partes = [[8, C.ok, 'Conciliados'], [2, '#6fbf8f', 'Manual'], [2, C.warn, 'Pendientes']]; let x = M;
        partes.forEach(([n, c, s]) => { const w = (W * n / 12) * q; g.fillStyle = c; rr(g, x, by + 30, Math.max(0, w - 6), 34, 8); g.fill(); x += w; });
        if (q > 0.9) { let lx = M; partes.forEach(([n, c, s]) => { g.fillStyle = c; rr(g, lx, by + 88, 18, 18, 4); g.fill(); txt(g, s + ' ' + n, lx + 28, by + 98, 22, 700, C.muted); lx += V ? 220 : 260; }); }
        // filas del detalle
        const dy = by + 150;
        [[0, 'Par 1'], [9, 'Par manual'], [3, 'Pendiente']].forEach(([i, s], k) => {
          const a = easeOut((lt - 1.6 - k*0.2) / 0.35); if (a <= 0) return; const y = dy + k*56, r = DATA[i];
          g.globalAlpha = a; txt(g, r[1], M, y, 26, 600, C.ink, 'left', V ? 340 : 420); txt(g, r[2], V ? M + 520 : M + 640, y, 26, 800, C.ink, 'right');
          pill(g, CW - M, y - 18, s, s === 'Pendiente' ? '#fdf1e2' : '#e6f2eb', s === 'Pendiente' ? C.warn : C.ok, 20, 36, 'right');
          g.fillStyle = '#e3e9f0'; g.fillRect(M, y + 26, W, 1); g.globalAlpha = 1;
        });
        if (dy + 3*56 < l.expo.y - 10 || !V) btn(g, l.expo.x, l.expo.y, l.expo.w, 64, 'Exportar resultados', 'primary', press(lt, 3.45), 32);
        const b = easeOut((lt - 3.7) / 0.35);
        if (b > 0) { g.globalAlpha = b; const bx = V ? M : M, bw = V ? W : W - 450; banner(g, bx, V ? l.expo.y - 80 : l.expo.y, bw, 64, '✓ resultados_septiembre.xlsx', SHEET); g.globalAlpha = 1; }
        const c = easeOut((lt - 4.6) / 0.4);
        if (c > 0 && !V) { g.globalAlpha = c; pill(g, M, l.expo.y - 70, '3 s en vez de 3 horas', '#eef2f7', C.brand, 24, 46); g.globalAlpha = 1; }
      }
    ];
  }
  return {
    steps: [
      { a:0, b:3.6, short:'El problema', kicker:'El problema que resuelve',
        title:'Cruzas movimientos a mano. Cada mes.',
        body:'Cada factura debe coincidir con su pago, fila por fila, en planillas de cientos de filas. Hacerlo a mano toma horas, y un solo número mal copiado puede generar un problema después.',
        stats:[['200','movimientos típicos'],['3 h','tiempo manual']] },
      { a:3.6, b:8.0, short:'Conecta', kicker:'Paso 1: conecta tu fuente',
        title:'Tu banco o ERP exporta a Google Sheets',
        body:'Importa tu .xlsx o conecta un sheet externo. El sistema detecta los encabezados, te propone qué columna es cada dato (también Cargo y Abono por separado) y te confirma que son las correctas.' },
      { a:8.0, b:10.9, short:'Ejecuta', kicker:'Paso 2: ejecuta desde el panel',
        title:'Abre el panel de control web y ejecuta con un clic',
        body:'Resultados, gráfico y números clave en una sola vista. El sistema valida los datos antes de procesar.' },
      { a:10.9, b:15.3, short:'Matching', kicker:'Algoritmo de matching',
        title:'Cruza cada movimiento contra todos los demás',
        body:'El sistema recorre todos los registros y empareja automáticamente cada movimiento con su contraparte, explicando el motivo de cada resultado.',
        stats:[['~3.000','movimientos'],['~3 s','de proceso']] },
      { a:15.3, b:21.0, short:'Revisa', kicker:'Paso 3: revisa y corrige',
        title:'Lo que no calzó, lo resuelves tú',
        body:'Cada pendiente queda a la vista. Si sabes que una transferencia sin referencia corresponde a una factura, la emparejas a mano o deshaces un pareo, y el ajuste queda guardado entre ejecuciones.' },
      { a:21.0, b:28.8, short:'Resultado', kicker:'Resultado final',
        title:'Así queda tu conciliación',
        body:'Cada movimiento con su estado, su contraparte y el detalle del match. Filtra los pendientes y exporta los resultados con un clic, listos para compartir o archivar.',
        stats:[['3 s','vs 3 horas manual'],['5 min','instalación']],
        cta:['Ver qué incluye', 'incluye'] }
    ],
    cursor: recorrido(L(1200, 950)), cursorV: recorrido(L(800, 1000)),
    draw: dibujo, drawV: dibujo
  };
})();
