import { useNavigate } from "react-router";
import { gestantes, alertasPendientes, citasDeHoy } from "../../data/mockData";
import { SemaforoRiesgo } from "../../components/shared/SemaforoRiesgo";
import { calcularAdherencia } from "../../components/shared/AdherenciaBar";
import { Users, CalendarCheck, AlertTriangle, TrendingUp, ChevronRight, Bell } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

export default function DashboardObstetra() {
  const navigate = useNavigate();
  const totalGestantes = gestantes.length;
  const enRiesgo = gestantes.filter((g) => g.riesgo !== "verde").length;

  const adherenciaPromedio = Math.round(
    gestantes.reduce((acc, g) => {
      if (g.suplementos.length === 0) return acc;
      const pct = g.suplementos.reduce((a, s) => a + calcularAdherencia(s.diasTomados, s.totalDias), 0) / g.suplementos.length;
      return acc + pct;
    }, 0) / totalGestantes
  );

  const distribucion = [
    { name: "Sin riesgo", value: gestantes.filter((g) => g.riesgo === "verde").length },
    { name: "Moderado", value: gestantes.filter((g) => g.riesgo === "amarillo").length },
    { name: "Alto riesgo", value: gestantes.filter((g) => g.riesgo === "rojo").length },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">

      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-gray-900">Dashboard</h1>
        <span className="text-xs text-gray-400">{new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Gestantes activas", value: totalGestantes, color: "text-rose-600" },
          { icon: CalendarCheck, label: "Citas hoy", value: citasDeHoy.length, color: "text-blue-600" },
          { icon: AlertTriangle, label: "En riesgo", value: enRiesgo, color: "text-amber-600" },
          { icon: TrendingUp, label: "Adherencia prom.", value: `${adherenciaPromedio}%`, color: "text-green-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-4">
            <Icon size={16} className={`${color} mb-2`} />
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {alertasPendientes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Alertas pendientes</span>
            </div>
            <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">{alertasPendientes.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {alertasPendientes.map((alerta) => (
              <button
                key={alerta.id}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                onClick={() => navigate(`/obstetra/gestante/${alerta.gestanteId}`)}
              >
                <SemaforoRiesgo nivel={alerta.nivel} showLabel={false} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{alerta.gestanteNombre}</div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{alerta.mensaje}</div>
                </div>
                <ChevronRight size={14} className="text-gray-300 shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Citas de hoy */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-900">Citas de hoy</span>
          </div>
          <div className="divide-y divide-gray-50">
            {citasDeHoy.length === 0 ? (
              <div className="px-4 py-6 text-xs text-gray-400 text-center">Sin citas programadas para hoy</div>
            ) : citasDeHoy.map((cita) => (
              <button
                key={cita.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                onClick={() => navigate(`/obstetra/gestante/${cita.gestanteId}`)}
              >
                <div className="w-1.5 h-8 bg-rose-400 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{cita.gestanteNombre}</div>
                  <div className="text-xs text-gray-400">{cita.hora} · {cita.motivo}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0
                  ${cita.estado === "confirmada" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>
                  {cita.estado}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Gráfica riesgo */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Distribución por riesgo</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie name="riesgo" data={distribucion} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                {distribucion.map((_, i) => <Cell key={`risk-${i}`} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trimestres */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-900 mb-3">Gestantes por trimestre</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "1er Trimestre", count: gestantes.filter((g) => g.trimestre === 1).length, color: "bg-blue-50 text-blue-700" },
            { label: "2do Trimestre", count: gestantes.filter((g) => g.trimestre === 2).length, color: "bg-violet-50 text-violet-700" },
            { label: "3er Trimestre", count: gestantes.filter((g) => g.trimestre === 3).length, color: "bg-rose-50 text-rose-700" },
          ].map((t) => (
            <div key={t.label} className={`${t.color} rounded-lg p-3 text-center`}>
              <div className="text-2xl font-bold">{t.count}</div>
              <div className="text-xs font-medium mt-0.5 opacity-80">{t.label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
