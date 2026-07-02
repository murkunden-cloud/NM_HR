import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import Vacancy from "@/pages/Vacancy";
import Employees from "@/pages/Employees";
import TransferOrders from "@/pages/TransferOrders";
import Users from "@/pages/Users";
import Audit from "@/pages/Audit";


function Protected({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500" style={{ background: "#F7F8FB" }}>
      <div className="font-display text-base font-semibold">Loading…</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster theme="light" position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Vacancy /></Protected>} />
          <Route path="/employees" element={<Protected><Employees /></Protected>} />
          <Route path="/orders" element={<Protected><TransferOrders /></Protected>} />

          <Route path="/users" element={<Protected adminOnly><Users /></Protected>} />
          <Route path="/audit" element={<Protected adminOnly><Audit /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
