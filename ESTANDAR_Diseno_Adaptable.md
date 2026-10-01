# Estándar Ambilor.Lab · Diseño adaptable (obligatorio)

> Aplica a **todas** las apps y páginas web de Ambilor.Lab (sitio ambilorlab, PedidoApp y las que vengan).
> Copia idéntica en cada repositorio: `ESTANDAR_Diseno_Adaptable.md`.
> Ningún cambio de interfaz se da por terminado sin cumplir este estándar y sin revisar la matriz de pantallas.

## 1. Requisito

Cada pantalla (en el sitio: cada sección y el menú; en las apps: cada vista y sus ventanas) debe verse completa y ser cómoda de usar en:

- **Celular**: vertical **y horizontal**.
- **iPad / tablet**: vertical y horizontal, a pantalla completa y en **pantalla dividida** (Split View 1/3, 1/2, 2/3 y Slide Over).
- **Web**: pantalla completa, **ventana a media pantalla** (lado a lado con otra app), ventanas angostas y notebooks con **poca altura**.

"Completa y cómoda" significa que no hay scroll horizontal, nada queda cortado ni tapado, y la acción principal de cada pantalla (Agregar, Continuar, Confirmar, Guardar) se ve y se puede tocar sin buscarla.

## 2. Matriz de pantallas (se revisa en cada cambio)

| Nombre | Ancho × alto | Qué representa |
|---|---|---|
| cel-v | 390 × 844 | Celular vertical |
| cel-h | 844 × 390 | Celular horizontal |
| cel-h-chico | 667 × 375 | Celular chico horizontal (iPhone SE) |
| cel-h-grande | 932 × 430 | Celular grande horizontal |
| ipad-v | 820 × 1180 | iPad vertical |
| ipad-h | 1180 × 820 | iPad horizontal |
| ipad-pro-h | 1366 × 1024 | iPad Pro horizontal |
| ipad-split-13 | 375 × 820 | iPad horizontal, app en 1/3 (o Slide Over) |
| ipad-split-12 | 590 × 820 | iPad horizontal, app en 1/2 |
| ipad-split-23 | 780 × 820 | iPad horizontal, app en 2/3 |
| ipad-v-split-12 | 504 × 1180 | iPad vertical, app en 1/2 |
| web | 1440 × 900 | Escritorio |
| web-mitad | 720 × 900 | Ventana a media pantalla |
| web-mitad-hd | 960 × 1080 | Media pantalla en monitor Full HD |
| laptop-bajo | 1280 × 650 | Notebook con poca altura útil |
| web-cuarto | 640 × 520 | Ventana chica / cuarto de pantalla |

## 3. Reglas de diseño

1. **Se decide por ancho y por alto**, no solo por ancho. Una ventana ancha y baja (celular horizontal, media pantalla) necesita su propia regla: `@media (max-height:560px) and (orientation:landscape)` compacta la cabecera, el pie, los resúmenes y las ventanas.
2. **Nunca se asume dispositivo por tamaño.** En pantalla dividida, un iPad se comporta como celular (1/3) o como tablet chica (1/2). El diseño responde al espacio disponible, no al aparato.
3. **Componentes con *container queries*** (`container-type:inline-size` + `@container`) cuando su espacio depende de dónde están (tarjetas, filas de productos, tablas de ajustes). Así funcionan igual a pantalla completa y en pantalla dividida.
4. **Barras fijas ≤ 30 % del alto.** La suma de cabecera, pestañas y pie fijos no debe tapar más del 30 % de la pantalla; en horizontal se adelgazan o dejan de ser fijas.
5. **Ventanas y hojas que siempre caben**: `max-height: calc(100dvh - 16px)` (con respaldo en `vh`), contenido con scroll interno y **botones de acción siempre visibles** (pegados abajo). En horizontal, la ficha pasa a dos columnas (imagen | datos).
6. **Sin scroll horizontal de la página.** Lo que es más ancho que la pantalla (chips, tiras, tablas) se desplaza dentro de su propio contenedor.
7. **Tacto**: blancos de toque de **44 px** (mínimo 40 px en selectores compactos, con zona de toque de 48 px) con `@media (pointer:coarse)`; campos de texto a **16 px** en táctil para que iOS no haga zoom.
8. **Bordes seguros**: `env(safe-area-inset-*)` en barras fijas y pies (muesca del celular en horizontal).
9. **Sin bloquear la orientación** ni pedir "gira tu teléfono".
10. **Movimiento reducido**: respetar `prefers-reduced-motion`.
11. **Quieto al usarse** (2026-09-30): nada cambia de lugar al reproducir una demo, cambiar de demo o de pestaña, avanzar de paso o tocar un botón. Las transiciones desvanecen el contenido, no desplazan el recuadro; los textos que cambian reservan su alto; el contenido de lectura no se inclina con el giroscopio.
12. **Memoria para Safari** (iPhone/iPad limitan la memoria de lienzos y los contextos 3D por página; al pasarse dejan escenas en blanco o recargan la página): como máximo **10 contextos 3D activos** y **150 MB de lienzos** con todo abierto. Lo que no se ve no ocupa memoria.
13. **Altos reales**: se diseña y se prueba con lo que de verdad se ve en el celular, con las barras del navegador: 390 × 664 (iPhone), 375 × 553 (iPhone SE), 844 × 390 (horizontal). Los 844 px de alto de la ficha técnica no existen en la práctica. En **Safari de iOS 26** la barra de direcciones flota sobre el final de la página: la página mide casi toda la pantalla (402 × 814 en un iPhone 17 Pro), pero los últimos **~85 px** quedan tapados. Lo importante de la primera pantalla debe quedar sobre esa franja. En **tablet horizontal** (iPad Pro 11: 1194 × 834, que con las barras de Safari deja ≈ 1194 × 760) el **recuadro completo** de la demo, nota incluida, cabe en el alto visible; no basta con que quepa la escena. Se revisa también en la versión de iOS/iPadOS que tenga el Director (hoy iOS 27): cada versión nueva puede mover las barras.
14. **Un solo motor no basta**: lo que se prueba en Chrome (Chromium) no garantiza Safari (WebKit). Lo propio de Safari se confirma en un dispositivo real (sección 6).
15. **Escenas que vuelven** (2026-10-01): iOS quita las escenas 3D al cambiar de app o bloquear el teléfono. Al devolverlas, cada escena se vuelve a dibujar, también en pausa; nunca queda en blanco.
16. **Letra legible**: ningún texto bajo **11 px** y contraste de al menos **4,5** (3 en letra grande, desde 18,6 px o 14 px en negrita), en **tema oscuro y claro**. Se exceptúan las ilustraciones (miniaturas de planillas, textos dentro de la escena 3D).
17. **Letra agrandada**: con el zoom de Safari al 125 % y 150 % (equivale a 322 y 268 px de ancho) y el navegador del computador al 150 % y 200 %, nada se sale ni se corta. Que no quepa todo en una pantalla se acepta, porque se desplaza.
18. **Carga liviana** (2026-10-01): nada de otro servidor bloquea la primera pantalla. Fuentes e íconos se sirven desde el sitio, recortados a lo que se usa (`fuentes/`). Con 4G lento simulado, la primera pantalla aparece en 1,25 s; antes tardaba 1,84 s. Ícono o carácter nuevo: se regenera con `pyftsubset` (lo avisa `revision_completa.js`).

## 4. Cómo se verifica

- **Sitio ambilorlab**: abrir `revisar.html` (no está enlazada en el menú). Muestra el sitio a la vez en todos los tamaños y corre un chequeo automático en cada uno: contenido que se sale, textos cortados, vacío bajo el pie y si los bloques caben en el alto visible.
  - `revisar.html` → pantalla completa (iPhone, iPad y computador, vertical y horizontal, con los altos de Safari y de Chrome).
  - `revisar.html?dividida` → iPad en Split View ⅓, ½ y ⅔, Slide Over y computador a media pantalla.
  - `revisar.html?ventana` → ventanas libres de iPad (Stage Manager), incluidas ventanas chicas en ancho y alto.
  - `revisar.html?tam=500x450,700x520` → tamaños a medida.
  - Se revisan las cinco pestañas (Inicio, Sobre mí, Herramientas, Recursos, Contacto; en Recursos, la lista, cada artículo y las guías) y el resultado debe quedar **en verde** en todas.
- **Sitio ambilorlab, revisión completa**: `node pruebas/revision_completa.js` (8 min; `--completo` suma tamaños). Además de `revisar.html`, prueba lo que el encuadre no ve: errores de JavaScript, estabilidad cuadro a cuadro (reproducir y cambiar de demo), que la página no se desplace al tocar, controles de 44 px, memoria para Safari, sin 3D, reducir movimiento girar el teléfono, la primera pantalla con la barra flotante de iOS 26, escenas que vuelven, letra legible en ambos temas y letra agrandada. Debe terminar en "Todo en orden".
- **Sitio ambilorlab, limpiezas de CSS**: `node pruebas/comparar_estilos.js <copia anterior>` compara cada elemento de las 5 pestañas en 8 tamaños y ambos temas. Un reordenamiento o una limpieza debe dar 0 diferencias; un cambio de diseño muestra exactamente qué cambió.
- **PedidoApp**: `node simulacion/navegador/auditoria_adaptable.js` recorre la matriz completa (formulario, seguimiento y panel) y deja una captura por pantalla.
- Siempre se miran a ojo, como mínimo, celular horizontal, iPad ⅓ y web a media pantalla, que son los casos más exigentes.
- Cada PR con cambios de interfaz indica en su descripción que se revisó la matriz.

## 5. Lista de chequeo para cada cambio de interfaz

- [ ] Vertical y horizontal en celular.
- [ ] iPad completo y en pantalla dividida (1/3, 1/2, 2/3).
- [ ] Web completa, media pantalla y poca altura.
- [ ] La acción principal se ve sin buscarla en todas.
- [ ] Ventanas y hojas caben y sus botones se ven.
- [ ] Sin scroll horizontal; barras fijas ≤ 30 %.
- [ ] `revisar.html` en verde (completa, `?dividida` y `?ventana`) o auditoría adaptable limpia, y capturas revisadas.
- [ ] Sitio: `node pruebas/revision_completa.js` termina en "Todo en orden".
- [ ] Controles de 44 px en táctil; nada se mueve al usarse; memoria dentro del límite.
- [ ] Letra ≥ 11 px y contraste ≥ 4,5 en tema oscuro y claro; con zoom al 150 % nada se sale.
- [ ] Si el cambio toca animaciones, 3D, alturas o gestos: revisado en un iPhone o iPad real (sección 6).

## 6. Revisión en dispositivo real (iPhone / iPad, Safari)

Lo que ningún simulador confirma. Toma unos 5 minutos; se hace después de cambios en animaciones, demos, alturas o gestos.

1. **Abrir Herramientas en vertical**: el título, el selector y la escena con su barra se ven sin desplazar; nada salta al terminar de cargar.
2. **Cambiar entre "Ver en acción" y "Cómo se instala"** varias veces: el recuadro y el texto de abajo no se mueven.
3. **Tocar ← ▮▮ → ↻** con el pulgar: se aciertan sin esfuerzo.
4. **Abrir las tres herramientas y volver a la primera**: ninguna escena queda en blanco y la página no se recarga sola.
5. **Desplazar la página** hacia abajo y hacia arriba: al esconderse y aparecer las barras de Safari nada se corta ni salta.
6. **Girar el teléfono** en plena demo: se reacomoda en uno o dos segundos.
7. **Cambiar de app y volver** (o bloquear y desbloquear el teléfono) con una demo en pausa: la escena sigue dibujada.
8. **Inclinar el teléfono** en Herramientas: el contenido queda quieto (solo el fondo se mueve).
9. **Inicio**: el recorrido 3D fluye y el texto se lee.
Si algo falla: captura o video corto, y se corrige antes de dar el cambio por terminado.
