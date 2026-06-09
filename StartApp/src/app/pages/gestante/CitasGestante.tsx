import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { gestantes, type CitaEstado } from "../../data/mockData";
import { Calendar, Clock, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ESTADO_STYLE: Record<CitaEstado, string> = {
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

export default function CitasGestante() {
  const { user } = useAuth();
  const gestante = gestantes.find((g) => g.id === user?.gestanteId) ?? gestantes[0];
  const [estados, setEstados] = useState<Record<string, CitaEstado>>(
    Object.fromEntries(gestante.citas.map((c) => [c.id, c.estado]))
  );
  const [reprogModal, setReprogModal] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const hoy = new Date().toDateString();
  const citasOrdenadas = [...gestante.citas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const futuras = citasOrdenadas.filter((c) => new Date(c.fecha) >= new Date(hoy));
  const pasadas = citasOrdenadas.filter((c) => new Date(c.fecha) < new Date(hoy));

  function confirmar(id: string) {
    setEstados((prev) => ({ ...prev, [id]: "confirmada" }));
    toast.success("Asistencia confirmada");
  }

  function solicitarReprog(id: string) {
    if (!motivo.trim()) { toast.error("Ingrese un motivo"); return; }
    setEstados((prev) => ({ ...prev, [id]: "reprogramada" }));
    setReprogModal(null);
    setMotivo("");
    toast.success("Solicitud de reprogramación enviada");
  }

  function CitaCard({ cita }: { cita: typeof gestante.citas[0] }) {
    const estado = estados[cita.id];
    const esFutura = new Date(cita.fecha) >= new Date(hoy);
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
              <Calendar size={14} className="text-gray-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">{cita.fecha}</div>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <Clock size={11} />
                {cita.hora}
              </div>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${ESTADO_STYLE[estado]}`}>
            {ESTADO_LABEL[estado]}
          </span>
        </div>
        <div className="text-sm text-gray-700 ml-11">{cita.motivo}</div>
        {cita.observaciones && (
          <div className="text-xs text-gray-400 ml-11 mt-1">{cita.observaciones}</div>
        )}
        {esFutura && estado === "programada" && (
          <div className="flex gap-2 mt-3 ml-11">
            <button onClick={() => confirmar(cita.id)}
              className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded hover:bg-violet-700 transition-colors">
              <CheckCircle size={13} /> Confirmar asistencia
            </button>
            <button onClick={() => setReprogModal(cita.id)}
              className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
              <RefreshCw size={13} /> Reprogramar
            </button>
          </div>
        )}
        {esFutura && estado === "confirmada" && (
          <div className="flex items-center gap-1 mt-2 ml-11 text-xs text-green-600">
            <CheckCircle size={12} /> Asistencia confirmada
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-xl mx-auto">
      <h1 className="font-semibold text-gray-900">Mis Citas</h1>

      {futuras.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Próximas</h2>
          <div className="flex flex-col gap-2">{futuras.map((c) => <CitaCard key={c.id} cita={c} />)}</div>
        </section>
      )}

      {pasadas.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Historial</h2>
          <div className="flex flex-col gap-2">{pasadas.map((c) => <CitaCard key={c.id} cita={c} />)}</div>
        </section>
      )}

      {reprogModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg p-5 shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-1">Solicitar reprogramación</h3>
            <p className="text-xs text-gray-500 mb-3">Su obstetra recibirá la solicitud y coordinará una nueva fecha.</p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Indique el motivo de la reprogramación..."
              className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 h-24 resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => solicitarReprog(reprogModal)}
                className="flex-1 bg-violet-600 text-white py-2 rounded-md text-sm font-medium hover:bg-violet-700">
                Enviar solicitud
              </button>
              <button onClick={() => setReprogModal(null)}
                className="px-4 border border-gray-300 text-gray-600 py-2 rounded-md text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
