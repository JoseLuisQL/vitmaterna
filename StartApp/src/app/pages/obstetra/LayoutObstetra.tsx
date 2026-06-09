import { useState } from "react";
import { Outlet } from "react-router";
import { SidebarObstetra } from "../../components/layout/SidebarObstetra";
import { TopBar } from "../../components/layout/TopBar";
import { alertasPendientes } from "../../data/mockData";

export default function LayoutObstetra() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SidebarObstetra open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          titulo="VITMATERNA"
          colorScheme="obstetra"
          alertas={alertasPendientes.length}
          onMenuToggle={() => setMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
