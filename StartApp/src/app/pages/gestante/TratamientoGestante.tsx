import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { gestantes } from "../../data/mockData";
import { AdherenciaBar, calcularAdherencia } from "../../components/shared/AdherenciaBar";
import { CheckCircle, Pill, Clock, Info } from "lucide-react";
import { toast } from "sonner";

function CalendarioConsumo({ diasTomados, diasOmitidos }: { diasTomados: string[]; diasOmitidos: string[] }) {
  const hoy = new Date();
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (29 - i));
    const fecha = d.toISOString().split("T")[0];
    const tomado = diasTomados.includes(fecha);
    const omitido = diasOmitidos.includes(fecha);
    return { fecha, tomado, omitido, dia: d.getDate() };
  });

  return (
    <div className="grid grid-cols-10 gap-1 mt-2">
      {dias.map((d) => (
        <div
          key={d.fecha}
          title={d.fecha}
          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium
            ${d.tomado ? "bg-green-500 text-white" : d.omitido ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-400"}`}
        >
          {d.dia}
        </div>
      ))}
    </div>
  );
}

const INDICACIONES: Record<string, string> = {
  "Sulfato": "Tomar con jugo de naranja para mejor absorción. No tomar con leche o té.",
  "Calcio": "No tomar al mismo tiempo que el hierro. Tomar con agua.",
  "Ácido": "Tomar preferentemente con el desayuno.",
};

function getIndicacion(nombre: string): string {
  const key = Object.keys(INDICACIONES).find((k) => nombre.includes(k));
  return key ? INDICACIONES[key] : "Tomar según indicaciones de su obstetra.";
}

export default function TratamientoGestante() {
  const { user } = useAuth();
  const gestante = gestantes.find((g) => g.id === user?.gestanteId) ?? gestantes[0];
  const [registrados, setRegistrados] = useState<string[]>([]);

  function registrar(supId: string, nombre: string) {
    if (registrados.includes(supId)) return;
    setRegistrados((prev) => [...prev, supId]);
    toast.success(`Consumo de ${nombre} registrado`);
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-xl mx-auto">
      <div>
        <h1 className="font-semibold text-gray-900">Mi Tratamiento Prenatal</h1>
        <p className="text-xs text-gray-400 mt-0.5">Semana {gestante.semanaGestacional} de gestación</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-2">
        <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          {gestante.semanaGestacional < 14
            ? "Está tomando Ácido Fólico para proteger el sistema nervioso del bebé."
            : gestante.semanaGestacional < 20
            ? "Ya inició el Sulfato Ferroso + Ácido Fólico. Continue el tratamiento diariamente."
            : "Toma Sulfato Ferroso y Calcio para apoyar el desarrollo óseo del bebé."}
        </p>
      </div>

      {gestante.suplementos.map((sup) => {
        const pct = calcularAdherencia(sup.diasTomados, sup.totalDias);
        const yaRegistrado = registrados.includes(sup.id);

        return (
          <div key={sup.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                  <Pill size={14} className="text-gray-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{sup.nombre}</div>
                  <div className="text-xs text-gray-400">{sup.dosis} · {sup.frecuencia}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Clock size={11} />
                    {sup.horaRecordatorio}
                  </div>
                </div>
              </div>
              <button
                onClick={() => registrar(sup.id, sup.nombre)}
                disabled={yaRegistrado}
                className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border font-medium transition-all
                  ${yaRegistrado
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-violet-300 bg-violet-600 text-white hover:bg-violet-700"
                  }`}
              >
                <CheckCircle size={13} />
                {yaRegistrado ? "Registrado" : "Tomé hoy"}
              </button>
            </div>

            <div className="mb-1">
              <AdherenciaBar porcentaje={pct} height={6} />
            </div>
            <div className="text-xs text-gray-400 mb-3">{sup.diasTomados.length} de {sup.totalDias} días registrados</div>

            <div className="mb-1">
              <div className="text-xs text-gray-500 font-medium mb-1.5">Registro de los últimos 30 días</div>
              <CalendarioConsumo diasTomados={sup.diasTomados} diasOmitidos={sup.diasOmitidos} />
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Tomado</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Omitido</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Sin dato</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2">
              <Info size={12} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">{getIndicacion(sup.nombre)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
