import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { createPortal } from "react-dom";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Topbar } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/widgets/CommandPalette";
import { VatCalculatorWidget } from "@/components/widgets/VatCalculatorWidget";
import { cn } from "@/components/ui-kit";

export const AppShell = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-[#0b1220]">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-60 border-r border-white/10 lg:block">
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl animate-in slide-in-from-left duration-200">
            <SidebarNav showClose onClose={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>,
        document.body
      )}

      <div className="lg:pl-60">
        <Topbar onMenuClick={() => setMobileOpen(true)} onOpenCommand={() => setCmdOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onOpen={() => setCmdOpen(true)} />
      <VatCalculatorWidget />
    </div>
  );
};
