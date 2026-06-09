interface Props {
  porcentaje: number;
  showLabel?: boolean;
  height?: number;
}

export function AdherenciaBar({ porcentaje, showLabel = true, height = 8 }: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(porcentaje)));
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  const textColor =
    pct >= 80 ? "text-green-700" : pct >= 50 ? "text-yellow-700" : "text-red-700";
  const bg =
    pct >= 80 ? "bg-green-100" : pct >= 50 ? "bg-yellow-100" : "bg-red-100";

  return (
    <div className="w-full">
      <div className={`w-full rounded-full ${bg}`} style={{ height }}>
        <div
          className={`${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%`, height }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-semibold mt-0.5 block ${textColor}`}>
          {pct}% de adherencia
        </span>
      )}
    </div>
  );
}

export function calcularAdherencia(diasTomados: string[], totalDias: number): number {
  if (totalDias === 0) return 0;
  return (diasTomados.length / totalDias) * 100;
}
