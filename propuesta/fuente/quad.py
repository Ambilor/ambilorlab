# Esquinas de la pantalla verde de una foto (uso: python3 -I quad.py foto.png [corte_y]).
# Esquinas de la pantalla verde: ajusta una recta a cada borde (tramo central) y las corta.
import sys, json, numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.int32)
r,g,b = im[...,0], im[...,1], im[...,2]
m = (g > 120) & (g > r + 60) & (g > b + 40)
if len(sys.argv) > 2: m[int(sys.argv[2]):] = False   # corte manual bajo la pantalla (reflejo del piso)
rows, cols = m.sum(1), m.sum(0)
yr = np.nonzero(rows > rows.max() * 0.25)[0]; xr = np.nonzero(cols > cols.max() * 0.25)[0]
Y0, Y1, X0, X1 = yr.min(), yr.max(), xr.min(), xr.max()
m[:max(0, Y0 - 80)] = False; m[Y1 + 4:] = False     # fuera el reflejo del piso
def fit(pts): p = np.array(pts, float); return np.linalg.lstsq(np.c_[p[:,0], np.ones(len(p))], p[:,1], rcond=None)[0]
top, bot, lef, rig = [], [], [], []
for x in range(int(X0 + .3*(X1-X0)), int(X1 - .3*(X1-X0)), 4):
    yy = np.nonzero(m[:, x])[0]
    if len(yy) < 50: continue
    top.append((x, yy.min())); bot.append((x, yy.max()))
for y in range(int(Y0 + .2*(Y1-Y0)), int(Y1 - .2*(Y1-Y0)), 4):
    xx = np.nonzero(m[y])[0]
    if len(xx) < 50: continue
    lef.append((y, xx.min())); rig.append((y, xx.max()))
T, B, L, R = fit(top), fit(bot), fit(lef), fit(rig)
def cross(H, V): y = (H[0]*V[1] + H[1]) / (1 - H[0]*V[0]); return [round(V[0]*y + V[1], 1), round(y, 1)]
print(json.dumps({'TL': cross(T, L), 'TR': cross(T, R), 'BR': cross(B, R), 'BL': cross(B, L)}))
