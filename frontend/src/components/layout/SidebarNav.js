import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileText, Receipt, Users, Building2, Copy, Settings, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/components/ui-kit";
import { useAppData } from "@/context/AppDataContext";

const items = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard, testid: "sidebar-nav-dashboard-link", end: true },
  { to: "/invoices", key: "nav.invoices", icon: FileText, testid: "sidebar-nav-invoices-link" },
  { to: "/expenses", key: "nav.expenses", icon: Receipt, testid: "sidebar-nav-expenses-link" },
  { to: "/clients", key: "nav.clients", icon: Users, testid: "sidebar-nav-clients-link" },
  { to: "/companies", key: "nav.companies", icon: Building2, testid: "sidebar-nav-companies-link" },
  { to: "/templates", key: "nav.templates", icon: Copy, testid: "sidebar-nav-templates-link" },
  { to: "/settings", key: "nav.settings", icon: Settings, testid: "sidebar-nav-settings-link" },
];

export const SidebarNav = ({ onNavigate, onClose, showClose }) => {
  const { t } = useI18n();
  const { settings } = useAppData();
  const isSimulation = !settings?.ksef_token;
  const envName = settings?.ksef_env === "prod" ? "PRODUKCJA" : settings?.ksef_env === "demo" ? "DEMO" : "TEST";
  return (
    <div className="flex h-full flex-col bg-[#0f172a] text-slate-200">
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">F</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Faktura</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-indigo-300">KSeF 2.0</div>
          </div>
        </div>
        {showClose && (
          <button onClick={onClose} aria-label="Zamknij menu" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to} to={it.to} end={it.end} data-testid={it.testid}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 h-6 w-1 rounded-r bg-indigo-400" />}
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{t(it.key)}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-[11px] text-slate-400">
        {isSimulation ? (
          "Tryb symulacji KSeF — dane zapisywane w bazie"
        ) : (
          `Połączono z KSeF (${envName})`
        )}
      </div>
    </div>
  );
};
