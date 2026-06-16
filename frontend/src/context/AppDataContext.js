import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshCompanies = useCallback(async () => {
    try {
      setCompanies((await api.get("/companies")).data || []);
    } catch (e) {
      console.error("Failed to fetch companies:", e);
      setCompanies([]);
    }
  }, []);

  const refreshClients = useCallback(async () => {
    try {
      setClients((await api.get("/clients")).data || []);
    } catch (e) {
      console.error("Failed to fetch clients:", e);
      setClients([]);
    }
  }, []);

  const refreshInvoices = useCallback(async () => {
    try {
      setInvoices((await api.get("/invoices")).data || []);
    } catch (e) {
      console.error("Failed to fetch invoices:", e);
      setInvoices([]);
    }
  }, []);

  const refreshExpenses = useCallback(async () => {
    try {
      setExpenses((await api.get("/expenses")).data || []);
    } catch (e) {
      console.error("Failed to fetch expenses:", e);
      setExpenses([]);
    }
  }, []);

  const refreshTemplates = useCallback(async () => {
    try {
      setTemplates((await api.get("/templates")).data || []);
    } catch (e) {
      console.error("Failed to fetch templates:", e);
      setTemplates([]);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setSettings((await api.get("/settings")).data || {});
    } catch (e) {
      console.error("Failed to fetch settings:", e);
      setSettings({});
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      setDashboard((await api.get("/dashboard/summary")).data || null);
    } catch (e) {
      console.error("Failed to fetch dashboard:", e);
      setDashboard(null);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        refreshCompanies(), refreshClients(), refreshInvoices(),
        refreshExpenses(), refreshTemplates(), refreshSettings(), refreshDashboard(),
      ]);
    } catch (e) {
      console.error("Error during refreshAll:", e);
    } finally {
      setLoading(false);
    }
  }, [refreshCompanies, refreshClients, refreshInvoices, refreshExpenses, refreshTemplates, refreshSettings, refreshDashboard]);

  useEffect(() => {
    if (user && user.user_id) {
      refreshAll();
    }
  }, [user, refreshAll]);

  const activeCompany = useMemo(
    () => companies.find((c) => c.is_active) || companies[0] || null,
    [companies]
  );

  const value = {
    companies, clients, invoices, expenses, templates, settings, dashboard, loading, activeCompany,
    refreshAll, refreshCompanies, refreshClients, refreshInvoices, refreshExpenses, refreshTemplates, refreshSettings, refreshDashboard,
    api,
  };
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
