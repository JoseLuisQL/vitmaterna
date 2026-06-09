import { gestantes } from "../../data/mockData";
import { calcularAdherencia } from "../../components/shared/AdherenciaBar";
import { SemaforoRiesgo } from "../../components/shared/SemaforoRiesgo";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, LineChart, Line,
} from "recharts";
import { Download, TrendingUp, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const COLORS_RISK = ["#22c55e", "#eab308", "#ef4444"];

export default function ReportesObstetra() {
  const adherencias = gestantes.map((g) => {
    const pct = g.suplementos.length > 0
      ? Math.round(g.suplementos.reduce((a, s) => a + calcularAdherencia(s.diasTomados, s.totalDias), 0) / g.suplementos.length)
      : 0;
    return { nombre: `${g.nombre} ${g.apellidos[0]}.`, pct, riesgo: g.riesgo };
  }).sort((a, b) => a.pct - b.pct);

  const distribucionRiesgo = [
    { name: "Sin riesgo", value: gestantes.filter((g) => g.riesgo === "verde").length },
    { name: "Riesgo mod.", value: gestantes.filter((g) => g.riesgo === "amarillo").length },
    { name: "Alto riesgo", value: gestantes.filter((g) => g.riesgo === "rojo").length },
  ];

  const adherenciaPromedio = Math.round(adherencias.reduce((a, g) => a + g.pct, 0) / adherencias.length);

  const asistenciaPorMes = [
    { mes: "Ene", asistidas: 8, programadas: 10 },
    { mes: "Feb", asistidas: 9, programadas: 11 },
    { mes: "Mar", asistidas: 7, programadas: 9 },
    { mes: "Abr", asistidas: 10, programadas: 12 },
    { mes: "May", asistidas: 11, programadas: 13 },
    { mes: "Jun", asistidas: 6, programadas: 8 },
  ];

  const kpisMinsa = [
    { label: "Gestantes con 6+ controles", pct: Math.round((gestantes.filter((g) => g.controles.length >= 6).length / gestantes.length) * 100), meta: 80 },
    { label: "Inicio en 1° trimestre", pct: 60, meta: 70 },
    { label: "Adherencia 80%+ a suplementos", pct: Math.round((gestantes.filter((g) => { if (!g.suplementos.length) return false; const p = g.suplementos.reduce((a, s) => a + calcularAdherencia(s.diasTomados, s.totalDias), 0) / g.suplementos.length; return p >= 80; }).length / gestantes.length) * 100), meta: 75 },
    { label: "Gestantes con 8+ controles", pct: Math.round((gestantes.filter((g) => g.controles.length >= 8).length / gestantes.length) * 100), meta: 60 },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-gray-900">Reportes y Estadísticas</h1>
        <button
          onClick={() => toast.success("Reporte PDF generado (simulado)")}
          className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          <Download size={13} /> Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total gestantes", value: gestantes.length, icon: Users, color: "text-rose-600" },
          { label: "Adherencia prom.", value: `${adherenciaPromedio}%`, icon: TrendingUp, color: "text-green-600" },
          { label: "Con 6+ controles", value: gestantes.filter((g) => g.controles.length >= 6).length, icon: CheckCircle, color: "text-blue-600" },
          { label: "En alto riesgo", value: gestantes.filter((g) => g.riesgo === "rojo").length, icon: Users, color: "text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-4">
            <Icon size={15} className={`${color} mb-2`} />
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-900 mb-3">Adherencia por gestante</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={adherencias} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar name="Adherencia" dataKey="pct" radius={3}>
              {adherencias.map((entry, i) => (
                <Cell key={`adh-${i}`} fill={entry.pct >= 80 ? "#22c55e" : entry.pct >= 50 ? "#eab308" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Distribución por riesgo</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie name="distribucion" data={distribucionRiesgo} cx="50%" cy="50%" outerRadius={60} dataKey="value" paddingAngle={3}>
                {distribucionRiesgo.map((_, i) => <Cell key={`risk-pie-${i}`} fill={COLORS_RISK[i]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Asistencia a controles (2026)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={asistenciaPorMes} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line name="Programadas" type="monotone" dataKey="programadas" stroke="#93c5fd" strokeWidth={1.5} />
              <Line name="Asistidas" type="monotone" dataKey="asistidas" stroke="#DB2777" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-900 mb-3">Indicadores MINSA / ENDES</div>
        <div className="flex flex-col gap-3">
          {kpisMinsa.map((kpi) => (
            <div key={kpi.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">{kpi.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${kpi.pct >= kpi.meta ? "text-green-700" : "text-red-600"}`}>{kpi.pct}%</span>
                  <span className="text-xs text-gray-400">meta: {kpi.meta}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${kpi.pct >= kpi.meta ? "bg-green-500" : "bg-red-400"}`}
                  style={{ width: `${kpi.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-900 mb-3">Gestantes con menor adherencia</div>
        <div className="divide-y divide-gray-100">
          {adherencias.slice(0, 3).map((g, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <SemaforoRiesgo nivel={g.riesgo} showLabel={false} size="sm" />
                <span className="text-sm text-gray-900">{g.nombre}</span>
              </div>
              <span className={`text-sm font-bold ${g.pct >= 80 ? "text-green-700" : g.pct >= 50 ? "text-amber-700" : "text-red-600"}`}>
                {g.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
