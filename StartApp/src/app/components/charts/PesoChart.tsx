import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ControlPrenatal } from "../../data/mockData";

interface Props {
  controles: ControlPrenatal[];
  pesoHabitual: number;
}

const P25_DATA: Record<number, number> = {
  13: 0.5, 16: 1.0, 20: 2.5, 24: 4.0, 28: 5.5, 32: 7.0, 36: 9.0, 39: 10.0,
};
const P90_DATA: Record<number, number> = {
  13: 2.0, 16: 4.0, 20: 7.0, 24: 10.0, 28: 13.0, 32: 15.5, 36: 17.5, 39: 18.0,
};

export function PesoChart({ controles, pesoHabitual }: Props) {
  const data = controles.map((c) => {
    const ganancia = parseFloat((c.peso - pesoHabitual).toFixed(1));
    const sem = c.semanaGestacional;
    const p25Keys = Object.keys(P25_DATA).map(Number).sort((a, b) => a - b);
    let p25 = 0.5, p90 = 2.0;
    for (const k of p25Keys) {
      if (sem >= k) { p25 = P25_DATA[k]; p90 = P90_DATA[k]; }
    }
    return { semana: `Sem ${sem}`, ganancia, p25, p90 };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit=" kg" domain={[-1, 20]} />
        <Tooltip formatter={(v) => `${v} kg`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={0} stroke="#999" strokeDasharray="2 2" />
        <Line name="P25 (mín.)" type="monotone" dataKey="p25" stroke="#86efac" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line name="P90 (máx.)" type="monotone" dataKey="p90" stroke="#fca5a5" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line name="Ganancia real (kg)" type="monotone" dataKey="ganancia" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 4, fill: "#7C3AED" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
