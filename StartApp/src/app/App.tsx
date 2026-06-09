import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";

import LayoutGestante from "./pages/gestante/LayoutGestante";
import DashboardGestante from "./pages/gestante/DashboardGestante";
import CitasGestante from "./pages/gestante/CitasGestante";
import TratamientoGestante from "./pages/gestante/TratamientoGestante";
import EducacionGestante from "./pages/gestante/EducacionGestante";
import ReporteAdherencia from "./pages/gestante/ReporteAdherencia";
import SignosAlarma from "./pages/gestante/SignosAlarma";

import LayoutObstetra from "./pages/obstetra/LayoutObstetra";
import DashboardObstetra from "./pages/obstetra/DashboardObstetra";
import ListaGestantes from "./pages/obstetra/ListaGestantes";
import PerfilGestante from "./pages/obstetra/PerfilGestante";
import NuevaGestante from "./pages/obstetra/NuevaGestante";
import CitasObstetra from "./pages/obstetra/CitasObstetra";
import ReportesObstetra from "./pages/obstetra/ReportesObstetra";

import DashboardAdmin from "./pages/admin/DashboardAdmin";

function ProtectedRoute({ children, requiredRol }: { children: React.ReactNode; requiredRol: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.rol !== requiredRol) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to={`/${user.rol}`} replace /> : <LoginPage />}
      />

      <Route
        path="/gestante"
        element={
          <ProtectedRoute requiredRol="gestante">
            <LayoutGestante />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardGestante />} />
        <Route path="citas" element={<CitasGestante />} />
        <Route path="tratamiento" element={<TratamientoGestante />} />
        <Route path="educacion" element={<EducacionGestante />} />
        <Route path="reportes" element={<ReporteAdherencia />} />
        <Route path="alarmas" element={<SignosAlarma />} />
      </Route>

      <Route
        path="/obstetra"
        element={
          <ProtectedRoute requiredRol="obstetra">
            <LayoutObstetra />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardObstetra />} />
        <Route path="gestantes" element={<ListaGestantes />} />
        <Route path="gestante/:id" element={<PerfilGestante />} />
        <Route path="nueva-gestante" element={<NuevaGestante />} />
        <Route path="citas" element={<CitasObstetra />} />
        <Route path="reportes" element={<ReportesObstetra />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRol="admin">
            <DashboardAdmin />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
