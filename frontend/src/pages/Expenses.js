import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Receipt } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { Card, Button, Input, Select, Checkbox } from "@/components/ui-kit";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { PieChart } from "@/components/charts/PieChart";
import { formatMoney, formatDate, EXPENSE_CATEGORIES, EXPENSE_STATUSES } from "@/lib/format";

export default function Expenses() {
  const { expenses, refreshExpenses, refreshDashboard, api } = useAppData();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [onlyVat, setOnlyVat] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => { if (location.state?.openNew) { setEditing(null); setFormOpen(true); } }, [location.state]);

  const filtered = useMemo(() => expenses.filter((e) => {
    const q = search.toLowerCase();
    const mq = !q || `${e.supplier_number} ${e.supplier?.name || ""}`.toLowerCase().includes(q);
    const mc = cat === "all" || e.category === cat;
    const ms = statusF === "all" || e.status === statusF;
    const mv = !onlyVat || (e.vat_deduction || 0) > 0;
    return mq && mc && ms && mv;
  }), [expenses, search, cat, statusF, onlyVat]);

  const pie = useMemo(() => {
    const byCat = {};
    expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + (e.vat_summary?.total_net || 0); });
    return Object.entries(byCat).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const nowMonth = new Date().toISOString().slice(0, 7);
  const sumMonth = expenses.filter((e) => String(e.issue_date).slice(0, 7) === nowMonth).reduce((s, e) => s + (e.vat_summary?.total_net || 0), 0);
  const sumYear = expenses.filter((e) => String(e.issue_date).slice(0, 4) === String(new Date().getFullYear())).reduce((s, e) => s + (e.vat_summary?.total_net || 0), 0);

  const doDelete = async () => {
    try { await api.delete(`/expenses/${confirmDel.id}`); toast.success("Usunięto wydatek"); await Promise.all([refreshExpenses(), refreshDashboard()]); }
    catch (e) { toast.error("Błąd usuwania"); }
    finally { setConfirmDel(null); }
  };

  return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Wydatki</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="expense-create-button"><Plus className="h-4 w-4" /> Nowy wydatek</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="p-5 lg:col-span-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Wydatki wg kategorii</h2>
          <PieChart data={pie} />
        </Card>
        <div className="space-y-4 lg:col-span-4">
          <Card className="p-5"><div className="text-xs text-slate-500">Wydatki w miesiącu</div><div className="mt-1 font-mono text-2xl font-semibold">{formatMoney(sumMonth)}</div></Card>
          <Card className="p-5"><div className="text-xs text-slate-500">Wydatki w roku</div><div className="mt-1 font-mono text-2xl font-semibold">{formatMoney(sumYear)}</div></Card>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-8" placeholder="Szukaj dostawcy / numeru..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="expense-search-input" />
          </div>
          <div className="w-44"><Select value={cat} onChange={setCat} options={[{ value: "all", label: "Wszystkie kategorie" }, ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))]} /></div>
          <div className="w-40"><Select value={statusF} onChange={setStatusF} options={[{ value: "all", label: "Wszystkie statusy" }, ...EXPENSE_STATUSES.map((s) => ({ value: s, label: s }))]} /></div>
          <Checkbox checked={onlyVat} onChange={setOnlyVat} label="Mój VAT (odliczalny)" data-testid="expense-vat-filter" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="Brak wydatków" description="Dodaj pierwszą fakturę kosztową." actionLabel="Nowy wydatek" onAction={() => setFormOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-950/70">
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Numer</th><th className="px-2 py-2.5 font-medium">Data</th><th className="px-2 py-2.5 font-medium">Dostawca</th><th className="px-2 py-2.5 font-medium">Kategoria</th><th className="px-2 py-2.5 text-right font-medium">Netto</th><th className="px-2 py-2.5 text-right font-medium">VAT</th><th className="px-2 py-2.5 text-center font-medium">Odlicz.</th><th className="px-2 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 text-right font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, idx) => (
                  <tr key={e.id} className={`group transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 ${idx % 2 ? "bg-slate-50/60 dark:bg-white/5" : ""}`} data-testid={`expense-row-${idx}`}>
                    <td className="px-4 py-2.5 font-mono text-xs">{e.supplier_number}</td>
                    <td className="px-2 py-2.5 text-slate-500">{formatDate(e.issue_date)}</td>
                    <td className="px-2 py-2.5 text-slate-700 dark:text-slate-200">{e.supplier?.name}</td>
                    <td className="px-2 py-2.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">{e.category}</span></td>
                    <td className="px-2 py-2.5 text-right font-mono">{formatMoney(e.vat_summary?.total_net)}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-slate-500">{formatMoney(e.vat_summary?.total_vat)}</td>
                    <td className="px-2 py-2.5 text-center font-mono text-xs">{e.vat_deduction}%</td>
                    <td className="px-2 py-2.5"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                        <button onClick={() => { setEditing(e); setFormOpen(true); }} aria-label="Edytuj" className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setConfirmDel(e)} aria-label="Usuń" className="rounded p-1.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ExpenseForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={doDelete} message={`Usunąć wydatek ${confirmDel?.supplier_number}?`} />
    </div>
  );
}
