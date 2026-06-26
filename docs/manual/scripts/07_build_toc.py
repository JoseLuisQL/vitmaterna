#!/usr/bin/env python3
"""
VITMATERNA — Índice (TOC) con números de página REALES, determinista.

python-docx no calcula los números de página del campo TOC (los hace Word al
abrir). Para un PDF/DOCX entregable con índice completo:

  1. Se construye el DOCX con un MARCADOR de índice (párrafo "[[TOC]]").
  2. Se exporta a PDF (LibreOffice) — pasada 1.
  3. Se busca, con pdftotext por página, en qué página cae cada título.
  4. Se REEMPLAZA el marcador por una tabla de índice (título … página) y se
     reexporta el PDF — pasada 2.

Uso: python3 07_build_toc.py <ruta_docx> <lista_de_titulos.json>
"""
import sys
import os
import json
import subprocess
from docx import Document
from docx.shared import Pt, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ACCENT = RGBColor(0x0C, 0x81, 0x74)
INK = RGBColor(0x16, 0x24, 0x2B)


def docx_to_pdf(docx, outdir):
    prof = subprocess.run(["mktemp", "-d"], capture_output=True, text=True).stdout.strip()
    subprocess.run(["soffice", "--headless", "--norestore",
                    f"-env:UserInstallation=file://{prof}",
                    "--convert-to", "pdf", "--outdir", outdir, docx],
                   capture_output=True, timeout=120)
    return docx.replace(".docx", ".pdf")


def page_of_titles(pdf, titles):
    """Devuelve {titulo: pagina} usando pdftotext por página."""
    txt = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True).stdout
    pages = txt.split("\f")
    result = {}
    for t in titles:
        for i, pg in enumerate(pages, start=1):
            if t in pg and t not in result:
                result[t] = i
                break
    return result


def add_dotted_toc_row(doc_table, title, page, level):
    row = doc_table.add_row()
    c0, c1 = row.cells
    p = c0.paragraphs[0]
    indent = "    " * (level - 1)
    r = p.add_run(f"{indent}{title}")
    r.font.size = Pt(11 if level == 1 else 10)
    r.font.bold = (level == 1)
    r.font.color.rgb = ACCENT if level == 1 else INK
    p2 = c1.paragraphs[0]
    p2.alignment = 2  # right
    rr = p2.add_run(str(page)); rr.font.size = Pt(10); rr.font.color.rgb = INK


def replace_marker_with_toc(docx, toc_map, titles_levels):
    doc = Document(docx)
    # localizar el párrafo marcador
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip() == "[[TOC]]":
            # limpiar el texto del marcador
            for r in list(p.runs):
                r.text = ""
            # insertar tabla justo después
            tbl = doc.add_table(rows=0, cols=2)
            tbl.allow_autofit = True
            # mover la tabla a la posición del marcador
            p._p.addnext(tbl._tbl)
            # anchos
            for title, level in titles_levels:
                if title in toc_map:
                    add_dotted_toc_row(tbl, title, toc_map[title], level)
            break
    doc.save(docx)


def main():
    docx = sys.argv[1]
    titles_levels = json.loads(open(sys.argv[2], encoding="utf-8").read())
    outdir = os.path.dirname(docx)
    titles = [t for t, _ in titles_levels]
    # pasada 1
    pdf = docx_to_pdf(docx, outdir)
    toc_map = page_of_titles(pdf, titles)
    # reemplazar marcador
    replace_marker_with_toc(docx, toc_map, titles_levels)
    # pasada 2 (con el índice ya numerado)
    docx_to_pdf(docx, outdir)
    print(f"✅ TOC con {len(toc_map)} entradas numeradas en {os.path.basename(docx)}")
    for t, _ in titles_levels:
        if t in toc_map:
            print(f"   {toc_map[t]:>3}  {t}")


if __name__ == "__main__":
    main()
