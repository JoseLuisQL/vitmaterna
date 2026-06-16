/**
 * VITMATERNA — Exportación de Excel (.xlsx) cross-platform con SheetJS.
 *
 * Genera un libro .xlsx real (no CSV) con una o varias hojas. Resuelve ambas
 * plataformas:
 *  - Web: construye el binario y dispara la descarga del navegador.
 *  - Nativo (iOS/Android): escribe el archivo en documentDirectory (base64) y
 *    abre la hoja de compartir con expo-sharing.
 *
 * Cada hoja se define como matriz de filas (AOA: array of arrays), donde la
 * primera fila suele ser la cabecera. Esto evita problemas de orden de claves.
 *
 *   await exportExcel('reporte', [
 *     { name: 'Resumen', rows: [['Métrica','Valor'], ['Total', 42]] },
 *     { name: 'MINSA',   rows: [['Indicador','%'], ['APN', 88]] },
 *   ]);
 */
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

export interface ExcelSheet {
  /** Nombre de la pestaña (máx. 31 caracteres; se recorta). */
  name: string;
  /** Filas como matriz; primera fila = cabecera por convención. */
  rows: (string | number | null | undefined)[][];
  /** Anchos de columna opcionales (en caracteres). */
  colWidths?: number[];
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Sanea el nombre de hoja (Excel: máx 31 chars, sin []*?/\\:). */
function safeSheetName(name: string): string {
  return (name || 'Hoja').replace(/[[\]*?/\\:]/g, ' ').slice(0, 31);
}

/**
 * Exporta un libro .xlsx. Devuelve true si se completó (descarga/compartir).
 * @param fileName nombre sin extensión.
 */
export async function exportExcel(fileName: string, sheets: ExcelSheet[]): Promise<boolean> {
  try {
    const wb = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const ws = XLSX.utils.aoa_to_sheet(
        sheet.rows.map((r) => r.map((c) => (c == null ? '' : c))),
      );
      if (sheet.colWidths && sheet.colWidths.length) {
        ws['!cols'] = sheet.colWidths.map((w) => ({ wch: w }));
      }
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheet.name));
    }

    const fullName = `${fileName}.xlsx`;

    if (Platform.OS === 'web') {
      // Genera ArrayBuffer y descarga vía Blob.
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      if (typeof document === 'undefined') return false;
      const blob = new Blob([wbout], { type: MIME_XLSX });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fullName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    }

    // Nativo: escribir en base64 y compartir.
    // Expo SDK 56 movió la API clásica (documentDirectory/writeAsStringAsync) a
    // 'expo-file-system/legacy'. Usarla evita que documentDirectory sea undefined
    // (causa del fallo "no se puede generar" en Android).
    const FileSystem = require('expo-file-system/legacy');
    const Sharing = require('expo-sharing');
    const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const fileUri = `${dir}${fullName}`;
    await FileSystem.writeAsStringAsync(fileUri, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: MIME_XLSX, dialogTitle: 'Exportar Excel' });
      return true;
    }
    return true;
  } catch (err) {
    console.error('[exportExcel] Error al exportar Excel:', err);
    return false;
  }
}
