/**
 * VITMATERNA — Exportación de Excel (.xlsx) con DISEÑO, cross-platform.
 *
 * Usa `xlsx-js-style` (fork de SheetJS que SÍ aplica estilos de celda: colores,
 * negritas, bordes, alineación y formatos). La librería community `xlsx` genera
 * el binario pero ignora todo el estilo → por eso el archivo salía "plano".
 *
 * Resuelve ambas plataformas:
 *  - Web: construye el binario y dispara la descarga del navegador.
 *  - Nativo (iOS/Android): escribe el archivo en documentDirectory (base64) y
 *    abre la hoja de compartir con expo-sharing.
 *
 * Cada hoja se define como matriz de filas (AOA). La primera fila se trata como
 * cabecera y se estiliza con la banda de marca; el resto recibe bordes, bandeo
 * de filas y formato numérico/porcentaje automático.
 *
 *   await exportExcel('reporte', [
 *     { name: 'MINSA', rows: [['Indicador','%'], ['APN', 88]], colWidths: [34, 12] },
 *   ]);
 */
import { Platform } from 'react-native';
import * as XLSX from 'xlsx-js-style';

export interface ExcelSheet {
  /** Nombre de la pestaña (máx. 31 caracteres; se recorta). */
  name: string;
  /** Filas como matriz; primera fila = cabecera por convención. */
  rows: (string | number | null | undefined)[][];
  /** Anchos de columna opcionales (en caracteres). */
  colWidths?: number[];
  /**
   * Título opcional de la hoja: se inserta una banda de marca arriba que ocupa
   * todo el ancho de la tabla. Si se omite, se usa "VITMATERNA".
   */
  title?: string;
  /** Subtítulo opcional bajo el título. */
  subtitle?: string;
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ── Paleta de marca VITMATERNA (sin '#', formato ARGB que usa la librería) ──
const NAVY = 'FF16323A'; // banda de título
const ACCENT = 'FF0C8174'; // cabecera de tabla (teal)
const BAND = 'FFF1F6F5'; // filas alternas
const INK = 'FF16242B';
const WHITE = 'FFFFFFFF';
const SOFT = 'FFBFE0DB';
const LINE = 'FFDCE5E4';

const thinBorder = {
  top: { style: 'thin', color: { rgb: LINE } },
  bottom: { style: 'thin', color: { rgb: LINE } },
  left: { style: 'thin', color: { rgb: LINE } },
  right: { style: 'thin', color: { rgb: LINE } },
} as const;

/** Sanea el nombre de hoja (Excel: máx 31 chars, sin []*?/\\:). */
function safeSheetName(name: string): string {
  return (name || 'Hoja').replace(/[[\]*?/\\:]/g, ' ').slice(0, 31);
}

/** ¿La celda parece un porcentaje? (valores 0–100 en columnas de %). */
function looksLikePercentHeader(h: unknown): boolean {
  const s = String(h ?? '').toLowerCase();
  return s.includes('%') || s.includes('adherencia') || s.includes('porcentaje');
}

/**
 * Exporta un libro .xlsx con diseño. Devuelve true si se completó.
 * @param fileName nombre sin extensión.
 */
export async function exportExcel(fileName: string, sheets: ExcelSheet[]): Promise<boolean> {
  try {
    const wb = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const body = sheet.rows.map((r) => r.map((c) => (c == null ? '' : c)));
      const nCols = Math.max(1, ...body.map((r) => r.length));
      const title = sheet.title ?? 'VITMATERNA';
      const subtitle = sheet.subtitle ?? 'Plataforma de salud materna prenatal';

      // Estructura: [título][subtítulo][espacio] + tabla. Reservamos 3 filas arriba.
      const TOP = 3;
      const aoa: (string | number)[][] = [
        [title],
        [subtitle],
        [],
        ...body,
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Anchos de columna.
      const widths = sheet.colWidths && sheet.colWidths.length
        ? sheet.colWidths
        : Array(nCols).fill(18);
      ws['!cols'] = widths.map((w) => ({ wch: w }));

      // Alturas: banda de título alta, cabecera media.
      ws['!rows'] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 6 }];

      // Merges: título y subtítulo ocupan todo el ancho.
      const lastColIdx = nCols - 1;
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
      ];

      // ── Estilos ──
      // Banda de título (fila 0) y subtítulo (fila 1).
      for (let c = 0; c < nCols; c++) {
        const titleAddr = XLSX.utils.encode_cell({ r: 0, c });
        if (!ws[titleAddr]) ws[titleAddr] = { t: 's', v: '' };
        ws[titleAddr].s = {
          fill: { fgColor: { rgb: NAVY } },
          font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: WHITE } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
        };
        const subAddr = XLSX.utils.encode_cell({ r: 1, c });
        if (!ws[subAddr]) ws[subAddr] = { t: 's', v: '' };
        ws[subAddr].s = {
          fill: { fgColor: { rgb: NAVY } },
          font: { name: 'Calibri', sz: 9, color: { rgb: SOFT } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
        };
        const gapAddr = XLSX.utils.encode_cell({ r: 2, c });
        if (!ws[gapAddr]) ws[gapAddr] = { t: 's', v: '' };
        ws[gapAddr].s = { fill: { fgColor: { rgb: WHITE } } };
      }

      // Cabecera de la tabla (primera fila del body → fila TOP en el sheet).
      const headerRow = sheet.rows[0] ?? [];
      const headerR = TOP;
      for (let c = 0; c < nCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerR, c });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        ws[addr].s = {
          fill: { fgColor: { rgb: ACCENT } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: WHITE } },
          alignment: { horizontal: c === 0 ? 'left' : 'center', vertical: 'center', wrapText: true, indent: c === 0 ? 1 : 0 },
          border: thinBorder,
        };
      }

      // Filas de datos: bordes, bandeo, alineación y formato numérico.
      const dataStart = TOP + 1;
      const dataEnd = TOP + (sheet.rows.length - 1);
      for (let r = dataStart; r <= dataEnd; r++) {
        const banded = (r - dataStart) % 2 === 1;
        for (let c = 0; c < nCols; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (!ws[addr]) ws[addr] = { t: 's', v: '' };
          const cell = ws[addr];
          const isNum = typeof cell.v === 'number';
          // Formato: % si la cabecera de esa columna lo sugiere; si no, miles.
          if (isNum) {
            cell.z = looksLikePercentHeader(headerRow[c]) ? '0.0' : '#,##0';
          }
          cell.s = {
            fill: { fgColor: { rgb: banded ? BAND : WHITE } },
            font: { name: 'Calibri', sz: 10, color: { rgb: INK } },
            alignment: {
              horizontal: c === 0 ? 'left' : isNum ? 'right' : 'center',
              vertical: 'center',
              indent: c === 0 ? 1 : 0,
            },
            border: thinBorder,
          };
        }
      }

      // Congelar la cabecera de la tabla para listas largas.
      ws['!freeze'] = { xSplit: 0, ySplit: dataStart };

      XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheet.name));
    }

    const fullName = `${fileName}.xlsx`;

    if (Platform.OS === 'web') {
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
