import { NavLink } from "react-router";
import { LayoutDashboard, CalendarDays, Pill, BookOpen, BarChart2, AlertTriangle, X, Heart } from "lucide-react";

const links = [
  { to: "/gestante", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/gestante/citas", label: "Mis Citas", icon: CalendarDays },
  { to: "/gestante/tratamiento", label: "Mi Tratamiento", icon: Pill },
  { to: "/gestante/educacion", label: "Educación", icon: BookOpen },
  { to: "/gestante/reportes", label: "Mi Adherencia", icon: BarChart2 },
  { to: "/gestante/alarmas", label: "Signos de Alarma", icon: AlertTriangle },
];

interface Props { open: boolean; onClose: () => void; }

export function SidebarGestante({ open, onClose }: Props) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={onClose} />}
      <aside className={`fixed md:static top-0 left-0 h-full z-30 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Heart size={16} className="text-violet-600 shrink-0" />
            <div>
              <div className="font-semibold text-gray-900 text-sm">VITMATERNA</div>
              <div className="text-gray-400 text-xs">Panel Gestante</div>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 py-3 px-3 flex flex-col gap-0.5 overflow-y-auto">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm
                ${isActive
                  ? "bg-violet-50 text-violet-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <span className="text-xs font-medium text-gray-700">Emergencias</span>
            </div>
            <div className="text-xs text-gray-500">C.S. Talavera</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">083 – 421800</div>
          </div>
        </div>
      </aside>
    </>
  );
}
