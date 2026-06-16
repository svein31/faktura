import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/context/AuthContext";
import { AppDataProvider } from "@/context/AppDataContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Invoices from "@/pages/Invoices";
import Expenses from "@/pages/Expenses";
import Clients from "@/pages/Clients";
import Companies from "@/pages/Companies";
import Templates from "@/pages/Templates";
import Settings from "@/pages/Settings";

import { ErrorBoundary } from "@/components/ErrorBoundary";

function Root() {
  if (window.location.hash && window.location.hash.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  const basename = window.location.pathname.startsWith("/faktura") ? "/faktura" : "";
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <AppDataProvider>
            <BrowserRouter basename={basename}>
              <Root />
              <Toaster richColors closeButton position="top-right" />
            </BrowserRouter>
          </AppDataProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
