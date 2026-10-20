# Motion System de Ambilor.Lab

Sistema de animación de las demos de Herramientas (Concilia, Pedidos y Mis Finanzas). Se suma al motor de demos existente: no lo reemplaza ni cambia sus controles.

## Cómo está hecho

| Capa | Qué anima | Dónde |
|---|---|---|
| Escenas | Lo que pasa dentro de la app del demo: barridos de luz, línea de escaneo, pulsos, gráficos que se trazan, la cortina entre pantallas | `motion/al-motion.js` (`window.AL_MOTION`), que el motor expone a cada escena como `H.mo` |
| HTML | El resumen al terminar un demo (entra en cadena) y los tokens de movimiento (`--mo-*`) | `motion/al-motion.css` |
| Video | Escenas renderizadas aparte (MP4/WebM), con póster y carga diferida | `motion/al-video.js` y `motion/al-motion.css` |
| Línea de tiempo y controles | Reproducir, pausar, anterior, siguiente, reiniciar, teclado, deslizar, movimiento reducido | Ya existía: `alDemoLinea` y `alDemoTarjetas` en `index.html` (ver `DEMOS.md`) |

**¿Por qué no GSAP?** Las demos se dibujan en un canvas dentro del equipo en 3D (three.js, ya en `vendor/`), y la línea de tiempo, la pausa, el reinicio y la limpieza ya los lleva el motor. GSAP duplicaría esa línea de tiempo, sumaría otra dependencia externa y las reglas del repositorio (`CLAUDE.md`) piden animar solo con CSS y Web Animations API. Cada efecto es una función pura del tiempo de la escena, así que pausar, adelantar o reiniciar funciona sin nada más.

## Reglas

- **Cada efecto es una función del tiempo** (`lt`, segundos desde que empezó el paso). No crea timers, listeners ni estado: no hay nada que limpiar al reiniciar o cambiar de demo.
- **Los efectos acompañan, no deciden.** El estado de cada fila o tarjeta (pendiente, explicado, conciliado, confirmado) lo decide la escena por tiempo, igual que la app real. Ejemplo: en Reglas de Concilia, la línea de escaneo pasa por cada comisión en el mismo instante en que esa fila cambia a «Explicado» (nunca a «Conciliado»: las comisiones no tienen contraparte).
- **Son transitorios.** Fuera de su tramo no dibujan nada. Con «reducir movimiento» el demo parte en pausa y muestra cada paso completo, donde ningún efecto está activo.
- **Degradan sin romper.** Si `al-motion.js` no carga, el motor usa funciones vacías y las demos se ven como antes. Si JavaScript no corre, queda la lista de pasos en texto y `basico.html`.
- **Identidad:** azul `#1F5C99`, luz `#3D7FD6`, verde de conciliado `#2F8A5B`, fondos blancos. Sin neón ni movimiento permanente.
- **Rendimiento:** en el HTML solo se animan `transform` y `opacity`. En el canvas, los efectos son trazos y degradados sobre la escena que el motor ya redibuja; no agregan lienzos ni texturas.

## Efectos disponibles (`H.mo` en una escena)

| Efecto | Uso | Para qué |
|---|---|---|
| `barrido(g, lt, t0, x, y, w, h, { radio, color, dur })` | Una banda de luz diagonal cruza el rectángulo una vez | Al completarse algo: un resultado, una tarjeta que coincide (color `'47,138,91'` = verde), un pedido confirmado |
| `escaneo(g, lt, t0, dur, x, y, w, h)` | Una línea con halo baja a velocidad constante; devuelve su `y` | Revisar filas. Para que una fila cambie justo al pasar la línea: `t0 + dur * (yFila - y) / h` |
| `pulso(g, lt, t0, x, y, r, { color, dur })` | Un anillo que se expande una vez | Un cambio de estado puntual |
| `trazo(g, puntos, p, { color, grosor, punteado })` | Dibuja una línea por los puntos hasta el avance `p` | Gráficos que se trazan (usar `H.mo.tramo(lt, t0, dur)` para `p`) |
| `tramo(lt, t0, dur)` | Avance 0 a 1 de un tramo | Sincronizar cualquier cosa |

Además, del motor: `H.foco(g, lt, t0, t1, zonas)` (atenúa el resto de la pantalla), `H.cuenta(valor, lt, t0, dur)` (montos que cuentan) y, en `AL_DEMOS`, `continuo` (pasos en la misma app: la pantalla anterior queda quieta) y `final` (resumen con el resultado). Entre pantallas distintas el motor aplica solo la **cortina** (`AL_MOTION.cortina`): un borde de luz azul revela la pantalla nueva sobre la anterior.

## Agregar efectos a una demo

1. Ubicar la escena (la función `(g, lt) => { … }` del paso) en `AL_DEMOS['xxx-accion'].draw` y, si tiene, en `drawV` (diseño vertical).
2. Al final de la escena, antes de `H.foco` si lo hay, llamar el efecto con las mismas coordenadas que usa la escena. Ejemplo:
   ```js
   H.mo.barrido(g, lt, 2.6, 40, 250, 1120, 110, { radio: 14, color: '47,138,91' });   // el pedido confirmado
   ```
3. Elegir `t0` después de que el elemento ya está en pantalla y antes del final del paso.
4. Un efecto por momento importante del paso, no más. Revisar con `revisar.html` y `node pruebas/revision_completa.js`.

Un efecto nuevo para todas las demos se agrega en `al-motion.js` (función pura, se exporta en `window.AL_MOTION`) y se suma a `MO` en el motor (`index.html`, junto a `H.foco`), con su versión vacía.

## Cine: secuencias audiovisuales (prototipo de Concilia, 2026-10-20)

Además de los efectos sobre las escenas, el sistema tiene **secuencias cinematográficas**: una composición 3D propia (no la pantalla del demo) con cámara, profundidad, luz y montaje por planos. Primer prototipo: `motion/cine/concilia.js`, visible en `prototipo/concilia-cine.html` (página interna, `noindex`, sin enlace en el menú).

| Plano | Tiempo | Qué pasa |
|---|---|---|
| 1 · Establecimiento | 0,0 – 2,4 s | Espacio de datos en azul marino: capas de cristal en profundidad, piso de luz, haces azules; la cámara entra en arco |
| 2 · Entrada | 2,4 – 4,8 s | La cartola y el libro mayor llegan desde el fondo; sus registros caen en dos columnas y la escena se ilumina al blanco de la marca |
| 3 · Transformación | 4,8 – 7,6 s | Un plano de escaneo recorre los registros; las parejas se unen con líneas de relación (verdes al cuadrar), el abono se agrupa con sus dos facturas y lo que no tiene contraparte queda marcado en naranja |
| 4 · Enfoque | 7,6 – 9,6 s | La cámara se acerca a la comisión sin contraparte; el resto se atenúa y una nota explica que queda por revisar (no se da por conciliada) |
| 5 · Resolución | 9,6 – 11,4 s | Cada registro vuela a su fila en la pantalla real de Resultados de Concilia |
| 6 · Cierre | 11,4 – 13,0 s | «Concilia.», la frase y el resultado de este ejemplo (4 grupos conciliados, 2 por revisar), rotulado «Datos de ejemplo» |

**En el sitio** (desde el 2026-10-20) es la **apertura del demo «Ver en acción» de Concilia**: corre sobre el recuadro del demo la primera vez por visita que el demo queda a la vista (sesión del navegador), con «Saltar apertura» siempre visible; al terminar se desvanece y parten los 6 pasos interactivos, que mientras tanto quedan en pausa. La barra del demo sigue funcionando (pausa/reproducir controla la apertura; anterior, siguiente o un paso la terminan; reiniciar la repite) y el resumen final suma «Ver la apertura». El contexto 3D se crea al verla y se suelta al terminar. No se muestra con «reducir movimiento», sin 3D o si el navegador quita el contexto. Medición: `apertura_concilia` con `fin` (`completa`, `saltada`, `perdida`). Integración: bloque «Apertura cinematográfica de Concilia» en `index.html`; estilos `.al-apertura*` en el bloque «HERRAMIENTAS: CUATRO FORMATOS».

Cómo está hecho: three.js (el de `vendor/`), sin dependencias nuevas. Todo sale de `render(t)`: el controlador (`play`, `pause`, `seek`, `destroy`) y el render a video usan el mismo tiempo, sin estado oculto. Curvas propias (salida firme, anticipación, rebote leve), cámara por fotogramas clave y una respiración de cámara en mano muy leve. Los controles y el subtítulo de cada plano son HTML (`aria-live`); con «reducir movimiento» se muestra el cierre quieto; sin 3D, el video (con su póster) y la explicación en texto.

**¿Y Blender?** Este entorno no lo tiene y sin GPU renderizaría lento; además, en el navegador la composición se ve nítida a cualquier tamaño y pesa ~25 KB de código frente a ~2 MB de video. Blender queda para tomas de detalle hechas aparte (por ejemplo, un notebook físico en una mesa) que luego se montan en Kdenlive y se insertan con el componente de video.

### Renderizar el video de una secuencia

```sh
python3 -m http.server 8765 &
node motion/cine/renderizar.js prototipo/concilia-cine.html /tmp/cuadros 1280 720 30
ffmpeg -framerate 30 -i /tmp/cuadros/c%04d.png -c:v libx264 -profile:v high -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart -an motion/media/concilia-cine.mp4
ffmpeg -framerate 30 -i /tmp/cuadros/c%04d.png -c:v libvpx-vp9 -b:v 850k -minrate 300k -maxrate 1300k -pass 1 -row-mt 1 -an -f null /dev/null
ffmpeg -framerate 30 -i /tmp/cuadros/c%04d.png -c:v libvpx-vp9 -b:v 850k -minrate 300k -maxrate 1300k -pass 2 -row-mt 1 -an motion/media/concilia-cine.webm
ffmpeg -i /tmp/cuadros/c0380.png -c:v libwebp -quality 82 motion/media/concilia-cine.webp
```

Archivos actuales (13 s, 1280 × 720, 30 fps, sin audio): `concilia-cine.mp4` 2,2 MB, `concilia-cine.webm` 1,4 MB, póster `concilia-cine.webp` 22 KB. Sin ffmpeg instalado, `pip install imageio-ffmpeg` trae uno.

## Videos (escenas renderizadas)

El único video hasta ahora es el de la secuencia de Concilia (ver «Cine»), usado como alternativa en su prototipo.

Para agregar uno:

```html
<figure class="al-video" data-al-video data-webm="motion/media/concilia-cierre.webm" data-mp4="motion/media/concilia-cierre.mp4" style="--al-video-forma:16/10">
  <img class="al-video__poster" src="motion/media/concilia-cierre.webp" alt="Concilia cruza la cartola con el libro mayor" width="1280" height="800" loading="lazy">
  <figcaption>Qué muestra la escena, en una línea.</figcaption>
</figure>
```

Comportamiento (probado con un clip temporal fuera del repositorio): solo el póster se descarga al entrar; el video, al tocar «Reproducir video»; va sin sonido, en línea (iPhone) y con controles del navegador; se pausa al salir de pantalla; si no puede reproducirse, queda el póster con un aviso. `data-bucle` lo repite (nunca con «reducir movimiento»). Si el contenido se agrega después de cargar, `alVideo.iniciar(contenedor)`.

Dónde ponerlo: dentro del panel de la herramienta, cerca de su demo, respetando los formatos del bloque «HERRAMIENTAS: CUATRO FORMATOS».

### Especificaciones de los archivos

| | Horizontal | Vertical (celular) |
|---|---|---|
| Tamaño | 1280 × 800 | 720 × 1280 |
| Duración | 6 a 12 s, sin audio | igual |
| WebM | VP9, CRF 34, ≤ 1,5 MB | igual |
| MP4 (respaldo) | H.264 High, CRF 26, `+faststart`, ≤ 2,5 MB | igual |
| Póster | WebP, primer cuadro representativo, ≤ 60 KB | igual |
| Carpeta | `motion/media/` | |

Contenido: datos de ejemplo, rotulados como tales («Datos de ejemplo»), y solo funciones que la herramienta tiene.

### Producirlos sin pagar licencias

- **Blender** (escenas 3D, cámara, luces): renderizar a secuencia PNG.
- **Kdenlive** (edición, títulos, transiciones): exportar en máxima calidad.
- **ffmpeg** (optimizar para web):
  ```sh
  ffmpeg -i escena.mov -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -an escena.webm
  ffmpeg -i escena.mov -c:v libx264 -profile:v high -crf 26 -pix_fmt yuv420p -movflags +faststart -an escena.mp4
  ffmpeg -ss 1 -i escena.mov -frames:v 1 -vf scale=1280:-2 -c:v libwebp -quality 80 escena.webp
  ```
