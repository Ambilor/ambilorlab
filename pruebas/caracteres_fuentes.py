#!/usr/bin/env python3
"""Lista los caracteres de index.html que no están en las fuentes recortadas
(fuentes/inter-400.woff2 y fuentes/jetbrains-mono-400.woff2). Si aparece uno,
se ve con otra letra: hay que regenerar las fuentes con pyftsubset.
Uso: python3 pruebas/caracteres_fuentes.py [carpeta del sitio]"""
import os, sys
from fontTools.ttLib import TTFont
raiz = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..')
texto = open(os.path.join(raiz, 'index.html'), encoding='utf-8').read()
cmap = set()
for f in ('inter-400', 'jetbrains-mono-400'):
    cmap |= set(TTFont(os.path.join(raiz, 'fuentes', f + '.woff2')).getBestCmap())
# hasta U+2DFF: más allá son emojis y símbolos que siempre dibuja el sistema
print(''.join(sorted(set(c for c in texto if 126 < ord(c) < 0x2E00 and ord(c) not in cmap))))
