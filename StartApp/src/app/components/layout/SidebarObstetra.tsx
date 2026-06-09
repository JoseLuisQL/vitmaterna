import { NavLink } from "react-router";
import { LayoutDashboard, Users, CalendarDays, UserPlus, BarChart2, X, Heart } from "lucide-react";

const links = [
  { to: "/obstetra", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/obstetra/gestantes", label: "Mis Gestantes", icon: Users },
  { to: "/obstetra/citas", label: "Cronograma de Citas", icon: CalendarDays },
  { to: "/obstetra/nueva-gestante", label: "Nueva Gestante", icon: UserPlus },
  { to: "/obstetra/reportes", label: "Reportes", icon: BarChart2 },
];

interface Props { open: boolean; onClose: () => void; }

export function SidebarObstetra({ open, onClose }: Props) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={onClose} />}
      <aside className={`fixed md:static top-0 left-0 h-full z-30 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Heart size={16} className="text-rose-600 shrink-0" />
            <div>
              <div className="font-semibold text-gray-900 text-sm">VITMATERNA</div>
              <div className="text-gray-400 text-xs">Panel Obstetra</div>
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
                  ? "bg-rose-50 text-rose-700 font-medium"
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
          <div className="text-xs text-gray-400">C.S. Talavera · Andahuaylas</div>
        </div>
      </aside>
    </>
  );
}
