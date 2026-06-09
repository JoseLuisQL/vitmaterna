import { useState } from "react";
import { Outlet } from "react-router";
import { SidebarGestante } from "../../components/layout/SidebarGestante";
import { TopBar } from "../../components/layout/TopBar";

export default function LayoutGestante() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SidebarGestante open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          titulo="VITMATERNA"
          colorScheme="gestante"
          onMenuToggle={() => setMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
