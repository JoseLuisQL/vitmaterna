#!/usr/bin/env python3
"""
VITMATERNA — Anotación PRECISA de capturas (gestante) para el manual.

Consume manifest/measured.json (rectángulos reales medidos con
getBoundingClientRect, en píxeles de la imagen) y para cada captura:
  - dibuja un recuadro de realce redondeado EXACTO sobre el elemento,
  - coloca la marca de paso numerada ①②③ pegada a la esquina del elemento
    (no encima del texto), con halo blanco para legibilidad,
  - encapsula todo en un marco de smartphone.

Las marcas caen pixel-perfect porque usan las coordenadas reales del control.
Reproducible: `python3 02_annotate.py`.
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

import sys
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROLE = sys.argv[1] if len(sys.argv) > 1 else "gestante"
if ROLE == "gestante":
    RAW = os.path.join(BASE, "assets", "screens_raw")
    OUT = os.path.join(BASE, "assets", "screens_annotated")
    MEASURED = os.path.join(BASE, "manifest", "measured.json")
else:
    RAW = os.path.join(BASE, "assets", f"{ROLE}_raw")
    OUT = os.path.join(BASE, "assets", f"{ROLE}_annotated")
    MEASURED = os.path.join(BASE, "manifest", f"{ROLE}.measured.json")
os.makedirs(OUT, exist_ok=True)

ACCENT = (214, 69, 69)       # rojo de realce (#D64545)
FRAME = (22, 36, 43)         # bisel del teléfono
WHITE = (255, 255, 255)
SHADOW = (0, 0, 0)
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def font(sz):
    return ImageFont.truetype(FONT_BOLD, sz)


def draw_marker(d, cx, cy, n, color, r):
    d.ellipse([cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3], fill=WHITE)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    f = font(int(r * 1.2))
    s = str(n)
    tb = d.textbbox((0, 0), s, font=f)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    d.text((cx - tw / 2 - tb[0], cy - th / 2 - tb[1]), s, fill=WHITE, font=f)


def annotate(img, rects, W, H):
    img = img.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    r = max(int(W * 0.040), 22)
    lw = max(int(W * 0.007), 4)
    pad = max(int(W * 0.010), 5)
    # ordenar por número de marca
    items = sorted(rects.values(), key=lambda v: v.get("mark", 99))
    for v in items:
        x, y, w, h = v["x"], v["y"], v["w"], v["h"]
        # clamp al lienzo
        x0, y0 = max(x - pad, 2), max(y - pad, 2)
        x1, y1 = min(x + w + pad, W - 2), min(y + h + pad, H - 2)
        if v.get("box", True):
            d.rounded_rectangle([x0, y0, x1, y1], radius=int(W * 0.025), outline=ACCENT, width=lw)
        # marca en la esquina superior izquierda del elemento (no tapa el texto)
        if "mark" in v:
            draw_marker(d, x0, y0, v["mark"], ACCENT, r)
    return Image.alpha_composite(img, overlay).convert("RGB")


def add_phone_frame(img):
    W, H = img.size
    bezel = max(int(W * 0.045), 28)
    top = int(bezel * 1.4)
    bottom = int(bezel * 1.4)
    radius = int(W * 0.11)
    inner = int(W * 0.06)
    FW, FH = W + bezel * 2, H + top + bottom
    frame = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle([0, 0, FW, FH], radius=radius, fill=FRAME)
    screen = img.convert("RGBA")
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W, H], radius=inner, fill=255)
    frame.paste(screen, (bezel, top), mask)
    nw, nh = int(W * 0.34), int(top * 0.5)
    nx, ny = (FW - nw) // 2, int(top * 0.28)
    d.rounded_rectangle([nx, ny, nx + nw, ny + nh], radius=nh // 2, fill=(0, 0, 0))
    bw = int(W * 0.36)
    bx, by = (FW - bw) // 2, FH - int(bottom * 0.55)
    d.rounded_rectangle([bx, by, bx + bw, by + max(6, int(bottom * 0.10))], radius=6, fill=(120, 130, 135))
    return frame.convert("RGB")


def main():
    measured = json.load(open(MEASURED, encoding="utf-8"))
    n = 0
    for sid, data in measured.items():
        raw = os.path.join(RAW, f"{sid}.png")
        if not os.path.exists(raw):
            print(f"⚠️  falta {sid}.png")
            continue
        img = Image.open(raw)
        W, H = img.size
        img = annotate(img, data.get("rects", {}), W, H)
        img = add_phone_frame(img)
        img.save(os.path.join(OUT, f"{sid}.png"), "PNG")
        n += 1
        print(f"✅ {sid}.png  marcas={len(data.get('rects', {}))}")
    print(f"\nTotal: {n} capturas anotadas")


if __name__ == "__main__":
    main()
