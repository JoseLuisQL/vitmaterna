import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CheckCircle, Check } from "lucide-react";

const PASOS = ["Datos Personales", "Antecedentes", "Medidas y Sangre", "Embarazo actual"];

function calcularFPP(fum: string): string {
  if (!fum) return "";
  const d = new Date(fum);
  d.setDate(d.getDate() + 7);
  d.setMonth(d.getMonth() - 3);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

function calcularIMC(peso: number, talla: number): number {
  if (!peso || !talla) return 0;
  const tallaMt = talla / 100;
  return parseFloat((peso / (tallaMt * tallaMt)).toFixed(1));
}

function clasificarIMC(imc: number): string {
  if (imc < 19) return "Bajo peso";
  if (imc < 25) return "Normal";
  if (imc < 30) return "Sobrepeso";
  return "Obeso";
}

const INPUT_CLASS = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400";
const LABEL_CLASS = "text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5";
const SELECT_CLASS = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400";

export default function NuevaGestante() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0);
  const [registrado, setRegistrado] = useState(false);

  const [datos, setDatos] = useState({
    nombre: "", apellidos: "", dni: "", nroHC: "", fechaNacimiento: "",
    direccion: "", localidad: "", telefono: "", codigoSIS: "",
    ocupacion: "", estudios: "Secundaria", estadoCivil: "Conviviente",
    gestaciones: 0, partos: 0, cesareas: 0, abortos: 0,
    pesoHabitual: 0, talla: 0, grupoSanguineo: "O", factorRh: "+",
    fum: "", fpp: "", dudaFPP: false,
  });

  function set(field: string, value: any) {
    setDatos((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "fum") next.fpp = calcularFPP(value);
      return next;
    });
  }

  const imc = calcularIMC(datos.pesoHabitual, datos.talla);

  function guardar() {
    if (!datos.nombre || !datos.apellidos || !datos.dni) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    setRegistrado(true);
    toast.success(`Gestante ${datos.nombre} ${datos.apellidos} registrada exitosamente`);
  }

  const resetDatos = () => ({
    nombre: "", apellidos: "", dni: "", nroHC: "", fechaNacimiento: "",
    direccion: "", localidad: "", telefono: "", codigoSIS: "",
    ocupacion: "", estudios: "Secundaria", estadoCivil: "Conviviente",
    gestaciones: 0, partos: 0, cesareas: 0, abortos: 0,
    pesoHabitual: 0, talla: 0, grupoSanguineo: "O", factorRh: "+",
    fum: "", fpp: "", dudaFPP: false,
  });

  if (registrado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 gap-5 max-w-md mx-auto">
        <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-full flex items-center justify-center">
          <CheckCircle size={24} className="text-green-600" />
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900 mb-1">Gestante registrada</div>
          <div className="text-gray-500 text-sm">
            {datos.nombre} {datos.apellidos} fue registrada. FPP: <strong>{datos.fpp}</strong>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => navigate("/obstetra/gestantes")}
            className="flex-1 bg-rose-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            Ver gestantes
          </button>
          <button
            onClick={() => { setRegistrado(false); setPaso(0); setDatos(resetDatos()); }}
            className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-md text-sm hover:bg-gray-50 transition-colors"
          >
            Nueva gestante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="font-semibold text-gray-900">Registrar Nueva Gestante</h1>

      <div className="flex items-center gap-0 mb-2">
        {PASOS.map((p, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors border
                ${i < paso
                  ? "bg-green-500 border-green-500 text-white"
                  : i === paso
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-300 text-gray-400"}`}
              >
                {i < paso ? <Check size={13} /> : i + 1}
              </div>
              <div className={`text-center text-[10px] leading-tight ${i === paso ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                {p}
              </div>
            </div>
            {i < PASOS.length - 1 && (
              <div className={`h-px flex-1 mb-4 ${i < paso ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        {paso === 0 && (
          <div className="flex flex-col gap-4">
            <div className="font-medium text-gray-900 text-sm">Datos Personales</div>
            {[
              { label: "Nombre *", field: "nombre", type: "text" },
              { label: "Apellidos *", field: "apellidos", type: "text" },
              { label: "DNI *", field: "dni", type: "text", maxLength: 8 },
              { label: "N° Historia Clínica", field: "nroHC", type: "text" },
              { label: "Fecha de nacimiento", field: "fechaNacimiento", type: "date" },
              { label: "Dirección", field: "direccion", type: "text" },
              { label: "Localidad", field: "localidad", type: "text" },
              { label: "Teléfono", field: "telefono", type: "tel" },
              { label: "Código SIS", field: "codigoSIS", type: "text" },
              { label: "Ocupación", field: "ocupacion", type: "text" },
            ].map(({ label, field, type, maxLength }) => (
              <div key={field}>
                <label className={LABEL_CLASS}>{label}</label>
                <input
                  type={type}
                  maxLength={maxLength}
                  value={(datos as any)[field]}
                  onChange={(e) => set(field, e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            ))}
            <div>
              <label className={LABEL_CLASS}>Nivel de estudios</label>
              <select value={datos.estudios} onChange={(e) => set("estudios", e.target.value)} className={SELECT_CLASS}>
                {["Analfabeta", "Primaria", "Secundaria", "Superior", "Superior incompleta"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Estado civil</label>
              <select value={datos.estadoCivil} onChange={(e) => set("estadoCivil", e.target.value)} className={SELECT_CLASS}>
                {["Casada", "Conviviente", "Soltera", "Otro"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        )}

        {paso === 1 && (
          <div className="flex flex-col gap-4">
            <div className="font-medium text-gray-900 text-sm">Antecedentes Obstétricos</div>
            {[
              { label: "N° Gestaciones (G)", field: "gestaciones" },
              { label: "Partos vaginales (P)", field: "partos" },
              { label: "Cesáreas (C)", field: "cesareas" },
              { label: "Abortos (A)", field: "abortos" },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className={LABEL_CLASS}>{label}</label>
                <input
                  type="number"
                  min={0}
                  value={(datos as any)[field]}
                  onChange={(e) => set(field, parseInt(e.target.value) || 0)}
                  className={INPUT_CLASS}
                />
              </div>
            ))}
          </div>
        )}

        {paso === 2 && (
          <div className="flex flex-col gap-4">
            <div className="font-medium text-gray-900 text-sm">Medidas Antropométricas y Tipo de Sangre</div>
            <div>
              <label className={LABEL_CLASS}>Peso habitual (kg)</label>
              <input
                type="number"
                step="0.1"
                value={datos.pesoHabitual || ""}
                onChange={(e) => set("pesoHabitual", parseFloat(e.target.value) || 0)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Talla (cm)</label>
              <input
                type="number"
                step="0.1"
                value={datos.talla || ""}
                onChange={(e) => set("talla", parseFloat(e.target.value) || 0)}
                className={INPUT_CLASS}
              />
            </div>
            {imc > 0 && (
              <div className={`rounded-md border px-3 py-2 text-xs font-medium
                ${imc < 19 ? "bg-blue-50 border-blue-200 text-blue-700"
                  : imc < 25 ? "bg-green-50 border-green-200 text-green-700"
                  : imc < 30 ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-red-50 border-red-200 text-red-700"}`}
              >
                IMC calculado: <strong>{imc}</strong> — {clasificarIMC(imc)}
              </div>
            )}
            <div>
              <label className={LABEL_CLASS}>Grupo sanguíneo</label>
              <select value={datos.grupoSanguineo} onChange={(e) => set("grupoSanguineo", e.target.value)} className={SELECT_CLASS}>
                {["A", "B", "AB", "O"].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Factor Rh</label>
              <div className="flex gap-2">
                {["+", "-"].map((rh) => (
                  <label
                    key={rh}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md border cursor-pointer text-sm font-medium transition-colors
                      ${datos.factorRh === rh
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                  >
                    <input type="radio" name="rh" value={rh} checked={datos.factorRh === rh} onChange={() => set("factorRh", rh)} className="hidden" />
                    Rh {rh}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="flex flex-col gap-4">
            <div className="font-medium text-gray-900 text-sm">Embarazo Actual</div>
            <div>
              <label className={LABEL_CLASS}>Fecha de Última Menstruación (FUM) *</label>
              <input
                type="date"
                value={datos.fum}
                onChange={(e) => set("fum", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            {datos.fpp && (
              <div className="bg-violet-50 border border-violet-200 rounded-md p-4 text-center">
                <div className="text-xs font-medium text-violet-600 uppercase tracking-wide">Fecha Probable de Parto (FPP)</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{datos.fpp}</div>
                <div className="text-xs text-gray-400 mt-1">Calculada con Regla de Naegele</div>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={datos.dudaFPP}
                onChange={(e) => set("dudaFPP", e.target.checked)}
                className="w-4 h-4 accent-rose-600"
              />
              <span className="text-sm text-gray-700">Hay duda sobre la FUM (se confirmará por ecografía)</span>
            </label>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {paso > 0 && (
          <button
            onClick={() => setPaso(paso - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={15} /> Anterior
          </button>
        )}
        {paso < PASOS.length - 1 ? (
          <button
            onClick={() => setPaso(paso + 1)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            Siguiente <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={guardar}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <CheckCircle size={15} /> Registrar gestante
          </button>
        )}
      </div>
    </div>
  );
}
