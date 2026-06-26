#!/usr/bin/env python3
"""
VITMATERNA — Validación (QA) de las capturas del manual.

Para cada captura cruda de cada rol:
  1. OCR (tesseract, español) del PNG.
  2. Verifica que aparezcan los textos ESPERADOS de esa pantalla (cobertura).
  3. Verifica que NO aparezcan textos de ONBOARDING (bienvenida/tour) que
     ensuciarían la captura.
  4. Valida la geometría de las marcas medidas (measured.json): dentro del
     viewport, tamaño razonable (no degeneradas, no abarcan toda la pantalla).

Emite un informe Markdown + código de salida (0 = todo OK).
Uso: python3 05_validate.py
"""
import os
import json
import subprocess
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Textos que JAMÁS deben aparecer (indican que el onboarding tapó la captura)
ONBOARDING = ["Conocer la app", "Explorar por mi cuenta", "Bienvenida a VITMATERNA",
              "Salir del recorrido", "Conoce tu app en 1 minuto", "Conoce tu panel"]

# Por rol: { shot_id: {raw, expect:[textos], min_hits} }
EXPECT = {
    "gestante": {
        "raw_dir": "screens_raw", "measured": "measured.json",
        "shots": {
            "A1": ["Hola", "embarazo", "cita"], "A1b": ["Reportar", "Emergencia", "Educa"],
            "A1c": ["Confirmar"], "MENU": ["Educa", "perfil"], "A2": ["cita"],
            "A3": ["adherencia"], "A3b": ["tomado"], "A4": ["mensaje"],
            "A5": ["Educa"], "A5b": ["semana"], "A7": ["perfil", "datos"],
            "A7b": ["Nombres", "FUM"], "A7c": ["notificaci"], "A6": ["alarma"],
        },
    },
    "obstetra": {
        "raw_dir": "obstetra_raw", "measured": "obstetra.measured.json",
        "shots": {
            "B1": ["Citas", "riesgo"], "B1b": ["Citas"], "B2": ["Buscar"],
            "B2b": ["gestante"], "B3": ["Buscar"], "B4": ["Pacientes"],
            "B4b": ["Pacientes", "MINSA"], "B5": ["Buscar"], "B6": ["perfil"],
        },
    },
    "admin": {
        "raw_dir": "admin_raw", "measured": "admin.measured.json",
        "shots": {
            "C1": ["Resumen"], "C1b": ["Estado", "Gesti"], "C2": ["Buscar"],
            "C3": ["Buscar"], "C4": ["SMS"], "C5": ["Accesos"],
            "C6": ["establecimiento"], "C7": ["CREAR", "LOGIN", "Por"],
        },
    },
}


def ocr(path):
    try:
        out = subprocess.run(["tesseract", path, "stdout", "-l", "spa"],
                             capture_output=True, text=True, timeout=60)
        return out.stdout.lower()
    except Exception as e:
        return f"__error__ {e}"


def validate_geom(rect, vw, vh):
    """Marca válida: dentro del viewport (px = css*dpr), tamaño razonable."""
    issues = []
    W, H = vw * 2, vh * 2  # dpr=2
    if rect["w"] < 30 or rect["h"] < 20:
        issues.append("muy pequeña")
    if rect["w"] >= W * 0.99 and rect["h"] >= H * 0.95:
        issues.append("abarca toda la pantalla")
    if rect["x"] < -5 or rect["y"] < -5 or rect["x"] + rect["w"] > W + 10 or rect["y"] + rect["h"] > H + 50:
        issues.append("fuera del viewport")
    return issues


def main():
    report = ["# Informe de validación — Manuales VITMATERNA\n"]
    total, passed = 0, 0
    geom_total, geom_ok = 0, 0
    onboarding_clean = True

    for role, cfg in EXPECT.items():
        report.append(f"\n## Rol: {role}\n")
        raw_dir = os.path.join(BASE, "assets", cfg["raw_dir"])
        measured = json.load(open(os.path.join(BASE, "manifest", cfg["measured"]), encoding="utf-8"))
        report.append("| Captura | Pantalla correcta | Sin onboarding | Marcas (geom.) |")
        report.append("|---|---|---|---|")
        for sid, expects in cfg["shots"].items():
            total += 1
            png = os.path.join(raw_dir, f"{sid}.png")
            if not os.path.exists(png):
                report.append(f"| {sid} | ❌ falta PNG | — | — |")
                continue
            text = ocr(png)
            hits = sum(1 for e in expects if e.lower() in text)
            ok_screen = hits >= max(1, len(expects) - 1)  # tolera 1 término no detectado por OCR
            # onboarding
            onb = [o for o in ONBOARDING if o.lower() in text]
            ok_onb = len(onb) == 0
            if not ok_onb:
                onboarding_clean = False
            # geometría de marcas
            rects = measured.get(sid, {}).get("rects", {})
            vw = measured.get(sid, {}).get("vw", 390) or 390
            vh = measured.get(sid, {}).get("vh", 844) or 844
            gissues = []
            for k, r in rects.items():
                geom_total += 1
                iss = validate_geom(r, vw, vh)
                if iss:
                    gissues.append(f"{k}: {','.join(iss)}")
                else:
                    geom_ok += 1
            if ok_screen:
                passed += 1
            sc = "✅" if ok_screen else f"⚠️ ({hits}/{len(expects)})"
            oc = "✅" if ok_onb else f"❌ {onb}"
            gm = "✅ " + str(len(rects)) if not gissues else "⚠️ " + "; ".join(gissues)
            report.append(f"| {sid} | {sc} | {oc} | {gm} |")

    report.insert(1, f"\n**Resumen:** pantallas correctas {passed}/{total} · "
                     f"marcas con geometría válida {geom_ok}/{geom_total} · "
                     f"onboarding {'LIMPIO ✅' if onboarding_clean else 'PRESENTE ❌'}\n")

    out = os.path.join(BASE, "build", "INFORME_VALIDACION.md")
    open(out, "w", encoding="utf-8").write("\n".join(report))
    print("\n".join(report))
    print(f"\n📄 Informe: {out}")
    # éxito si: todas las pantallas correctas, onboarding limpio, geometría >= 95%
    ok = (passed == total) and onboarding_clean and (geom_total == 0 or geom_ok / geom_total >= 0.95)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
