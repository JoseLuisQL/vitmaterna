import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { usuarios, gestantes } from "../../data/mockData";
import { Users, ShieldCheck, Settings, LogOut, ToggleLeft, ToggleRight, Baby, Stethoscope } from "lucide-react";
import { toast } from "sonner";

const SIDEBAR_LINKS = [
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "metricas", label: "Métricas", icon: ShieldCheck },
  { id: "config", label: "Configuración", icon: Settings },
];

export default function DashboardAdmin() {
  const { user: authUser, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const [seccion, setSeccion] = useState("usuarios");
  const [activos, setActivos] = useState<Record<string, boolean>>(
    Object.fromEntries(usuarios.map((u) => [u.id, u.activo]))
  );

  function toggleActivo(id: string, nombre: string) {
    setActivos((prev) => {
      const nuevo = !prev[id];
      toast.success(`Usuario ${nombre} ${nuevo ? "activado" : "desactivado"}`);
      return { ...prev, [id]: nuevo };
    });
  }

  function handleLogout() {
    authLogout();
    navigate("/");
  }

  const seccionLabel = SIDEBAR_LINKS.find((l) => l.id === seccion)?.label ?? "";

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="font-semibold text-gray-900">VITMATERNA</div>
          <div className="text-xs text-gray-400 mt-0.5">Panel Administrador</div>
        </div>
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
          {SIDEBAR_LINKS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSeccion(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium text-left w-full
                ${seccion === id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
            >
              <Icon size={16} className={seccion === id ? "text-blue-600" : "text-gray-400"} />
              {label}
            </button>
          ))}
        </nav>
        <div className="px-2 pb-4 border-t border-gray-100 pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm w-full px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <span className="font-medium text-gray-900 text-sm">{seccionLabel}</span>
          <span className="text-xs text-gray-400">{authUser?.nombre}</span>
        </header>

        <div className="p-6 flex flex-col gap-4 max-w-4xl">
          {seccion === "usuarios" && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Gestión de Usuarios</h2>
                <div className="text-xs text-gray-400">{usuarios.length} usuarios registrados</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Gestantes", count: usuarios.filter((u) => u.rol === "gestante").length, icon: Baby, color: "text-violet-600" },
                  { label: "Obstetras", count: usuarios.filter((u) => u.rol === "obstetra").length, icon: Stethoscope, color: "text-rose-600" },
                  { label: "Administradores", count: usuarios.filter((u) => u.rol === "admin").length, icon: ShieldCheck, color: "text-blue-600" },
                ].map(({ label, count, icon: Icon, color }) => (
                  <div key={label} className="bg-white border border-gray-200 rounded-lg p-4">
                    <Icon size={16} className={`${color} mb-2`} />
                    <div className="text-xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">DNI</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rol</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usuarios.map((u) => (
                        <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!activos[u.id] ? "opacity-50" : ""}`}>
                          <td className="px-4 py-3 font-medium text-gray-900">{u.nombre}</td>
                          <td className="px-4 py-3 text-gray-500">{u.dni}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize
                              ${u.rol === "gestante" ? "bg-violet-50 border-violet-200 text-violet-700"
                                : u.rol === "obstetra" ? "bg-rose-50 border-rose-200 text-rose-700"
                                : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                              {u.rol}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{u.telefono}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleActivo(u.id, u.nombre)}
                              className="transition-colors"
                            >
                              {activos[u.id]
                                ? <ToggleRight size={26} className="text-green-500" />
                                : <ToggleLeft size={26} className="text-gray-300" />
                              }
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {seccion === "metricas" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-semibold text-gray-900">Métricas Globales del Sistema</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Gestantes registradas", value: gestantes.length },
                  { label: "Total controles registrados", value: gestantes.reduce((a, g) => a + g.controles.length, 0) },
                  { label: "Total citas programadas", value: gestantes.reduce((a, g) => a + g.citas.length, 0) },
                  { label: "Gestantes con riesgo alto", value: gestantes.filter((g) => g.riesgo === "rojo").length },
                  { label: "Gestantes en 3er trimestre", value: gestantes.filter((g) => g.trimestre === 3).length },
                  { label: "Gestantes con Rh negativo", value: gestantes.filter((g) => g.factorRh === "-").length },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-700">{value}</div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {seccion === "config" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-semibold text-gray-900">Configuración del Sistema</h2>
              <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-0">
                {[
                  { label: "Centro de Salud", value: "C.S. Talavera" },
                  { label: "Código IPRESS", value: "010301" },
                  { label: "Departamento", value: "Apurímac" },
                  { label: "Provincia", value: "Andahuaylas" },
                  { label: "Altitud (msnm)", value: "2900" },
                  { label: "Factor corrección Hb por altitud", value: "-1.3 gr/dL" },
                  { label: "Teléfono de emergencia", value: "083 - 421800" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
                    <span className="text-sm text-gray-700">{label}</span>
                    <input
                      defaultValue={value}
                      className="text-sm text-right border border-gray-200 rounded-md px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                ))}
                <button
                  onClick={() => toast.success("Configuración guardada")}
                  className="mt-4 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
