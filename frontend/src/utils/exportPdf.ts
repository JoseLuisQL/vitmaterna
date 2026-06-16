/**
 * VITMATERNA — Exportación de PDF cross-platform.
 *
 * El problema original: las pantallas llamaban a `Print.printToFileAsync` +
 * `Sharing.shareAsync` directamente. En WEB eso no funciona (expo-sharing no
 * está disponible en navegador), así que "Exportar PDF" fallaba en la web.
 *
 * Este helper resuelve ambas plataformas:
 *  - Web: inserta el HTML del reporte en un iframe oculto y dispara el diálogo
 *    de impresión del navegador (el usuario elige "Guardar como PDF").
 *  - Nativo (iOS/Android): genera el PDF con expo-print y abre la hoja de
 *    compartir con expo-sharing.
 *
 * Devuelve true si se completó (impresión/compartir abiertos), false si falló.
 */
import { Platform } from 'react-native';

interface ExportPdfOptions {
  /** HTML completo del documento a imprimir/convertir. */
  html: string;
  /** Nombre de archivo sugerido (sin extensión) para nativo y título web. */
  fileName?: string;
  /** Título del diálogo de compartir (nativo). */
  dialogTitle?: string;
}

/** Exporta un PDF a partir de HTML. Cross-platform. */
export async function exportPdf({
  html,
  fileName = 'reporte_vitmaterna',
  dialogTitle = 'Compartir reporte VITMATERNA',
}: ExportPdfOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return printHtmlOnWeb(html, fileName);
  }

  // Nativo: import diferido para no cargar módulos nativos en web.
  try {
    const Print = require('expo-print');
    const Sharing = require('expo-sharing');
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle,
      });
      return true;
    }
    // Sin capacidad de compartir: el archivo quedó generado igualmente.
    return true;
  } catch (err) {
    console.error('[exportPdf] Error al generar/compartir PDF:', err);
    return false;
  }
}

/**
 * Web: renderiza el HTML en un iframe oculto y abre el diálogo de impresión.
 * El navegador permite "Guardar como PDF" desde ese diálogo.
 */
function printHtmlOnWeb(html: string, title: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }
    try {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      // Fuera de pantalla pero "imprimible".
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head><body>${html}</body></html>`);
      doc.close();

      const cleanup = () => {
        // Pequeño retardo para no cortar el diálogo de impresión.
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1000);
      };

      // Esperar a que el iframe cargue su contenido antes de imprimir.
      let printed = false;
      const doPrint = () => {
        if (printed) return;
        printed = true;
        try {
          const win = iframe.contentWindow;
          if (!win) {
            cleanup();
            resolve(false);
            return;
          }
          win.focus();
          win.print();
          cleanup();
          resolve(true);
        } catch {
          cleanup();
          resolve(false);
        }
      };

      // onload puede no dispararse con document.write en algunos navegadores;
      // usamos un pequeño timeout como respaldo.
      iframe.onload = doPrint;
      setTimeout(doPrint, 400);
    } catch {
      resolve(false);
    }
  });
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
