import React from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Landmark, Wallet, ArrowRight, AlertTriangle, CalendarClock, Crown } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { useI18n } from "@/lib/i18n";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, Spinner, Button } from "@/components/ui-kit";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { HealthGauge } from "@/components/charts/HealthGauge";
import { formatMoney, formatDate } from "@/lib/format";

export default function Dashboard() {
  const { dashboard, loading, refreshAll } = useAppData();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Spinner className="h-7 w-7" /></div>;
  }

  if (!dashboard) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Nie udało się załadować danych pulpitu.</p>
        <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">Sprawdź połączenie z bazą danych (np. zmienną MONGO_URL) lub spróbuj ponownie.</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={refreshAll}>Odśwież dane</Button>
      </div>
    );
  }

  const k = dashboard?.kpis || { revenue_month: 0, expenses_month: 0, vat_to_pay: 0, net_profit: 0 };
  const bars = dashboard?.bars || [];
  const revenue_pie = dashboard?.revenue_pie || [];
  const health_score = dashboard?.health?.score ?? 50;
  const recent_invoices = dashboard?.recent_invoices || [];
  const top_clients = dashboard?.top_clients || [];
  const overdue_invoices = dashboard?.overdue_invoices || [];
  const upcoming_payments = dashboard?.upcoming_payments || [];

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-200">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t("dashboard.title")}</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={TrendingUp} accent="indigo" label={t("dashboard.revenue")} value={formatMoney(k.revenue_month)} testId="kpi-monthly-revenue-value" />
        <KpiCard icon={TrendingDown} accent="slate" label={t("dashboard.expenses")} value={formatMoney(k.expenses_month)} testId="kpi-monthly-expenses-value" />
        <KpiCard icon={Landmark} accent="amber" label={t("dashboard.vat")} value={formatMoney(k.vat_to_pay)} testId="kpi-vat-to-pay-value" />
        <KpiCard icon={Wallet} accent={(k.net_profit || 0) >= 0 ? "emerald" : "rose"} label={t("dashboard.profit")} value={formatMoney(k.net_profit)} testId="kpi-net-profit-value" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="p-5 lg:col-span-7">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("dashboard.revenueVsExpenses")}</h2>
          <BarChart data={bars} />
        </Card>
        <Card className="p-5 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("dashboard.revenueByClient")}</h2>
          <PieChart data={revenue_pie} />
        </Card>
        <Card className="flex flex-col items-center justify-center p-5 lg:col-span-2">
          <h2 className="mb-2 self-start text-sm font-semibold text-slate-700 dark:text-slate-200">{t("dashboard.health")}</h2>
          <HealthGauge score={health_score} label="" />
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("dashboard.recentInvoices")}</h2>
            <button onClick={() => navigate("/invoices")} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">Wszystkie <ArrowRight className="h-3 w-3" /></button>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {recent_invoices.length === 0 && <tr><td className="px-5 py-6 text-center text-slate-400">Brak faktur</td></tr>}
              {recent_invoices.map((i, idx) => (
                <tr key={i.id} className={idx % 2 ? "bg-slate-50/60 dark:bg-white/5" : ""}>
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-200">{i.number}</td>
                  <td className="px-2 py-2.5 text-slate-600 dark:text-slate-300">{i.client}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatMoney(i.gross, i.currency)}</td>
                  <td className="px-5 py-2.5 text-right"><StatusBadge status={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-4 lg:col-span-4">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Crown className="h-4 w-4 text-amber-500" /> {t("dashboard.topClients")}</h2>
            <div className="space-y-2">
              {top_clients.length === 0 && <p className="text-sm text-slate-400">Brak danych</p>}
              {top_clients.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{i + 1}</span><span className="truncate text-slate-700 dark:text-slate-200">{c.name}</span></span>
                  <span className="font-mono text-xs font-medium">{formatMoney(c.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><AlertTriangle className="h-4 w-4 text-rose-500" /> {t("dashboard.overdue")}</h2>
            <div className="space-y-2">
              {overdue_invoices.length === 0 && <p className="text-sm text-slate-400">Brak przeterminowanych — super!</p>}
              {overdue_invoices.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span className="min-w-0"><span className="font-mono text-xs text-slate-700 dark:text-slate-200">{i.number}</span><span className="ml-1 truncate text-xs text-slate-400">{i.client}</span></span>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 font-mono text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{formatMoney(i.gross, i.currency)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><CalendarClock className="h-4 w-4 text-amber-500" /> {t("dashboard.upcoming")}</h2>
            <div className="space-y-2">
              {upcoming_payments.length === 0 && <p className="text-sm text-slate-400">Brak płatności w 7 dni</p>}
              {upcoming_payments.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span className="min-w-0"><span className="font-mono text-xs text-slate-700 dark:text-slate-200">{i.number}</span><span className="ml-1 text-xs text-slate-400">{formatDate(i.due_date)}</span></span>
                  <span className="font-mono text-xs font-medium">{formatMoney(i.gross, i.currency)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
