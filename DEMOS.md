# Demos de Herramientas: modelo base

Guía para armar la demo de un aplicativo nuevo sobre lo que ya existe, sin partir de cero. Todo vive en `index.html`.

## Qué hay (tres piezas reutilizables)

| Pieza | Qué hace | Dónde |
|---|---|---|
| `alDemoLinea(root, steps, opciones)` | Controlador común de todas las demos: modo **automático** y **manual**, ← Anterior, ▶/⏸, → Siguiente, **↻ Reiniciar** (lo agrega solo), barra de pasos, teclado (← → e Inicio) y el **panel de simulación** opcional. | Bloque "Línea de tiempo de las demos" |
| `alDemoTarjetas(root, cfg)` | Motor de demos por **tarjetas**: una pantalla por etapa, dibujada en canvas y mostrada en 3D, con cursor que hace clic. Elige solo el diseño **apaisado** (`draw`) o el **vertical** (`drawV`) según la forma del recuadro. | Bloque "Motor de demos por tarjetas" |
| `AL_DEMOS['id']` | La configuración de cada demo: etapas, textos, dibujos, cursor y simulación. **Es lo único que se escribe para una demo nueva.** | Bloques "Demos del Conciliador V2", "Demos de PedidoApp" y "Diseños verticales" |

La escena 3D de "Ver en acción" del **Conciliador V1** es la referencia más completa de simulación (fichas que se ordenan, arcos de coincidencia, panel y hoja de resultados). Usa el mismo controlador y su `SIM` sirve de ejemplo.

## Comportamiento que se obtiene gratis

- **Automático:** al ver la demo, las etapas avanzan solas. La escena solo corre cuando está en pantalla.
- **Pausa:** todo queda congelado donde está (escena, contadores y progreso), y el panel dice "Manual".
- **Anterior / Siguiente:** en automático, la etapa parte desde su inicio. En pausa se muestra la etapa **completa**.
- **Reproducir:** sigue desde el punto actual, sin reiniciar.
- **Reiniciar:** vuelve al estado inicial (contadores, escena y progreso) y reproduce desde el comienzo.
- **Movimiento reducido** (`prefers-reduced-motion`): parte en pausa, con la primera etapa completa.
- **Vertical / horizontal:** la tarjeta vertical es de 800×1000 y la apaisada de 1200×950.

## Pasos para un aplicativo nuevo

1. **Sub-pestaña y panel.** Copiar el panel `#hp-ped` completo (botón `#hpt-ped` en `.hp-tabs` y `div.hp-panel`). Luego cambiar:
   - los ids (`hp-xxx`, `hpt-xxx`, `xxx-accion`, `xxx-instala`, `instalacion-xxx`);
   - los textos y la nota `.al-demo__note`.

   Las demos del panel se inician solas la primera vez que se abre la sub-pestaña (`showHP`).
2. **Configuración.** Crear `AL_DEMOS['xxx-accion']` y `AL_DEMOS['xxx-instala']` con la plantilla de abajo, en un bloque `<script>` después de los de V2 y PedidoApp.
3. **Diseño vertical.** Agregar `drawV` y `cursorV`. Los pasos de instalación comunes ya existen en "Diseños verticales" (`I.copia`, `I.menu`, `I.permisos`, `I.publicar`, `I.verificar`, `I.listo`, con sus cursores en `K`), así que una instalación nueva se arma casi solo con ellos.
4. **Simulación (recomendada).** Agregar `sim(t)` para que la demo muestre la automatización: fase, progreso, avisos de lo que acaba de pasar y contadores. Los valores son de ejemplo y el panel lo dice ("Datos de ejemplo").
5. **Revisar.** Correr `revisar.html`, `?dividida` y `?ventana` en las cinco pestañas: todo en verde. Mirar a ojo celular vertical y horizontal, iPad ⅓ y web a media pantalla.

## Plantilla de configuración

```js
AL_DEMOS['xxx-accion'] = {
  // Etapas: a y b en segundos (la siguiente parte donde termina la anterior)
  steps: [
    { a:0,   b:4.2, short:'El problema', kicker:'El problema que resuelve', title:'…', body:'…',
      stats:[['40+','ejemplo'],['0','ejemplo']] },          // opcional
    { a:4.2, b:9.0, short:'Paso 1', kicker:'Paso 1: …', title:'…', body:'…', tip:'…' },   // tip opcional
    // … (6 etapas en total, la última puede llevar cta:['Ver qué incluye', 'incluye-xxx'])
  ],
  // Cursor por etapa (coordenadas de la tarjeta apaisada 1200×950) o null
  cursor: [ null, { keys:[[0.3,1000,880],[2.0,600,826],[2.25,600,826],[2.9,1000,900]], clicks:[2.15] }, /* … */ ],
  // Dibujo apaisado: una función por etapa; lt = segundos desde que empezó la etapa
  draw: H => { const { C, CW, CH, ease, easeOut, clamp, lerp, rr, txt, wrap, press, btn, base, overlay, dialog, banner, pill, campo, panelBar, celular } = H;
    return [
      (g, lt) => { base(g, 'Título de la ventana'); /* … */ },
      // …
    ];
  },
  // Dibujo vertical (800×1000) y su cursor, con la misma estructura
  drawV: H => [ /* … */ ],
  cursorV: [ /* … */ ],
  // Simulación: qué está pasando en el segundo t (tiempo total de la demo)
  sim: t => ({
    fase: 'Procesando pedidos…',            // texto de la fase actual
    prog: Math.min(1, t / 4),               // 0..1 muestra la barra; null la oculta
    ok: false,                              // true: fase terminada (punto verde)
    evt: '✓ Pedido #341 → confirmado',      // aviso breve (null = ninguno); cambia el texto para mostrar otro
    kpis: [[12, 'pedidos'], [8, 'listos'], [4, 'pendientes']],   // contadores (máx. 4 en celular)
    fin: false                              // true en el resultado final (resalta los contadores)
  })
};
```

Ayudantes de dibujo (`H`), en coordenadas de la tarjeta:

| Ayudante | Uso |
|---|---|
| `base(g, título)` | Ventana blanca con barra azul |
| `panelBar(g, producto, pestañas, activa)` | Barra del panel con pestañas (se desplaza si no caben) |
| `btn(g, x, y, w, h, texto, 'primary'\|'ghost'\|'wa'\|'disabled', press(lt, tClic))` | Botón que se hunde con el clic |
| `campo`, `pill`, `banner`, `dialog`, `overlay`, `checkDot`, `sheetIcon`, `celular`, `txt`, `wrap` | Campos, etiquetas, avisos, diálogos, celular de frente y texto con ajuste |

## Reglas

- Los números de las demos son **de ejemplo**: nunca se presentan como resultados de un usuario. El panel de simulación lo indica y la nota de la demo lo repite.
- En la tarjeta vertical, el texto va de 28 a 46 px (en la tarjeta de 800 de ancho) y los botones van a lo ancho.
- En celular el panel de simulación muestra hasta 4 contadores: el quinto (por ejemplo, el tiempo) se dice también en la fase.
- Una demo nueva no copia el motor ni el controlador: solo agrega su `AL_DEMOS[...]`.
