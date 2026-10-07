# Procedencia

- Origen: https://github.com/mblode/agent-skills (carpeta `skills/ui-animation`)
- Commit: cef4cfa837ca41b50d19f54551a3939ed7460434 (6-10-2026)
- Licencia: MIT (ver `LICENSE.md`, © 2026 Matthew Blode)
- Incorporada el 7-10-2026 sin cambios. Se omitió `evals/` (solo para mantener la skill; no se usa al trabajar).
- Revisada completa antes de incorporarla: no descarga nada ni envía datos. Los scripts de `scripts/` solo procesan un video local (ffmpeg, OpenCV, SciPy) y se usan únicamente para copiar una animación desde una grabación.

## Cómo aplica en este sitio
- El sitio es HTML, CSS y JS sin framework: se usan las recetas en CSS y Web Animations API. No instalar Motion, Framer Motion ni React.
- Mandan las reglas del repositorio (`CLAUDE.md`) y `ESTANDAR_Diseno_Adaptable.md`: reducir movimiento, toque de 44 px, sin 3D cuando corresponde, revisión con `revisar.html` y `node pruebas/revision_completa.js`.
- Para actualizarla: volver a copiar la carpeta desde el origen, revisar el cambio completo y anotar aquí el commit nuevo.
