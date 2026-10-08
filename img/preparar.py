# Prepara una foto IA para la propuesta.
# uso: python3 -I preparar.py foto.png salida.webp ancho '{esquinas de quad.py}' [recorte.png]
# Con recorte (la misma foto sin fondo, de Higgsfield · remove_background) el aparato queda suelto, con
# transparencia, para apoyarse directo sobre la página; sin él, el fondo pasa al azul de marca y los
# bordes se difuminan. Imprime lo que va en FOTOS (fuente/foto.js): tamaño, esquinas y caja.
import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src, out, ancho = sys.argv[1], sys.argv[2], int(sys.argv[3])
Q = json.loads(sys.argv[4]); rec = sys.argv[5] if len(sys.argv) > 5 else None
im = Image.open(src).convert('RGB'); W, H = im.size
a = np.asarray(im).astype(np.float32)
r, g, b = a[...,0], a[...,1], a[...,2]
# 1 · reflejos verdes (teclado, trackpad, piso): se pasan a gris
lum = 0.3 * r + 0.59 * g + 0.11 * b
t = np.clip((g - r - 10) / 25, 0, 1)[..., None]          # cuánto tinte verde/turquesa tiene
neutro = np.dstack([lum * 0.95, lum * 0.98, lum * 1.06])
a = a * (1 - t) + neutro * t
# 2 · la pantalla queda negra (encima va lo que muestra el demo)
mk = Image.new('L', (W, H), 0); ImageDraw.Draw(mk).polygon([tuple(Q[k]) for k in ('TL','TR','BR','BL')], fill=255)
mk = mk.filter(ImageFilter.MaxFilter(9)); m = np.asarray(mk)[..., None] / 255.0
if rec:
    al = np.asarray(Image.open(rec).convert('RGBA'))[..., 3].astype(np.float32) / 255
    al = np.maximum(al, m[..., 0])                        # la pantalla, siempre opaca
else:
    # fondo oscuro de la foto → azul de marca (el aluminio, claro, no se toca)
    r, g, b = a[...,0], a[...,1], a[...,2]; lum = 0.3 * r + 0.59 * g + 0.11 * b
    d = np.clip((75 - lum) / 45, 0, 1)[..., None]
    a = a * (1 - d) + np.dstack([lum * 0.42, lum * 1.15, lum * 2.0]) * d
    # bordes que se funden con el fondo de la página
    yy, xx = np.mgrid[0:H, 0:W]; u, v = xx / (W - 1), yy / (H - 1)
    ss = lambda e0, e1, x: np.clip((x - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((x - e0) / (e1 - e0), 0, 1))
    al = ss(0, .2, u) * ss(0, .2, 1 - u) * ss(0, .16, v) * ss(0, .14, 1 - v)
a = a * (1 - m) + np.array([6, 8, 11], np.float32) * m
rgba = np.dstack([np.clip(a, 0, 255), al * 255]).astype(np.uint8)
o = Image.fromarray(rgba, 'RGBA')
x0, y0 = 0, 0
if rec:   # recorta al aparato, con un margen
    ys, xs = np.nonzero(al > 0.04); p = 24
    x0, y0, x1, y1 = max(0, xs.min() - p), max(0, ys.min() - p), min(W, xs.max() + p), min(H, ys.max() + p)
    o = o.crop((x0, y0, x1, y1)); caja = [p, p, x1 - x0 - p, y1 - y0 - p]
else:
    caja = None
k = ancho / o.size[0]; o = o.resize((ancho, round(o.size[1] * k)), Image.LANCZOS)
o.save(out, 'WEBP', quality=88, method=6)
f = lambda v: round(v, 1)
print(json.dumps({ 'w': o.size[0], 'h': o.size[1], 'q': [[f((Q[c][0] - x0) * k), f((Q[c][1] - y0) * k)] for c in ('TL', 'TR', 'BR', 'BL')],
                   'caja': [f(v * k) for v in caja] if caja else None }))
