import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Eye, Pencil, Copy, Send, Trash2, Download, ShieldCheck, FlaskConical } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { Card, Button, Input, Select, cn } from "@/components/ui-kit";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InvoiceEditorModal } from "@/components/invoices/InvoiceEditorModal";
import { InvoiceDetailModal } from "@/components/invoices/InvoiceDetailModal";
import { formatMoney, formatDate, INVOICE_STATUSES } from "@/lib/format";
import { FileText } from "lucide-react";

function KsefBadge({ ksef }) {
  if (!ksef?.ksef_number) return null;
  const isReal = ksef.mode === "real";
  const env = (ksef.environment || "").toLowerCase();
  const isProd = env === "prod" || env === "production";
  const label = isReal ? (isProd ? "PROD" : "TEST") : "SYM";
  const short = ksef.ksef_number.length > 20 ? ksef.ksef_number.slice(-16) + "…" : ksef.ksef_number;
  return (
    <div className="mt-0.5 flex items-center gap-1">
      <span className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold leading-none",
        isReal && isProd ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" :
        isReal ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" :
        "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
      )}>
        {isReal ? <ShieldCheck className="h-2.5 w-2.5" /> : <FlaskConical className="h-2.5 w-2.5" />}
        {label}
      </span>
      <span className="font-mono text-[10px] text-slate-400">{short}</span>
    </div>
  );
}

function downloadUpo(inv) {
  const blob = new Blob([inv.ksef?.upo_xml || ""], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `UPO_${(inv.number || "faktura").replace(/\//g, "_")}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Invoices() {
  const { invoices, refreshInvoices, refreshDashboard, api } = useAppData();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [month, setMonth] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [ksefFilter, setKsefFilter] = useState("all");

  useEffect(() => {
    if (location.state?.openNew) { setEditing(null); setEditorOpen(true); }
    if (location.state?.openId) {
      const inv = invoices.find((i) => i.id === location.state.openId);
      if (inv) setDetail(inv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const filtered = useMemo(() => {
    let list = invoices.filter((i) => {
      const q = search.toLowerCase();
      const matchQ = !q || `${i.number} ${i.buyer?.name || ""}`.toLowerCase().includes(q);
      const matchS = statusFilter === "all" || (i.effective_status || i.status) === statusFilter;
      const matchM = !month || String(i.issue_date).slice(0, 7) === month;
      const k = i.ksef;
      let matchK = true;
      if (ksefFilter === "sent") matchK = !!k?.ksef_number;
      else if (ksefFilter === "not_sent") matchK = !k?.ksef_number;
      else if (ksefFilter === "simulation") matchK = !!k?.ksef_number && k.mode !== "real";
      else if (ksefFilter === "real_test") matchK = !!k?.ksef_number && k.mode === "real" && !["prod","production"].includes((k.environment||"").toLowerCase());
      else if (ksefFilter === "real_prod") matchK = !!k?.ksef_number && k.mode === "real" && ["prod","production"].includes((k.environment||"").toLowerCase());
      return matchQ && matchS && matchM && matchK;
    });
    list = [...list].sort((a, b) => {
      if (sort === "date_desc") return String(b.issue_date).localeCompare(String(a.issue_date));
      if (sort === "date_asc") return String(a.issue_date).localeCompare(String(b.issue_date));
      if (sort === "amount_desc") return (b.vat_summary?.total_gross || 0) - (a.vat_summary?.total_gross || 0);
      if (sort === "amount_asc") return (a.vat_summary?.total_gross || 0) - (b.vat_summary?.total_gross || 0);
      if (sort === "client") return String(a.buyer?.name || "").localeCompare(String(b.buyer?.name || ""));
      return 0;
    });
    return list;
  }, [invoices, search, statusFilter, month, sort, ksefFilter]);

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (inv) => { setDetail(null); setEditing(inv); setEditorOpen(true); };
  const quickSend = async (inv) => {
    try { const r = (await api.post(`/invoices/${inv.id}/send-ksef`)).data; toast.success(`Wysłano do KSeF: ${r.ksef.ksef_number}`); await Promise.all([refreshInvoices(), refreshDashboard()]); }
    catch (e) { toast.error("Błąd wysyłki"); }
  };
  const quickDup = async (inv) => {
    try { await api.post(`/invoices/${inv.id}/duplicate`); toast.success("Zduplikowano"); await refreshInvoices(); }
    catch (e) { toast.error("Błąd"); }
  };
  const doDelete = async () => {
    try { await api.delete(`/invoices/${confirmDel.id}`); toast.success("Usunięto fakturę"); await Promise.all([refreshInvoices(), refreshDashboard()]); }
    catch (e) { toast.error("Błąd usuwania"); }
    finally { setConfirmDel(null); }
  };

  return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Faktury sprzedaży</h1>
        <Button onClick={openNew} data-testid="invoice-create-button"><Plus className="h-4 w-4" /> Nowa faktura</Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-8" placeholder="Szukaj po numerze lub kliencie..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="invoice-search-input" />
          </div>
          <div className="w-44"><Select value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "Wszystkie statusy" }, ...INVOICE_STATUSES.map((s) => ({ value: s, label: s }))]} data-testid="invoice-list-filter-status-select" /></div>
          <div className="w-44"><Select value={ksefFilter} onChange={setKsefFilter} options={[{ value: "all", label: "Wszystkie KSeF" }, { value: "sent", label: "✓ Wysłane do KSeF" }, { value: "not_sent", label: "✗ Nie wysłane" }, { value: "real_prod", label: "🟢 Produkcja KSeF" }, { value: "real_test", label: "🔵 KSeF TEST" }, { value: "simulation", label: "⬜ Symulacja" }]} data-testid="invoice-ksef-filter" /></div>
          <div className="w-40"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="invoice-filter-month" /></div>
          <div className="w-44"><Select value={sort} onChange={setSort} options={[{ value: "date_desc", label: "Data malejąco" }, { value: "date_asc", label: "Data rosnąco" }, { value: "amount_desc", label: "Kwota malejąco" }, { value: "amount_asc", label: "Kwota rosnąco" }, { value: "client", label: "Klient (A-Z)" }]} /></div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Brak faktur" description="Utwórz pierwszą fakturę sprzedaży." actionLabel="Nowa faktura" onAction={openNew} testId="invoices-empty-create-button" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-950/70">
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-2.5 font-medium">Numer</th>
                  <th className="px-2 py-2.5 font-medium">Wystawiona</th>
                  <th className="px-2 py-2.5 font-medium">Termin</th>
                  <th className="px-2 py-2.5 font-medium">Nabywca</th>
                  <th className="px-2 py-2.5 text-right font-medium">Netto</th>
                  <th className="px-2 py-2.5 text-right font-medium">VAT</th>
                  <th className="px-2 py-2.5 text-right font-medium">Brutto</th>
                  <th className="px-2 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i, idx) => (
                  <tr key={i.id} className={`group cursor-pointer transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 ${idx % 2 ? "bg-slate-50/60 dark:bg-white/5" : ""}`} onClick={() => setDetail(i)} data-testid={`invoice-row-${idx}`}>
                    <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-800 dark:text-slate-100">{i.number}</td>
                    <td className="px-2 py-2.5 text-slate-500">{formatDate(i.issue_date)}</td>
                    <td className="px-2 py-2.5 text-slate-500">{formatDate(i.due_date)}</td>
                    <td className="px-2 py-2.5 text-slate-700 dark:text-slate-200">{i.buyer?.name}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatMoney(i.vat_summary?.total_net, i.currency)}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-500">{formatMoney(i.vat_summary?.total_vat, i.currency)}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums font-medium">{formatMoney(i.vat_summary?.total_gross, i.currency)}</td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={i.effective_status || i.status} />
                      <KsefBadge ksef={i.ksef} />
                    </td>
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setDetail(i)} aria-label="Podgląd" className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => openEdit(i)} aria-label="Edytuj" className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => quickDup(i)} aria-label="Duplikuj" className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => quickSend(i)} aria-label="Wyślij do KSeF" className="rounded p-1.5 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/10"><Send className="h-4 w-4" /></button>
                        {i.ksef?.upo_xml && (
                          <button onClick={() => downloadUpo(i)} aria-label="Pobierz UPO" title="Pobierz UPO XML" className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><Download className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => setConfirmDel(i)} aria-label="Usuń" className="rounded p-1.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InvoiceEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} editing={editing} />
      <InvoiceDetailModal open={!!detail} onClose={() => setDetail(null)} invoice={detail} onEdit={openEdit} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={doDelete} message={`Czy na pewno usunąć fakturę ${confirmDel?.number}?`} />
    </div>
  );
}
