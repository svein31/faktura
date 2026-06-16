import React, { useState } from "react";
import { Menu, Search, Moon, Sun, Languages, LogOut, ChevronDown, Command } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { NotificationsBell } from "@/components/widgets/NotificationsBell";
import { cn } from "@/components/ui-kit";

export const Topbar = ({ onMenuClick, onOpenCommand, onOpenSearch }) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLanguage } = useI18n();
  const { user, logout } = useAuth();
  const { activeCompany } = useAppData();
  const [userMenu, setUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/85 px-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/50 sm:px-5">
      <button onClick={onMenuClick} aria-label="Menu" data-testid="topbar-menu-button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={onOpenCommand} data-testid="command-palette-open-button"
        className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 sm:flex"
      >
        <Search className="h-4 w-4" />
        <span>Szukaj lub komenda...</span>
        <kbd className="ml-2 hidden items-center gap-0.5 rounded border border-slate-300 px-1.5 text-[10px] text-slate-500 dark:border-white/15 md:inline-flex">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>
      <button onClick={onOpenCommand} aria-label="Szukaj" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 sm:hidden">
        <Search className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-1">
        {activeCompany && (
          <div className="mr-1 hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-white/10 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="max-w-[140px] truncate font-medium text-slate-700 dark:text-slate-200">{activeCompany.short_name || activeCompany.name}</span>
          </div>
        )}
        <NotificationsBell />
        <button
          onClick={() => setLanguage(lang === "pl" ? "en" : "pl")} aria-label="Zmień język / Change language" data-testid="topbar-language-toggle"
          className="flex items-center gap-1 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <Languages className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase">{lang}</span>
        </button>
        <button
          onClick={toggleTheme} aria-label="Przełącz motyw (ciemny/jasny)" data-testid="topbar-theme-toggle"
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setUserMenu((o) => !o)} data-testid="topbar-user-menu-button"
            className="flex items-center gap-2 rounded-lg p-1 pl-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
            </div>
            <ChevronDown className="hidden h-4 w-4 opacity-60 sm:block" />
          </button>
          {userMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
              <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-3 py-2 dark:border-white/10">
                  <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{user?.name}</div>
                  <div className="truncate text-xs text-slate-500">{user?.email}</div>
                </div>
                <button onClick={logout} data-testid="logout-button" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10">
                  <LogOut className="h-4 w-4" /> Wyloguj
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
