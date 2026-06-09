import type { RiesgoNivel } from "../../data/mockData";

interface Props {
  nivel: RiesgoNivel;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const cfg = {
  verde: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50 border-green-200", label: "Sin riesgo" },
  amarillo: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Riesgo moderado" },
  rojo: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50 border-red-200", label: "Alto riesgo" },
};

export function SemaforoRiesgo({ nivel, showLabel = true, size = "md" }: Props) {
  const c = cfg[nivel];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border font-medium ${c.bg} ${c.text} ${size === "sm" ? "text-xs" : "text-xs"}`}>
      <span className={`rounded-full shrink-0 ${c.dot} ${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"}`} />
      {showLabel && c.label}
    </span>
  );
}
