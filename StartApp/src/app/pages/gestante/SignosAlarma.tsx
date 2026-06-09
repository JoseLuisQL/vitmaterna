import { useState } from "react";
import { signosAlarmaEmbarazo } from "../../data/mockData";
import {
  AlertTriangle, Send, CheckCircle, Phone,
  Frown, Thermometer, Activity, Droplets, Droplet, Baby, Zap, Eye, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { LucideProps } from "lucide-react";

type LucideIcon = React.ComponentType<LucideProps>;

const LUCIDE_MAP: Record<string, LucideIcon> = {
  Frown, Thermometer, Activity, Droplets, Droplet, Baby, Zap, Eye, AlertCircle,
};

function SignoIcon({ name }: { name: string }) {
  const Icon = LUCIDE_MAP[name] ?? AlertCircle;
  return <Icon size={14} className="text-gray-500 shrink-0" />;
}

export default function SignosAlarma() {
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [enviado, setEnviado] = useState(false);
  const [notas, setNotas] = useState("");

  function toggleSigno(i: number) {
    setSeleccionados((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  function enviar() {
    if (seleccionados.length === 0) { toast.error("Seleccione al menos un síntoma"); return; }
    setEnviado(true);
    toast.success("Alerta enviada a su obstetra.");
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 gap-5 max-w-md mx-auto">
        <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-full flex items-center justify-center">
          <CheckCircle size={24} className="text-green-600" />
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900 mb-1">Alerta enviada</div>
          <div className="text-gray-500 text-sm">La Lic. Ana Flores ha sido notificada y se pondrá en contacto con usted.</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Síntomas reportados</div>
          {seleccionados.map((i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700 py-1">
              <SignoIcon name={signosAlarmaEmbarazo[i].icono} />
              <span>{signosAlarmaEmbarazo[i].texto}</span>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 rounded-lg p-4 flex items-center gap-3 w-full">
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
            <Phone size={15} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-400">Si es urgente — C.S. Talavera</div>
            <div className="font-semibold text-white">083 – 421800</div>
          </div>
          <a href="tel:083421800" className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors">
            Llamar
          </a>
        </div>
        <button
          onClick={() => { setEnviado(false); setSeleccionados([]); setNotas(""); }}
          className="text-gray-500 text-sm hover:text-gray-700 underline"
        >
          Reportar otro síntoma
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
        <h1 className="font-semibold text-gray-900">Reportar Signo de Alarma</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <p className="text-xs text-amber-800">
          Seleccione los síntomas que presenta y envíe la alerta a su obstetra. Si es una emergencia, llame directamente al centro de salud.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Síntomas</div>
        <div className="flex flex-col gap-2">
          {signosAlarmaEmbarazo.map((signo, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors border
                ${seleccionados.includes(i)
                  ? "bg-red-50 border-red-200"
                  : "bg-gray-50 border-gray-100 hover:bg-gray-100"}`}
            >
              <input
                type="checkbox"
                checked={seleccionados.includes(i)}
                onChange={() => toggleSigno(i)}
                className="w-4 h-4 accent-red-600 shrink-0"
              />
              <SignoIcon name={signo.icono} />
              <span className="text-sm text-gray-700">{signo.texto}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Información adicional (opcional)</div>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Describa con más detalle cómo se siente, desde cuándo, intensidad..."
          className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 h-24 resize-none"
        />
      </div>

      {seleccionados.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-xs text-red-700">
          Seleccionó {seleccionados.length} síntoma(s). Su obstetra será notificada inmediatamente.
        </div>
      )}

      <button
        onClick={enviar}
        className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-md font-medium text-sm hover:bg-red-700 transition-colors"
      >
        <Send size={15} />
        Enviar alerta a mi obstetra
      </button>

      <div className="bg-gray-900 rounded-lg p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
          <Phone size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400">Emergencia — Centro de Salud Talavera</div>
          <div className="font-semibold text-white">083 – 421800</div>
        </div>
        <a href="tel:083421800" className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors">
          Llamar
        </a>
      </div>
    </div>
  );
}
