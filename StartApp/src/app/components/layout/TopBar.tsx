import { Bell, LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

interface TopBarProps {
  titulo: string;
  alertas?: number;
  onMenuToggle?: () => void;
  colorScheme: "gestante" | "obstetra" | "admin";
}

const accent: Record<string, string> = {
  gestante: "border-b-violet-200",
  obstetra: "border-b-rose-200",
  admin: "border-b-blue-200",
};

export function TopBar({ titulo, alertas = 0, onMenuToggle, colorScheme }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className={`flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 ${accent[colorScheme]}`}>
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button onClick={onMenuToggle} className="md:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100">
            <Menu size={18} />
          </button>
        )}
        <span className="font-medium text-gray-900 text-sm">{titulo}</span>
      </div>
      <div className="flex items-center gap-4">
        {alertas > 0 && (
          <div className="relative cursor-pointer text-gray-500 hover:text-gray-700">
            <Bell size={18} />
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">
              {alertas}
            </span>
          </div>
        )}
        <div className="hidden sm:flex flex-col items-end leading-none">
          <span className="text-xs font-medium text-gray-900">{user?.nombre}</span>
          <span className="text-[11px] text-gray-400 capitalize mt-0.5">{user?.rol}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1.5 rounded hover:bg-gray-100"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
