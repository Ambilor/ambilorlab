# Sitio Ambilor.Lab — reglas del repositorio

- **Diseño adaptable obligatorio**: todo cambio cumple `ESTANDAR_Diseno_Adaptable.md` (celular vertical y horizontal, iPad completo, en pantalla dividida y en ventana libre, web completa, media pantalla y poca altura).
- Antes de publicar, revisar con `revisar.html`, `revisar.html?dividida` y `revisar.html?ventana` en las cinco pestañas: todo en verde. Mirar a ojo, como mínimo, celular horizontal, iPad ⅓ y web a media pantalla.
- Además, correr `node pruebas/revision_completa.js` (errores, estabilidad cuadro a cuadro, toque de 44 px, memoria para Safari, sin 3D, reducir movimiento, girar): debe terminar en "Todo en orden". Sin internet: `AL_CACHE=<copia local de three.js, íconos y fuentes>`.
- Se prueba con los altos reales del celular (con las barras del navegador) y en uso: reproducir, cambiar de demo, tocar, girar. Lo propio de Safari se confirma en un iPhone/iPad real (sección 6 del estándar).
- Herramientas: la disposición de las demos vive solo en el bloque "HERRAMIENTAS: CUATRO FORMATOS" de `index.html` (A celular vertical, B celular horizontal, C tablet vertical, D tablet horizontal / computador). Los ajustes se hacen dentro del formato que corresponde; no se agregan reglas sueltas ni `!important`.
- `revisar.html` es una herramienta interna: no se enlaza en el menú y mantiene `noindex`.
