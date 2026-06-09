import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  gestantes, contenidoEducativo,
  signosAlarmaEmbarazo, signosAlarmaParto, signosAlarmaPostparto, signosAlarmaRN,
} from "../../data/mockData";
import {
  Pill, Heart, Scan, Apple, Baby, Wind, ClipboardList, Calculator,
  Frown, Thermometer, Activity, Droplets, Droplet, Zap, Eye,
  Users, AlertCircle, Clock, AlertTriangle, HeartPulse, Phone,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

type LucideIcon = React.ComponentType<LucideProps>;

const LUCIDE_MAP: Record<string, LucideIcon> = {
  Pill, Heart, Scan, Apple, Baby, Wind, ClipboardList,
  Frown, Thermometer, Activity, Droplets, Droplet, Zap, Eye,
  Users, AlertCircle, Clock, AlertTriangle, HeartPulse,
};

const ICONO_CONTENIDO: Record<string, LucideIcon> = {
  Pill, Heart, Scan, Apple, Baby, Wind, ClipboardList,
};

function DynamicIcon({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  const Icon = LUCIDE_MAP[name];
  if (!Icon) return <AlertCircle size={size} className={className} />;
  return <Icon size={size} className={className} />;
}

function SignoRow({ icono, texto }: { icono: string; texto: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <DynamicIcon name={icono} size={14} className="text-gray-500 shrink-0" />
      <span className="text-sm text-gray-700">{texto}</span>
    </div>
  );
}

function CalculadoraEG() {
  const [fum, setFum] = useState("");
  const [resultado, setResultado] = useState<{
    semanas: number; dias: number; trimestre: number; fpp: string; restantes: number;
  } | null>(null);

  function calcular() {
    if (!fum) return;
    const fumDate = new Date(fum);
    const hoy = new Date();
    const totalDias = Math.floor((hoy.getTime() - fumDate.getTime()) / 86400000);
    const semanas = Math.floor(totalDias / 7);
    const dias = totalDias % 7;
    const trimestre = semanas <= 13 ? 1 : semanas <= 27 ? 2 : 3;
    const fppDate = new Date(fumDate);
    fppDate.setDate(fppDate.getDate() + 7);
    fppDate.setMonth(fppDate.getMonth() - 3);
    fppDate.setFullYear(fppDate.getFullYear() + 1);
    const restantes = Math.max(0, Math.round((fppDate.getTime() - hoy.getTime()) / 86400000));
    setResultado({ semanas, dias, trimestre, fpp: fppDate.toISOString().split("T")[0], restantes });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={15} className="text-gray-400" />
        <span className="font-medium text-gray-900 text-sm">Calculadora de Edad Gestacional</span>
      </div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
        Fecha de última menstruación (FUM)
      </label>
      <div className="flex gap-2">
        <input
          type="date"
          value={fum}
          onChange={(e) => setFum(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
        <button
          onClick={calcular}
          className="bg-violet-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          Calcular
        </button>
      </div>
      {resultado && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{resultado.semanas}</div>
            <div className="text-xs text-gray-400 mt-0.5">sem + {resultado.dias} días</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{resultado.trimestre}°</div>
            <div className="text-xs text-gray-400 mt-0.5">trimestre</div>
          </div>
          <div className="col-span-2 bg-violet-50 border border-violet-200 rounded-md p-3 text-center">
            <div className="text-xs font-medium text-violet-600 uppercase tracking-wide">Fecha Probable de Parto (FPP)</div>
            <div className="text-lg font-bold text-gray-900 mt-1">{resultado.fpp}</div>
            <div className="text-xs text-gray-400 mt-0.5">{resultado.restantes} días restantes</div>
          </div>
        </div>
      )}
    </div>
  );
}

const GRUPO_ALARMAS = [
  { titulo: "Durante el embarazo", signos: signosAlarmaEmbarazo, headerClass: "bg-red-50 border-red-200 text-red-800" },
  { titulo: "Durante el parto", signos: signosAlarmaParto, headerClass: "bg-orange-50 border-orange-200 text-orange-800" },
  { titulo: "Después del parto", signos: signosAlarmaPostparto, headerClass: "bg-amber-50 border-amber-200 text-amber-800" },
  { titulo: "Recién nacido", signos: signosAlarmaRN, headerClass: "bg-blue-50 border-blue-200 text-blue-800" },
];

export default function EducacionGestante() {
  const { user } = useAuth();
  const gestante = gestantes.find((g) => g.id === user?.gestanteId) ?? gestantes[0];
  const [tabTrimestre, setTabTrimestre] = useState<1 | 2 | 3>(gestante.trimestre as 1 | 2 | 3);
  const [seccion, setSeccion] = useState<"contenido" | "alarmas" | "calculadora">("contenido");

  const contenido = tabTrimestre === 1
    ? contenidoEducativo.trimestre1
    : tabTrimestre === 2
    ? contenidoEducativo.trimestre2
    : contenidoEducativo.trimestre3;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="font-semibold text-gray-900">Educación en Salud Materna</h1>

      <div className="flex border border-gray-200 rounded-lg overflow-hidden">
        {(["contenido", "alarmas", "calculadora"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSeccion(s)}
            className={`flex-1 py-2 text-xs font-medium transition-colors
              ${seccion === s ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            {s === "contenido" ? "Por trimestre" : s === "alarmas" ? "Señales de peligro" : "Calculadora EG"}
          </button>
        ))}
      </div>

      {seccion === "contenido" && (
        <div>
          <div className="flex gap-2 mb-4">
            {([1, 2, 3] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTabTrimestre(t)}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors border
                  ${tabTrimestre === t
                    ? "bg-violet-600 border-violet-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {t}° Trimestre
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {contenido.map((item, i) => {
              const Icon = ICONO_CONTENIDO[item.icono] ?? Heart;
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 flex gap-3">
                  <div className="w-8 h-8 rounded bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-violet-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{item.titulo}</div>
                    <div className="text-gray-500 text-xs mt-1 leading-relaxed">{item.descripcion}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {seccion === "alarmas" && (
        <div className="flex flex-col gap-3">
          {GRUPO_ALARMAS.map((grupo) => (
            <div key={grupo.titulo} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className={`px-4 py-2.5 border-b border-gray-100 ${grupo.headerClass}`}>
                <span className="text-xs font-medium uppercase tracking-wide">{grupo.titulo}</span>
              </div>
              <div className="px-4 py-1">
                {grupo.signos.map((s, i) => <SignoRow key={i} icono={s.icono} texto={s.texto} />)}
              </div>
            </div>
          ))}

          <div className="bg-gray-900 rounded-lg p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
              <Phone size={15} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400">Si tiene alguno de estos síntomas — C.S. Talavera</div>
              <div className="font-semibold text-white">083 – 421800</div>
            </div>
            <a href="tel:083421800" className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors">
              Llamar
            </a>
          </div>
        </div>
      )}

      {seccion === "calculadora" && <CalculadoraEG />}
    </div>
  );
}
