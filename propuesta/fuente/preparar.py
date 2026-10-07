# Prepara una foto IA para la propuesta (uso: python3 -I preparar.py foto.png salida.webp ancho '{esquinas de quad.py}'):
import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src, out, ancho = sys.argv[1], sys.argv[2], int(sys.argv[3])
Q = json.loads(sys.argv[4])
im = Image.open(src).convert('RGB'); W, H = im.size
a = np.asarray(im).astype(np.float32)
r, g, b = a[...,0], a[...,1], a[...,2]
# 1 · reflejos verdes (teclado, trackpad, piso): el verde no pasa del mayor entre rojo y azul
lum = 0.3 * r + 0.59 * g + 0.11 * b
t = np.clip((g - r - 10) / 25, 0, 1)[..., None]          # cuánto tinte verde/turquesa tiene
neutro = np.dstack([lum * 0.95, lum * 0.98, lum * 1.06])
a = a * (1 - t) + neutro * t
# fondo oscuro de la foto → azul de marca (el aluminio, claro, no se toca)
r, g, b = a[...,0], a[...,1], a[...,2]; lum = 0.3 * r + 0.59 * g + 0.11 * b
d = np.clip((75 - lum) / 45, 0, 1)[..., None]
azul = np.dstack([lum * 0.42, lum * 1.15, lum * 2.0])
a = a * (1 - d) + azul * d
# 2 · la pantalla queda negra (encima va el escritorio del demo)
mk = Image.new('L', (W, H), 0); ImageDraw.Draw(mk).polygon([tuple(Q[k]) for k in ('TL','TR','BR','BL')], fill=255)
mk = mk.filter(ImageFilter.MaxFilter(9)); m = np.asarray(mk)[..., None] / 255.0
a = a * (1 - m) + np.array([6, 8, 11], np.float32) * m
# 3 · bordes que se funden con el fondo de la página
yy, xx = np.mgrid[0:H, 0:W]; u, v = xx / (W - 1), yy / (H - 1)
ss = lambda e0, e1, x: np.clip((x - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((x - e0) / (e1 - e0), 0, 1))
al = ss(0, .2, u) * ss(0, .2, 1 - u) * ss(0, .16, v) * ss(0, .14, 1 - v)
rgba = np.dstack([np.clip(a, 0, 255), al * 255]).astype(np.uint8)
o = Image.fromarray(rgba, 'RGBA'); o = o.resize((ancho, round(H * ancho / W)), Image.LANCZOS)
o.save(out, 'WEBP', quality=86, method=6)
k = ancho / W; print(json.dumps({q: [round(p[0] * k, 1), round(p[1] * k, 1)] for q, p in Q.items()}), o.size)
