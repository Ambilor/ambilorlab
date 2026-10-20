/* ═══ Ambilor.Lab · Motion System (2026-10-20) ═══
   Efectos de motion graphics para las demos de Herramientas, dibujados en el canvas de cada escena
   (el motor de demos, alDemoTarjetas en index.html, los expone a las escenas como H.mo).

   Reglas del sistema:
   · Cada efecto es una función pura: recibe el contexto 2D, el tiempo de la escena (lt, en segundos) y dónde
     actuar. No guarda estado, no crea timers ni listeners: el motor ya lleva la línea de tiempo, la pausa,
     el reinicio y la limpieza, así que no hay nada que destruir al reiniciar una demo.
   · Son transitorios: fuera de su tramo no dibujan nada. Con «reducir movimiento» las escenas se muestran
     en su estado final, donde ningún efecto está activo.
   · Solo acompañan: el estado de cada fila o tarjeta lo decide la escena por tiempo, nunca el efecto.
     Si este archivo no carga, las demos siguen iguales (el motor usa versiones vacías).
   · Colores de la identidad: azul #1F5C99 y su luz #3D7FD6, sobre fondos blancos. Sin neón. */
(function(){
  'use strict';
  var clamp = function(x, a, b){ return Math.min(b === undefined ? 1 : b, Math.max(a || 0, x)); };
  var easeOut = function(x){ x = clamp(x); return 1 - Math.pow(1 - x, 3); };
  var easeInOut = function(x){ x = clamp(x); return x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };

  // tokens: los mismos valores que motion/al-motion.css (--mo-*)
  var T = {
    azul: '31,92,153',        // #1F5C99, azul corporativo
    luz: '61,127,214',        // #3D7FD6, azul secundario (luz)
    ok: '47,138,91',          // verde de «conciliado»
    blanco: '255,255,255',
    dur: { barrido: 0.85, pulso: 0.6, cortina: 0.38 }
  };
  var rgba = function(c, a){ return 'rgba(' + c + ',' + a + ')'; };
  // avance de un tramo [t0, t0 + dur] (0 antes, 1 después)
  function tramo(lt, t0, dur){ return clamp((lt - t0) / dur); }
  function caja(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // Barrido de luz: una banda diagonal clara cruza el rectángulo una vez (al completarse algo: un resultado,
  // una tarjeta que coincide). o.color: tinte de la banda (por defecto la luz azul); o.fuerza: intensidad (0 a 1).
  function barrido(g, lt, t0, x, y, w, h, o){
    o = o || {};
    var dur = o.dur || T.dur.barrido, p = tramo(lt, t0, dur); if (p <= 0 || p >= 1) return;
    var banda = Math.max(60, Math.min(w, h) * 0.9), cx = x - banda + (w + banda * 2) * easeInOut(p);
    g.save(); caja(g, x, y, w, h, o.radio == null ? 16 : o.radio); g.clip();
    g.translate(cx, y + h / 2); g.transform(1, 0, -0.45, 1, 0, 0);
    var gr = g.createLinearGradient(-banda / 2, 0, banda / 2, 0), c = o.color || T.luz, a = Math.sin(p * Math.PI) * (o.fuerza || 1);   // fuerza: 0 a 1 (un reflejo en el vidrio va suave)
    gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(0.42, rgba(T.blanco, 0.5 * a)); gr.addColorStop(0.5, rgba(c, 0.22 * a)); gr.addColorStop(0.58, rgba(T.blanco, 0.5 * a)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(-banda / 2, -h, banda, h * 2);
    g.restore();
  }

  // Línea de escaneo: baja a velocidad constante por (x, y, w, h) entre t0 y t0 + dur, con un halo arriba.
  // Devuelve su posición (y) o -1 si no está activa. Es lineal a propósito: así la escena puede hacer que cada
  // fila cambie justo cuando la línea pasa (calculando ese instante con la misma velocidad).
  function escaneo(g, lt, t0, dur, x, y, w, h){
    var p = (lt - t0) / dur; if (p <= 0 || p >= 1) return -1;
    var yy = y + h * p, a = Math.min(1, p * 6, (1 - p) * 6), halo = Math.min(70, h * 0.3);
    g.save();
    var gr = g.createLinearGradient(0, yy - halo, 0, yy);
    gr.addColorStop(0, rgba(T.luz, 0)); gr.addColorStop(1, rgba(T.luz, 0.16 * a));
    g.fillStyle = gr; g.fillRect(x, yy - halo, w, halo);
    var lg = g.createLinearGradient(x, 0, x + w, 0);
    lg.addColorStop(0, rgba(T.luz, 0)); lg.addColorStop(0.12, rgba(T.azul, 0.9 * a)); lg.addColorStop(0.88, rgba(T.azul, 0.9 * a)); lg.addColorStop(1, rgba(T.luz, 0));
    g.fillStyle = lg; g.fillRect(x, yy - 1.5, w, 3);
    g.restore();
    return yy;
  }

  // Pulso: un anillo que se expande una vez desde (x, y), para marcar un cambio de estado puntual.
  function pulso(g, lt, t0, x, y, r, o){
    o = o || {};
    var p = tramo(lt, t0, o.dur || T.dur.pulso); if (p <= 0 || p >= 1) return;
    g.save(); g.globalAlpha *= (1 - p) * 0.8; g.strokeStyle = rgba(o.color || T.luz, 1); g.lineWidth = o.grosor || 4;
    g.beginPath(); g.arc(x, y, r * (1 + easeOut(p) * 1.2), 0, Math.PI * 2); g.stroke(); g.restore();
  }

  // Trazo: dibuja una línea por los puntos [[x, y], …] hasta el avance p (0 a 1), como un gráfico que se traza.
  function trazo(g, puntos, p, o){
    o = o || {}; p = clamp(p); if (p <= 0 || puntos.length < 2) return;
    var largo = 0, tr = []; for (var i = 1; i < puntos.length; i++) { var d = Math.hypot(puntos[i][0] - puntos[i-1][0], puntos[i][1] - puntos[i-1][1]); tr.push(d); largo += d; }
    var resta = largo * p;
    g.save(); g.strokeStyle = o.color || rgba(T.azul, 1); g.lineWidth = o.grosor || 4; g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.punteado) g.setLineDash(o.punteado);
    g.beginPath(); g.moveTo(puntos[0][0], puntos[0][1]);
    var fin = puntos[0];
    for (var k = 1; k < puntos.length && resta > 0; k++) {
      var q = Math.min(1, resta / tr[k-1]); fin = [puntos[k-1][0] + (puntos[k][0] - puntos[k-1][0]) * q, puntos[k-1][1] + (puntos[k][1] - puntos[k-1][1]) * q];
      g.lineTo(fin[0], fin[1]); resta -= tr[k-1];
    }
    g.stroke();
    if (p < 1 && o.punta !== false) { g.setLineDash([]); g.fillStyle = o.color || rgba(T.azul, 1); g.beginPath(); g.arc(fin[0], fin[1], (o.grosor || 4) * 1.6, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }

  // Cortina: transición entre pantallas distintas. Borra (deja transparente) lo que la pantalla nueva aún no
  // revela, así se ve la anterior debajo, y marca el borde con una línea de luz. p: avance de la entrada (0 a 1).
  function cortina(g, W, H, p){
    if (p >= 1) return;
    var e = easeInOut(p), inc = H * 0.18, borde = -inc + (W + inc * 2) * e;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(borde, 0); g.lineTo(W + 10, 0); g.lineTo(W + 10, H); g.lineTo(borde - inc, H); g.closePath(); g.fillStyle = '#000'; g.fill();
    g.globalCompositeOperation = 'source-over';
    var a = Math.sin(p * Math.PI);
    g.strokeStyle = rgba(T.luz, 0.85 * a); g.lineWidth = 4; g.beginPath(); g.moveTo(borde, 0); g.lineTo(borde - inc, H); g.stroke();
    g.strokeStyle = rgba(T.luz, 0.22 * a); g.lineWidth = 22; g.beginPath(); g.moveTo(borde - 12, 0); g.lineTo(borde - inc - 12, H); g.stroke();
    g.restore();
  }

  window.AL_MOTION = { version: '1.0', tokens: T, tramo: tramo, barrido: barrido, escaneo: escaneo, pulso: pulso, trazo: trazo, cortina: cortina };
})();
