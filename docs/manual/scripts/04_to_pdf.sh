#!/usr/bin/env bash
# VITMATERNA — Convierte el DOCX del manual a PDF con LibreOffice headless.
set -e
BUILD_DIR="$(cd "$(dirname "$0")/../build" && pwd)"
DOCX="$BUILD_DIR/manual_usuario_gestante_vitmaterna_movil.docx"

# Perfil temporal para LibreOffice headless (evita choques de sesión)
PROFILE=$(mktemp -d)
soffice --headless --norestore \
  -env:UserInstallation="file://$PROFILE" \
  --convert-to pdf --outdir "$BUILD_DIR" "$DOCX" 2>&1 | tail -3
rm -rf "$PROFILE"
ls -la "$BUILD_DIR"/*.pdf
