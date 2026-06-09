import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { gestantes } from "../../data/mockData";
import { SemaforoRiesgo } from "../../components/shared/SemaforoRiesgo";
import { AdherenciaBar, calcularAdherencia } from "../../components/shared/AdherenciaBar";
import { Calendar, Pill, Baby, AlertTriangle, ChevronRight, CheckCircle, Phone } from "lucide-react";
import { toast } from "sonner";

export default function DashboardGestante() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gestante = gestantes.find((g) => g.id === user?.gestanteId) ?? gestantes[0];
  const [consumoRegistrado, setConsumoRegistrado] = useState<string[]>([]);

  const proxCita = gestante.citas
    .filter((c) => c.estado === "programada")
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

  const diasRestantes = Math.max(0, Math.round((new Date(gestante.fpp).getTime() - Date.now()) / 86400000));

  function registrarConsumo(supId: string, nombre: string) {
    if (consumoRegistrado.includes(supId)) return;
    setConsumoRegistrado((prev) => [...prev, supId]);
    toast.success(`Consumo de ${nombre} registrado`);
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-xl mx-auto">

      {/* Header de gestante */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Paciente</div>
            <div className="font-semibold text-gray-900">{gestante.nombre} {gestante.apellidos}</div>
            <div className="text-xs text-gray-500 mt-0.5">DNI {gestante.dni} · {gestante.nroHistoriaClinica}</div>
          </div>
          <SemaforoRiesgo nivel={gestante.riesgo} />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{gestante.semanaGestacional}</div>
            <div className="text-xs text-gray-400">semanas</div>
          </div>
          <div className="text-center border-x border-gray-100">
            <div className="text-lg font-bold text-gray-900">{gestante.trimestre}</div>
            <div className="text-xs text-gray-400">trimestre</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{diasRestantes}</div>
            <div className="text-xs text-gray-400">días para parto</div>
          </div>
        </div>
      </div>

      {/* Desarrollo fetal */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
          <Baby size={16} className="text-violet-600" />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tu bebé — semana {gestante.semanaGestacional}</div>
          <div className="text-sm text-gray-700 mt-1">
            {gestante.semanaGestacional < 12 ? "En desarrollo temprano. Los principales órganos están formándose." :
             gestante.semanaGestacional < 20 ? "Ya tiene todos sus órganos formados y sigue creciendo." :
             gestante.semanaGestacional < 28 ? "Comienza a oír sonidos y a responder a estímulos externos." :
             gestante.semanaGestacional < 36 ? "Sus pulmones maduran y acumula grasa corporal." :
             "Está listo para nacer. Posición cefálica esperada."}
          </div>
          <div className="text-xs text-gray-400 mt-1.5">FPP: {gestante.fpp} · {gestante.grupoSanguineo}{gestante.factorRh}</div>
        </div>
      </div>

      {/* Próxima cita */}
      {proxCita && (
        <button
          onClick={() => navigate("/gestante/citas")}
          className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left w-full"
        >
          <div className="w-8 h-8 rounded bg-violet-50 flex items-center justify-center shrink-0">
            <Calendar size={16} className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Próxima cita</div>
            <div className="font-medium text-gray-900 text-sm">{proxCita.fecha} · {proxCita.hora}</div>
            <div className="text-xs text-gray-500 truncate">{proxCita.motivo}</div>
          </div>
          <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </button>
      )}

      {/* Suplementos del día */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Pill size={15} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suplementos de hoy</span>
        </div>
        <div className="flex flex-col gap-3">
          {gestante.suplementos.map((sup) => {
            const pct = calcularAdherencia(sup.diasTomados, sup.totalDias);
            const yaRegistrado = consumoRegistrado.includes(sup.id);
            return (
              <div key={sup.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 truncate">{sup.nombre}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">{sup.dosis}</span>
                  </div>
                  <AdherenciaBar porcentaje={pct} height={5} showLabel={false} />
                </div>
                <button
                  onClick={() => registrarConsumo(sup.id, sup.nombre)}
                  disabled={yaRegistrado}
                  className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border font-medium transition-all
                    ${yaRegistrado
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-violet-300 bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                >
                  <CheckCircle size={13} />
                  {yaRegistrado ? "Registrado" : "Tomé"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerta signos */}
      <button
        onClick={() => navigate("/gestante/alarmas")}
        className="bg-white border border-amber-200 rounded-lg p-4 flex items-center gap-3 hover:bg-amber-50 transition-colors text-left w-full"
      >
        <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-gray-900 text-sm">Reportar signo de alarma</div>
          <div className="text-xs text-gray-500">Notifique a su obstetra si siente algo inusual</div>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0" />
      </button>

      {/* Línea de emergencia */}
      <div className="bg-gray-900 rounded-lg p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
          <Phone size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400">Línea de emergencia — C.S. Talavera</div>
          <div className="font-semibold text-white">083 – 421800</div>
        </div>
        <a
          href="tel:083421800"
          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors"
        >
          Llamar
        </a>
      </div>

    </div>
  );
}
