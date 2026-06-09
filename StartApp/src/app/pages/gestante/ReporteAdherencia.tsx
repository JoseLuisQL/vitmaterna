import { useAuth } from "../../context/AuthContext";
import { gestantes } from "../../data/mockData";
import { calcularAdherencia } from "../../components/shared/AdherenciaBar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Award, Flame, TrendingUp } from "lucide-react";

function calcularRacha(diasTomados: string[]): number {
  const hoy = new Date();
  let racha = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    const fecha = d.toISOString().split("T")[0];
    if (diasTomados.includes(fecha)) racha++;
    else if (i === 0) continue;
    else break;
  }
  return racha;
}

function calcularPorSemana(diasTomados: string[]): { semana: string; pct: number }[] {
  const semanas: { semana: string; pct: number }[] = [];
  const hoy = new Date();
  for (let s = 3; s >= 0; s--) {
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - (s + 1) * 7);
    let tomados = 0;
    for (let d = 0; d < 7; d++) {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + d);
      if (diasTomados.includes(dia.toISOString().split("T")[0])) tomados++;
    }
    semanas.push({ semana: `Sem ${4 - s}`, pct: Math.round((tomados / 7) * 100) });
  }
  return semanas;
}

export default function ReporteAdherencia() {
  const { user } = useAuth();
  const gestante = gestantes.find((g) => g.id === user?.gestanteId) ?? gestantes[0];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="font-semibold text-gray-900">Mi Reporte de Adherencia</h1>

      {gestante.suplementos.map((sup) => {
        const pct = Math.round(calcularAdherencia(sup.diasTomados, sup.totalDias));
        const racha = calcularRacha(sup.diasTomados);
        const porSemana = calcularPorSemana(sup.diasTomados);
        const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";

        return (
          <div key={sup.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="font-medium text-gray-900 text-sm mb-4">{sup.nombre}</div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center bg-gray-50 border border-gray-100 rounded-md p-3">
                <div className="text-xl font-bold" style={{ color }}>{pct}%</div>
                <div className="text-xs text-gray-400 mt-0.5">adherencia</div>
              </div>
              <div className="text-center bg-gray-50 border border-gray-100 rounded-md p-3">
                <div className="flex items-center justify-center gap-1">
                  <Flame size={14} className="text-orange-500" />
                  <span className="text-xl font-bold text-gray-900">{racha}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">días seguidos</div>
              </div>
              <div className="text-center bg-gray-50 border border-gray-100 rounded-md p-3">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp size={12} className="text-green-600" />
                  <span className="text-xl font-bold text-gray-900">{sup.diasTomados.length}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">días tomados</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Adherencia por semana</div>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={porSemana} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar name="Adherencia" dataKey="pct" radius={3}>
                    {porSemana.map((entry, index) => (
                      <Cell
                        key={`cell-${sup.id}-${index}`}
                        fill={entry.pct >= 80 ? "#22c55e" : entry.pct >= 50 ? "#eab308" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {pct >= 80 ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-start gap-2">
                <Award size={14} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-green-800 text-sm">Excelente adherencia</div>
                  <div className="text-green-600 text-xs mt-0.5">Está cuidando muy bien su embarazo.</div>
                </div>
              </div>
            ) : pct >= 50 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="font-medium text-amber-800 text-sm">Adherencia regular</div>
                <div className="text-amber-700 text-xs mt-0.5">Intente tomar su suplemento todos los días.</div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="font-medium text-red-800 text-sm">Adherencia baja</div>
                <div className="text-red-700 text-xs mt-0.5">Su obstetra ha sido notificada. Por favor, converse en su próxima cita.</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
