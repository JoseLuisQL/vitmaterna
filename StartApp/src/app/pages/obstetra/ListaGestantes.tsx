import { useState } from "react";
import { useNavigate } from "react-router";
import { gestantes, type RiesgoNivel } from "../../data/mockData";
import { SemaforoRiesgo } from "../../components/shared/SemaforoRiesgo";
import { calcularAdherencia, AdherenciaBar } from "../../components/shared/AdherenciaBar";
import { Search, ChevronRight, UserPlus } from "lucide-react";

const FILTROS: { id: RiesgoNivel | "todas"; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "verde", label: "Sin riesgo" },
  { id: "amarillo", label: "Moderado" },
  { id: "rojo", label: "Alto" },
];

const RIESGO_DOT: Record<RiesgoNivel, string> = {
  verde: "bg-green-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500",
};

export default function ListaGestantes() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [filtroRiesgo, setFiltroRiesgo] = useState<RiesgoNivel | "todas">("todas");

  const filtradas = gestantes.filter((g) => {
    const coincide =
      g.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      g.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
      g.dni.includes(busqueda);
    const riesgoOk = filtroRiesgo === "todas" || g.riesgo === filtroRiesgo;
    return coincide && riesgoOk;
  });

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-gray-900">Mis Gestantes</h1>
        <button
          onClick={() => navigate("/obstetra/nueva-gestante")}
          className="flex items-center gap-1.5 bg-rose-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-rose-700 transition-colors"
        >
          <UserPlus size={14} />
          Nueva gestante
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroRiesgo(f.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors border
                ${filtroRiesgo === f.id
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
            >
              {f.id !== "todas" && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${RIESGO_DOT[f.id as RiesgoNivel]}`} />
              )}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-400">{filtradas.length} gestante(s) encontradas</div>

      <div className="flex flex-col gap-2">
        {filtradas.map((g) => {
          const adherenciaPromedio =
            g.suplementos.length > 0
              ? Math.round(
                  g.suplementos.reduce((a, s) => a + calcularAdherencia(s.diasTomados, s.totalDias), 0) /
                    g.suplementos.length
                )
              : 0;

          return (
            <div
              key={g.id}
              className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => navigate(`/obstetra/gestante/${g.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center shrink-0 text-rose-600 text-xs font-bold">
                  {g.nombre[0]}{g.apellidos[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{g.nombre} {g.apellidos}</div>
                      <div className="text-gray-400 text-xs mt-0.5">DNI {g.dni} · {g.nroHistoriaClinica}</div>
                    </div>
                    <ChevronRight size={15} className="text-gray-300 shrink-0 mt-0.5" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <SemaforoRiesgo nivel={g.riesgo} size="sm" />
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-medium">
                      Sem {g.semanaGestacional} · {g.trimestre}° trim.
                    </span>
                    <span className="text-xs text-gray-400">
                      FPP: {g.fpp}
                    </span>
                  </div>
                  {g.suplementos.length > 0 && (
                    <div className="mt-2">
                      <AdherenciaBar porcentaje={adherenciaPromedio} height={4} showLabel={false} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
