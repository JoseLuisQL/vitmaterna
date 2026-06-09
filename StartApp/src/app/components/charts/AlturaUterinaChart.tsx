import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ControlPrenatal } from "../../data/mockData";

interface Props {
  controles: ControlPrenatal[];
}

export function AlturaUterinaChart({ controles }: Props) {
  const data = controles.map((c) => ({
    semana: `Sem ${c.semanaGestacional}`,
    altura: c.alturaUterina,
    esperado: c.semanaGestacional,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit=" cm" domain={[0, 45]} />
        <Tooltip formatter={(v) => `${v} cm`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line name="Esperado (cm)" type="monotone" dataKey="esperado" stroke="#93c5fd" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line name="Altura real (cm)" type="monotone" dataKey="altura" stroke="#DB2777" strokeWidth={2.5} dot={{ r: 4, fill: "#DB2777" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
