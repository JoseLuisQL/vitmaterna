import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { gestantes } from "../../data/mockData";
import { SemaforoRiesgo } from "../../components/shared/SemaforoRiesgo";
import { AdherenciaBar, calcularAdherencia } from "../../components/shared/AdherenciaBar";
import { PesoChart } from "../../components/charts/PesoChart";
import { AlturaUterinaChart } from "../../components/charts/AlturaUterinaChart";
import { ArrowLeft, User, Stethoscope, Pill, FlaskConical, Syringe, AlertTriangle, Check } from "lucide-react";

const TABS = [
  { id: "datos", label: "Datos", icon: User },
  { id: "controles", label: "Controles", icon: Stethoscope },
  { id: "tratamiento", label: "Tratamiento", icon: Pill },
  { id: "laboratorio", label: "Lab.", icon: FlaskConical },
  { id: "vacunas", label: "Vacunas", icon: Syringe },
];

function Fila({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 text-sm last:border-0">
      <span className="text-gray-400 shrink-0 mr-3">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

function Seccion({ titulo }: { titulo: string }) {
  return <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-5 mb-2 first:mt-0">{titulo}</div>;
}

export default function PerfilGestante() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("datos");

  const gestante = gestantes.find((g) => g.id === id);
  if (!gestante) {
    return (
      <div className="p-6 text-center">
        <div className="text-sm text-gray-500">Gestante no encontrada</div>
        <button onClick={() => navigate("/obstetra/gestantes")} className="mt-3 text-rose-600 underline text-sm">Volver</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-3xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-xs w-fit transition-colors">
        <ArrowLeft size={14} /> Volver
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center shrink-0 text-rose-600 text-sm font-bold">
              {gestante.nombre[0]}{gestante.apellidos[0]}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{gestante.nombre} {gestante.apellidos}</div>
              <div className="text-xs text-gray-400 mt-0.5">DNI {gestante.dni} · {gestante.nroHistoriaClinica}</div>
              <div className="text-xs text-gray-400">{gestante.edad} años · {gestante.estadoCivil}</div>
            </div>
          </div>
          <SemaforoRiesgo nivel={gestante.riesgo} />
        </div>
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100">
          {[
            { label: "Semana", value: gestante.semanaGestacional },
            { label: "Trimestre", value: `${gestante.trimestre}°` },
            { label: "FPP", value: gestante.fpp.slice(5) },
            { label: "IMC", value: gestante.imc },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors border
              ${tab === tid
                ? "bg-gray-900 border-gray-900 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === "datos" && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <Seccion titulo="Datos Personales" />
          <Fila label="Nombre completo" value={`${gestante.nombre} ${gestante.apellidos}`} />
          <Fila label="DNI" value={gestante.dni} />
          <Fila label="Fecha de nacimiento" value={gestante.fechaNacimiento} />
          <Fila label="Edad" value={`${gestante.edad} años`} />
          <Fila label="Dirección" value={gestante.direccion} />
          <Fila label="Localidad" value={`${gestante.localidad}, ${gestante.distrito}`} />
          <Fila label="Teléfono" value={gestante.telefono} />
          <Fila label="Código SIS" value={gestante.codigoSIS} />
          <Fila label="Ocupación" value={gestante.ocupacion} />
          <Fila label="Estudios" value={gestante.estudios} />
          <Fila label="Estado civil" value={gestante.estadoCivil} />

          <Seccion titulo="Antecedentes Obstétricos" />
          <Fila label="Gestaciones (G)" value={gestante.gestaciones} />
          <Fila label="Partos (P)" value={gestante.partos} />
          <Fila label="Cesáreas (C)" value={gestante.cesareas} />
          <Fila label="Abortos (A)" value={gestante.abortos} />

          <Seccion titulo="Datos del Embarazo" />
          <Fila label="FUM" value={gestante.fum} />
          <Fila label="FPP" value={gestante.fpp} />
          <Fila label="Semana gestacional" value={`${gestante.semanaGestacional} semanas`} />
          <Fila label="Peso habitual" value={`${gestante.pesoHabitual} kg`} />
          <Fila label="Talla" value={`${gestante.talla} cm`} />
          <Fila label="IMC" value={`${gestante.imc} — ${gestante.clasificacionIMC}`} />
          <Fila label="Grupo sanguíneo" value={`${gestante.grupoSanguineo} ${gestante.factorRh}`} />
        </div>
      )}

      {tab === "controles" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="font-medium text-gray-900 text-sm mb-3">Curva de Peso Materno</div>
            <PesoChart controles={gestante.controles} pesoHabitual={gestante.pesoHabitual} />
            <div className="text-xs text-gray-400 text-center mt-1">Líneas punteadas: P25 (mín.) y P90 (máx.) IOM 2009</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="font-medium text-gray-900 text-sm mb-3">Altura Uterina</div>
            <AlturaUterinaChart controles={gestante.controles} />
            <div className="text-xs text-gray-400 text-center mt-1">Línea azul: valor esperado (cm = semanas gestacionales)</div>
          </div>

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Historial de Controles</div>
          {[...gestante.controles].reverse().map((ctrl) => (
            <div key={ctrl.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-gray-900 text-sm">{ctrl.fecha}</div>
                <span className="text-xs bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded font-medium">Sem {ctrl.semanaGestacional}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0">
                <Fila label="Peso" value={`${ctrl.peso} kg`} />
                <Fila label="PA" value={`${ctrl.presionSistolica}/${ctrl.presionDiastolica} mmHg`} />
                <Fila label="Temperatura" value={`${ctrl.temperatura}°C`} />
                <Fila label="Pulso" value={`${ctrl.pulso} x/min`} />
                <Fila label="Altura uterina" value={`${ctrl.alturaUterina} cm`} />
                <Fila label="FCF" value={`${ctrl.fcf} x/min`} />
                <Fila label="Situación" value={ctrl.situacion} />
                <Fila label="Presentación" value={ctrl.presentacion} />
                <Fila label="Mov. fetal" value={ctrl.movimientoFetal} />
                <Fila label="Proteinuria" value={ctrl.proteinuria} />
                <Fila label="Edema" value={ctrl.edema} />
              </div>
              {ctrl.observaciones && (
                <div className="mt-2 bg-gray-50 border border-gray-100 rounded-md p-2 text-xs text-gray-600">
                  {ctrl.observaciones}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-2">Responsable: {ctrl.responsable}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "tratamiento" && (
        <div className="flex flex-col gap-3">
          {gestante.suplementos.map((sup) => {
            const pct = Math.round(calcularAdherencia(sup.diasTomados, sup.totalDias));
            return (
              <div key={sup.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 text-sm">{sup.nombre}</div>
                <div className="text-gray-400 text-xs mt-0.5">{sup.dosis} · {sup.frecuencia}</div>
                <div className="mt-3">
                  <AdherenciaBar porcentaje={pct} height={6} />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {sup.diasTomados.length} de {sup.totalDias} días tomados
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "laboratorio" && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-medium text-gray-900 text-sm mb-3">Exámenes de Laboratorio</div>
          <Fila label="Hemoglobina 1" value={gestante.laboratorio.hemoglobina1 ? `${gestante.laboratorio.hemoglobina1} gr/dL` : null} />
          <Fila label="Hemoglobina 2" value={gestante.laboratorio.hemoglobina2 ? `${gestante.laboratorio.hemoglobina2} gr/dL` : "Pendiente"} />
          <Fila label="Hemoglobina 3" value={gestante.laboratorio.hemoglobina3 ? `${gestante.laboratorio.hemoglobina3} gr/dL` : "Pendiente"} />
          <Fila label="Glucemia" value={gestante.laboratorio.glucemia} />
          <Fila label="VDRL/RPR" value={gestante.laboratorio.vdrl} />
          <Fila label="VIH" value={gestante.laboratorio.vih} />
          <Fila label="Hepatitis B" value={gestante.laboratorio.hepatitisB} />
          <Fila label="Examen de orina" value={gestante.laboratorio.examenOrina} />
          <Fila label="PAP" value={gestante.laboratorio.pap} />
          <Fila label="Grupo sanguíneo" value={`${gestante.laboratorio.grupoSanguineo} ${gestante.laboratorio.factorRh}`} />

          {(gestante.laboratorio.hemoglobina1 < 11 || (gestante.laboratorio.hemoglobina2 && gestante.laboratorio.hemoglobina2 < 10.5)) && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle size={13} className="text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700">
                <strong>Hemoglobina baja detectada.</strong> Considerar ajuste de dosis de Sulfato Ferroso y consejería nutricional.
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "vacunas" && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-medium text-gray-900 text-sm mb-3">Vacunas</div>
          {gestante.vacunas.map((v, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <div>
                <div className="text-sm font-medium text-gray-900">{v.nombre}</div>
                <div className="text-xs text-gray-400">Semana recomendada: {v.semana}</div>
              </div>
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium
                ${v.aplicada
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                {v.aplicada && <Check size={11} />}
                {v.aplicada ? "Aplicada" : "Pendiente"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
