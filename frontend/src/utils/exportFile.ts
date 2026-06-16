/**
 * Exportación de archivos compatible con móvil y web.
 *
 * - Web: genera un Blob y dispara la descarga del navegador.
 * - Móvil (iOS/Android): escribe el archivo en documentDirectory y abre la hoja
 *   de compartir del sistema (expo-file-system + expo-sharing).
 *
 * Incluye un helper para construir CSV (con escape correcto y BOM para que
 * Excel respete los acentos en español).
 */
import { Platform } from 'react-native';

/** Construye una cadena CSV a partir de cabeceras y filas. */
export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (cell: string | number): string => {
    const s = String(cell ?? '');
    // Si contiene coma, comillas o salto de línea, se entrecomilla y se duplican comillas.
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))];
  // BOM UTF-8 para que Excel muestre bien los acentos.
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Exporta contenido de texto como archivo descargable/compartible.
 * @returns true si se completó (descarga web o apertura de share), false si falló.
 */
export async function exportTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch {
      return false;
    }
  }

  // Nativo: import diferido para no cargar módulos nativos en web.
  // SDK 56: API clásica en 'expo-file-system/legacy'.
  try {
    const FileSystem = require('expo-file-system/legacy');
    const Sharing = require('expo-sharing');
    const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const fileUri = `${dir}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: 'Exportar datos' });
      return true;
    }
    return false;
  } catch (err) {
    console.error('[exportTextFile] Error al exportar archivo:', err);
    return false;
  }
}
