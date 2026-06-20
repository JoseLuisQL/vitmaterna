#!/usr/bin/env bash
# VITMATERNA — QA visual reproducible (Fase 5 · Capa 4)
#
# Recorre las rutas accesibles del portal web y captura screenshots para
# revisión/regresión visual. Requiere el servidor web de Expo en marcha
# (npm run web) y la CLI `agent-browser` disponible.
#
# Uso:
#   bash scripts/qa-visual.sh [BASE_URL] [OUT_DIR]
# Por defecto: BASE_URL=http://localhost:8081  OUT_DIR=/tmp/vitmaterna-qa
#
# Nota: las pantallas tras login requieren sesión; este guion captura las rutas
# públicas y deja anotado el recorrido autenticado para hacerlo manualmente o en
# CI con credenciales de prueba.
set -euo pipefail

BASE_URL="${1:-http://localhost:8081}"
OUT_DIR="${2:-/tmp/vitmaterna-qa}"
mkdir -p "$OUT_DIR"

shot() {
  local name="$1"
  echo "· capturando $name"
  sleep 6
  agent-browser screenshot "$OUT_DIR/$name.png" >/dev/null 2>&1 || echo "  (no se pudo capturar $name)"
}

echo "QA visual → $BASE_URL (salida: $OUT_DIR)"
agent-browser open "$BASE_URL/" >/dev/null 2>&1 || true
shot "01-login"

# Rutas públicas adicionales (auth)
agent-browser open "$BASE_URL/register" >/dev/null 2>&1 || true
shot "02-register"
agent-browser open "$BASE_URL/forgot-password" >/dev/null 2>&1 || true
shot "03-forgot-password"

echo ""
echo "Recorrido autenticado (manual / con credenciales de prueba):"
echo "  gestante : Inicio · Citas · Tratamiento · Chat · Educación · Perfil"
echo "  obstetra : Inicio · Gestantes · Agenda · Chat · Reportes · Ficha · Perfil"
echo "  admin    : Inicio · Usuarios · Contenido · Sedes · Config · Supervisión"
echo ""
echo "Listo. Revisa los PNG en $OUT_DIR"
