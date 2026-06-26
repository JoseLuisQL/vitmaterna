#!/usr/bin/env bash
# VITMATERNA — Pipeline completo del manual (los 3 roles), con índice numerado.
#   1. build DOCX (con marcador [[TOC]])
#   2. 07_build_toc.py: 2 pasadas (mide páginas + escribe índice) → PDF final
set -e
cd "$(dirname "$0")/.."
SC=scripts
B=build

echo "▶ Gestante"
python3 $SC/03_build_docx.py
python3 $SC/07_build_toc.py "$B/manual_usuario_gestante_vitmaterna_movil.docx" manifest/gestante.toc.json

for ROLE in obstetra admin; do
  echo "▶ ${ROLE^}"
  python3 $SC/03b_build_role.py "$ROLE"
  # construir lista de títulos (H1 fijos + secciones del content.json)
  python3 - "$ROLE" <<'PY'
import json, sys
role = sys.argv[1]
c = json.load(open(f"manifest/{role}.content.json", encoding="utf-8"))
fixed_pre = ["Créditos y confidencialidad","Índice de contenidos","1. Introducción","2. Antes de empezar","3. Acceso al sistema"]
fixed_post = ["Solución de problemas","Preguntas frecuentes","Glosario","Soporte y contacto"]
titles = [[t,1] for t in fixed_pre]
for s in c["sections"]:
    lvl = 2 if s["h"].split(" ")[0].count(".")>=1 else 1
    titles.append([s["h"], lvl])
titles += [[t,1] for t in fixed_post]
json.dump(titles, open(f"manifest/{role}.toc.json","w"), ensure_ascii=False)
print(f"   {role}: {len(titles)} títulos")
PY
  python3 $SC/07_build_toc.py "$B/manual_usuario_${ROLE}_vitmaterna_movil.docx" "manifest/${ROLE}.toc.json"
done

echo "✅ Pipeline completo. PDFs y DOCX en $B/"
ls -la $B/*.pdf
