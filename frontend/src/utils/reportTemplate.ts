/**
 * Plantilla profesional de reportes PDF para VITMATERNA.
 *
 * Genera el HTML que expo-print convierte a PDF, con un diseño cuidado:
 * membrete con marca, metadatos, tarjetas de KPI, indicadores MINSA con barras
 * de progreso vs meta, distribución de riesgo y tabla de pacientes prioritarias.
 * Pensado para imprimirse en A4 y compartirse.
 */

export interface ReportKpi {
  label: string;
  value: string | number;
}

export interface ReportMinsaIndicator {
  label: string;
  pct: number;
  meta: number;
}

export interface ReportRiskSlice {
  label: string;
  count: number;
  color: string;
}

export interface ReportPriorityRow {
  nombre: string;
  pct: number;
  riesgo: string;
}

export interface ClinicReportData {
  title?: string;
  subtitle?: string;
  facility?: string;
  preparedBy?: string;
  kpis: ReportKpi[];
  minsa: ReportMinsaIndicator[];
  risk: ReportRiskSlice[];
  priority: ReportPriorityRow[];
}

const BRAND = '#2C6EA8';
const BRAND_DARK = '#235980';
const INK = '#16242B';
const MUTED = '#566873';
const LINE = '#E7ECEE';
const SURFACE = '#F8FAFD';

/** Dibuja un donut SVG (proporciones) para incrustar en el PDF. */
function donutSvg(slices: ReportRiskSlice[], size = 132, thickness = 24): string {
  const total = slices.reduce((a, s) => a + s.count, 0);
  if (total <= 0) return '';
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  const segs = slices
    .filter((s) => s.count > 0)
    .map((s) => {
      const frac = s.count / total;
      const dash = frac * c;
      const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thickness}" stroke-dasharray="${dash} ${c - dash}" stroke-dashoffset="${-acc}" transform="rotate(-90 ${cx} ${cy})" />`;
      acc += dash;
      return el;
    })
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#EEF2F3" stroke-width="${thickness}" />
    ${segs}
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="26" font-weight="800" fill="${INK}">${total}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="9" fill="${MUTED}">gestantes</text>
  </svg>`;
}

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const riskColor = (riesgo: string): string => {
  const r = riesgo.toLowerCase();
  if (r.includes('rojo') || r.includes('alto')) return '#E5484D';
  if (r.includes('amarillo') || r.includes('medio')) return '#F5A623';
  return '#30A46C';
};

const riskLabel = (riesgo: string): string => {
  const r = riesgo.toLowerCase();
  if (r.includes('rojo') || r.includes('alto')) return 'Alto';
  if (r.includes('amarillo') || r.includes('medio')) return 'Medio';
  return 'Bajo';
};

export function buildClinicReportHtml(d: ClinicReportData): string {
  const now = new Date();
  const fecha = now.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const kpiCards = d.kpis
    .map(
      (k) => `
      <div class="kpi">
        <div class="kpi-value">${esc(k.value)}</div>
        <div class="kpi-label">${esc(k.label)}</div>
      </div>`,
    )
    .join('');

  const minsaRows = d.minsa
    .map((m) => {
      const ok = m.pct >= m.meta;
      const barColor = ok ? '#30A46C' : '#E5484D';
      const w = Math.max(0, Math.min(100, m.pct));
      return `
      <div class="minsa-row">
        <div class="minsa-head">
          <span class="minsa-label">${esc(m.label)}</span>
          <span class="minsa-pct" style="color:${barColor}">${esc(m.pct)}% <span class="minsa-meta">/ meta ${esc(m.meta)}%</span></span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${w}%;background:${barColor}"></div>
          <div class="bar-meta" style="left:${Math.min(100, m.meta)}%"></div>
        </div>
      </div>`;
    })
    .join('');

  const totalRisk = d.risk.reduce((a, r) => a + r.count, 0) || 1;
  const riskDonut = donutSvg(d.risk);
  const riskLegend = d.risk
    .map((r) => {
      const pct = Math.round((r.count / totalRisk) * 100);
      return `<div class="legend-row">
        <span class="dot" style="background:${r.color}"></span>
        <span class="legend-name">${esc(r.label)}</span>
        <span class="legend-val">${esc(r.count)} <span class="legend-pct">(${pct}%)</span></span>
      </div>`;
    })
    .join('');

  const priorityRows = d.priority
    .map(
      (p, i) => `
      <tr class="${i % 2 ? 'alt' : ''}">
        <td>${esc(p.nombre)}</td>
        <td class="center"><b style="color:${p.pct >= 80 ? '#30A46C' : p.pct >= 50 ? '#F5A623' : '#E5484D'}">${esc(p.pct)}%</b></td>
        <td class="center"><span class="pill" style="background:${riskColor(p.riesgo)}1A;color:${riskColor(p.riesgo)}">${esc(riskLabel(p.riesgo))}</span></td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: ${INK}; margin: 0; padding: 0; }
  .page { padding: 36px 40px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid ${BRAND}; padding-bottom: 16px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, ${BRAND}, ${BRAND_DARK}); color: #fff; font-weight: 800; font-size: 20px; display: flex; align-items: center; justify-content: center; }
  .brand-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; color: ${MUTED}; margin-top: 2px; }
  .meta { text-align: right; font-size: 11px; color: ${MUTED}; line-height: 1.5; }
  h1.report-title { font-size: 17px; margin: 22px 0 2px; }
  .report-sub { font-size: 12px; color: ${MUTED}; margin: 0 0 18px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${BRAND_DARK}; margin: 24px 0 12px; }
  .kpis { display: flex; gap: 12px; }
  .kpi { flex: 1; border: 1px solid ${LINE}; border-radius: 14px; padding: 16px 12px; text-align: center; background: ${SURFACE}; }
  .kpi-value { font-size: 27px; font-weight: 800; color: ${BRAND}; letter-spacing: -0.5px; }
  .kpi-label { font-size: 10px; color: ${MUTED}; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 600; }
  .risk-wrap { display: flex; align-items: center; gap: 24px; background: ${SURFACE}; border: 1px solid ${LINE}; border-radius: 14px; padding: 16px 20px; }
  .legend-list { flex: 1; }
  .legend-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid ${LINE}; font-size: 12px; }
  .legend-row:last-child { border-bottom: 0; }
  .legend-name { flex: 1; color: ${INK}; }
  .legend-val { font-weight: 700; color: ${INK}; }
  .legend-pct { color: ${MUTED}; font-weight: 600; font-size: 11px; }
  .minsa-row { margin-bottom: 14px; }
  .minsa-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
  .minsa-label { font-size: 12px; font-weight: 600; }
  .minsa-pct { font-size: 12px; font-weight: 700; }
  .minsa-meta { color: ${MUTED}; font-weight: 500; font-size: 10px; }
  .bar { position: relative; height: 9px; background: #F1F3F7; border-radius: 6px; overflow: visible; }
  .bar-fill { height: 100%; border-radius: 6px; }
  .bar-meta { position: absolute; top: -3px; width: 2px; height: 15px; background: ${INK}; opacity: 0.5; }
  .risk-bar { display: flex; height: 22px; border-radius: 8px; overflow: hidden; }
  .risk-seg { height: 100%; }
  .risk-legend { margin-top: 10px; font-size: 12px; color: ${INK}; }
  .legend { margin-right: 18px; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 5px; margin-right: 5px; vertical-align: middle; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
  th { text-align: left; background: ${BRAND}; color: #fff; padding: 9px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
  th.center, td.center { text-align: center; }
  td { padding: 9px 12px; border-bottom: 1px solid ${LINE}; }
  tr.alt td { background: #F8FAFD; }
  .pill { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid ${LINE}; font-size: 10px; color: ${MUTED}; display: flex; justify-content: space-between; }
</style></head>
<body><div class="page">
  <div class="header">
    <div class="brand">
      <div class="logo">V</div>
      <div>
        <div class="brand-name">VITMATERNA</div>
        <div class="brand-sub">Plataforma de salud materna prenatal</div>
      </div>
    </div>
    <div class="meta">
      <div><b>${esc(d.facility || 'C.S. Talavera — Apurímac')}</b></div>
      <div>Generado: ${esc(fecha)} · ${esc(hora)}</div>
      ${d.preparedBy ? `<div>Responsable: ${esc(d.preparedBy)}</div>` : ''}
    </div>
  </div>

  <h1 class="report-title">${esc(d.title || 'Reporte Clínico de Gestantes')}</h1>
  <p class="report-sub">${esc(d.subtitle || 'Resumen de indicadores de seguimiento prenatal')}</p>

  <div class="section-title">Resumen general</div>
  <div class="kpis">${kpiCards}</div>

  ${
    d.minsa.length
      ? `<div class="section-title">Indicadores MINSA / ENDES (vs meta)</div>${minsaRows}`
      : ''
  }

  ${
    d.risk.length
      ? `<div class="section-title">Distribución de riesgo</div>
         <div class="risk-wrap">
           <div>${riskDonut}</div>
           <div class="legend-list">${riskLegend}</div>
         </div>`
      : ''
  }

  ${
    d.priority.length
      ? `<div class="section-title">Pacientes con atención prioritaria</div>
         <table>
           <thead><tr><th>Gestante</th><th class="center">Adherencia</th><th class="center">Riesgo</th></tr></thead>
           <tbody>${priorityRows}</tbody>
         </table>`
      : ''
  }

  <div class="footer">
    <span>VITMATERNA · Documento generado automáticamente</span>
    <span>Confidencial — uso clínico autorizado</span>
  </div>
</div></body></html>`;
}
