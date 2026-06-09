import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Baby, Stethoscope, ShieldCheck, Eye, EyeOff, Heart } from "lucide-react";

type RolId = "gestante" | "obstetra" | "admin";

const roles: { id: RolId; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "gestante", label: "Gestante", desc: "Acceso al panel de seguimiento prenatal", icon: <Baby size={20} /> },
  { id: "obstetra", label: "Obstetra", desc: "Acceso al panel de atención obstétrica", icon: <Stethoscope size={20} /> },
  { id: "admin", label: "Administrador", desc: "Gestión y configuración del sistema", icon: <ShieldCheck size={20} /> },
];

const CREDENCIALES: Record<RolId, { dni: string; pass: string; nombre: string; gestanteId?: string }> = {
  gestante: { dni: "47283910", pass: "1234", nombre: "María Quispe Huanca", gestanteId: "g1" },
  obstetra: { dni: "45231890", pass: "1234", nombre: "Lic. Ana Flores Vargas" },
  admin: { dni: "44012345", pass: "1234", nombre: "Carlos Mendoza López" },
};

const ACCENT: Record<RolId, string> = {
  gestante: "border-violet-600 bg-violet-600",
  obstetra: "border-rose-600 bg-rose-600",
  admin: "border-blue-600 bg-blue-600",
};

export default function LoginPage() {
  const [rolSeleccionado, setRolSeleccionado] = useState<RolId | null>(null);
  const [dni, setDni] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!rolSeleccionado) return;
    setLoading(true);
    setError("");
    setTimeout(() => {
      const cred = CREDENCIALES[rolSeleccionado];
      if (dni === cred.dni && pass === cred.pass) {
        login({ id: cred.dni, nombre: cred.nombre, rol: rolSeleccionado, gestanteId: cred.gestanteId });
        navigate(`/${rolSeleccionado}`);
      } else {
        setError("DNI o contraseña incorrectos.");
        setLoading(false);
      }
    }, 500);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Heart size={18} className="text-violet-600" />
        <div>
          <span className="font-semibold text-gray-900 text-sm tracking-wide">VITMATERNA</span>
          <span className="text-gray-400 text-xs ml-3">Centro de Salud Talavera — Andahuaylas, Apurímac</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
            <p className="text-gray-500 text-sm mt-1">Seleccione su tipo de usuario para continuar</p>
          </div>

          {!rolSeleccionado ? (
            <div className="flex flex-col gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRolSeleccionado(r.id)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition-colors shrink-0">
                    {r.icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{r.label}</div>
                    <div className="text-gray-400 text-xs">{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <button
                onClick={() => { setRolSeleccionado(null); setError(""); setDni(""); setPass(""); }}
                className="text-xs text-gray-400 hover:text-gray-600 mb-5 flex items-center gap-1 transition-colors"
              >
                ← Cambiar tipo de usuario
              </button>

              <div className="mb-5 pb-5 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">
                  {roles.find((r) => r.id === rolSeleccionado)?.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Credenciales de prueba: DNI {CREDENCIALES[rolSeleccionado].dni} / Contraseña: 1234
                </div>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">DNI</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                    placeholder="12345678"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder="••••••"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-md">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-60 ${ACCENT[rolSeleccionado]}`}
                >
                  {loading ? "Verificando..." : "Ingresar"}
                </button>
              </form>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-8">
            Sistema de Seguimiento Prenatal — MINSA Peru
          </p>
        </div>
      </main>
    </div>
  );
}
