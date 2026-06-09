import { useState } from "react";
import { gestantes, todasLasCitas, type CitaEstado } from "../../data/mockData";
import { Calendar, CheckCircle, XCircle, Plus, Clock } from "lucide-react";
import { toast } from "sonner";

const ESTADO_BADGE: Record<CitaEstado, string> = {
  programada: "bg-blue-50 text-blue-700 border-blue-200",
  confirmada: "bg-violet-50 text-violet-700 border-violet-200",
  asistida: "bg-green-50 text-green-700 border-green-200",
  no_asistida: "bg-red-50 text-red-700 border-red-200",
  reprogramada: "bg-amber-50 text-amber-700 border-amber-200",
};

const ESTADO_LABEL: Record<CitaEstado, string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  asistida: "Asistida",
  no_asistida: "No asistida",
  reprogramada: "Reprogramada",
};

export default function CitasObstetra() {
  const [estados, setEstados] = useState<Record<string, CitaEstado>>(
    Object.fromEntries(todasLasCitas.map((c) => [c.id, c.estado]))
  );
  const [modalNueva, setModalNueva] = useState(false);
  const [nuevaCita, setNuevaCita] = useState({ gestanteId: "", motivo: "Control prenatal", fecha: "", hora: "09:00" });
  const [filtroFecha, setFiltroFecha] = useState("todas");

  const hoy = new Date().toISOString().split("T")[0];

  function registrarAsistencia(id: string, asistio: boolean) {
    const nuevoEstado: CitaEstado = asistio ? "asistida" : "no_asistida";
    setEstados((prev) => ({ ...prev, [id]: nuevoEstado }));
    toast.success(asistio ? "Asistencia registrada" : "Inasistencia registrada");
  }

  function crearCita() {
    if (!nuevaCita.gestanteId || !nuevaCita.fecha) {
      toast.error("Complete todos los campos");
      return;
    }
    setModalNueva(false);
    const gestante = gestantes.find((g) => g.id === nuevaCita.gestanteId);
    toast.success(`Cita programada para ${gestante?.nombre} ${gestante?.apellidos} el ${nuevaCita.fecha}`);
    setNuevaCita({ gestanteId: "", motivo: "Control prenatal", fecha: "", hora: "09:00" });
  }

  const citasOrdenadas = [...todasLasCitas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const citasFiltradas = filtroFecha === "hoy"
    ? citasOrdenadas.filter((c) => c.fecha === hoy)
    : filtroFecha === "proximas"
    ? citasOrdenadas.filter((c) => c.fecha >= hoy)
    : citasOrdenadas;

  const FILTROS = [
    { id: "todas", label: "Todas" },
    { id: "hoy", label: "Hoy" },
    { id: "proximas", label: "Próximas" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-gray-900">Cronograma de Citas</h1>
        <button
          onClick={() => setModalNueva(true)}
          className="flex items-center gap-1.5 bg-rose-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-rose-700 transition-colors"
        >
          <Plus size={14} /> Nueva cita
        </button>
      </div>

      <div className="flex gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltroFecha(f.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border
              ${filtroFecha === f.id
                ? "bg-gray-900 border-gray-900 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-400">{citasFiltradas.length} cita(s)</div>

      <div className="flex flex-col gap-2">
        {citasFiltradas.map((cita) => {
          const estado = estados[cita.id];
          const esProgramadaHoyOFutura = cita.fecha >= hoy && (estado === "programada" || estado === "confirmada");

          return (
            <div key={cita.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{cita.gestanteNombre}</div>
                      <div className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                        <span>{cita.fecha}</span>
                        <Clock size={11} />
                        <span>{cita.hora}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${ESTADO_BADGE[estado]}`}>
                      {ESTADO_LABEL[estado]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">{cita.motivo}</div>
                  {cita.observaciones && (
                    <div className="text-xs text-gray-400 mt-0.5">{cita.observaciones}</div>
                  )}
                  {esProgramadaHoyOFutura && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => registrarAsistencia(cita.id, true)}
                        className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle size={13} /> Asistió
                      </button>
                      <button
                        onClick={() => registrarAsistencia(cita.id, false)}
                        className="flex items-center gap-1.5 text-xs border border-red-200 bg-red-50 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors"
                      >
                        <XCircle size={13} /> No asistió
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalNueva && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg p-5 shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Programar nueva cita</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Gestante</label>
                <select
                  value={nuevaCita.gestanteId}
                  onChange={(e) => setNuevaCita((p) => ({ ...p, gestanteId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="">Seleccionar gestante...</option>
                  {gestantes.map((g) => <option key={g.id} value={g.id}>{g.nombre} {g.apellidos}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Motivo</label>
                <select
                  value={nuevaCita.motivo}
                  onChange={(e) => setNuevaCita((p) => ({ ...p, motivo: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  {["Control prenatal", "Ecografía", "Resultado de laboratorio", "Visita domiciliaria", "Plan de parto"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={nuevaCita.fecha}
                  onChange={(e) => setNuevaCita((p) => ({ ...p, fecha: e.target.value }))}
                  min={hoy}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Hora</label>
                <input
                  type="time"
                  value={nuevaCita.hora}
                  onChange={(e) => setNuevaCita((p) => ({ ...p, hora: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={crearCita}
                className="flex-1 bg-rose-600 text-white py-2 rounded-md text-sm font-medium hover:bg-rose-700 transition-colors"
              >
                Programar cita
              </button>
              <button
                onClick={() => setModalNueva(false)}
                className="px-4 border border-gray-300 text-gray-600 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
