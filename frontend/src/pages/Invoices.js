import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Eye, Pencil, Copy, Send, Trash2, Download, ShieldCheck, FlaskConical, AlertTriangle, Clock, CheckCircle2, XCircle, SendHorizonal } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { Card, Button, Input, Select, cn } from "@/components/ui-kit";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InvoiceEditorModal } from "@/components/invoices/InvoiceEditorModal";
import { InvoiceDetailModal } from "@/components/invoices/InvoiceDetailModal";
import { formatMoney, formatDate, INVOICE_STATUSES } from "@/lib/format";
import { FileText } from "lucide-react";

function KsefBadge({ ksef, ksefLastError }) {
  // Sent successfully
  if (ksef?.ksef_number) {
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

  // Last send attempt failed
  if (ksefLastError?.message) {
    return (
      <div className="mt-0.5 flex items-center gap-1">
        <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold leading-none bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
          <XCircle className="h-2.5 w-2.5" />
          Błąd KSeF
        </span>
      </div>
    );
  }

  // Not yet sent
  return (
    <div className="mt-0.5 flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold leading-none bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
        <Clock className="h-2.5 w-2.5" />
        Nie wysłano
      </span>
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
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    if (location.state?.openNew) { setEditing(null); setEditorOpen(true); }
    if (location.state?.openId) {
      const inv = invoices.find((i) => i.id === location.state.openId);
      if (inv) setDetail(inv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Invoices not yet sent and with no current error (or with error = candidate for retry)
  const pendingKsef = useMemo(
    () => invoices.filter((i) => !i.ksef?.ksef_number),
    [invoices]
  );
  const errorKsef = useMemo(
    () => invoices.filter((i) => !i.ksef?.ksef_number && i.ksef_last_error?.message),
    [invoices]
  );

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
      else if (ksefFilter === "error") matchK = !k?.ksef_number && !!i.ksef_last_error?.message;
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
    setSendingId(inv.id);
    try {
      const r = (await api.post(`/invoices/${inv.id}/send-ksef`)).data;
      toast.success(`Wysłano do KSeF: ${r.ksef.ksef_number}`);
      await Promise.all([refreshInvoices(), refreshDashboard()]);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Błąd wysyłki";
      toast.error(`Błąd KSeF: ${msg}`);
    } finally {
      setSendingId(null);
    }
  };

  const sendAllPending = async () => {
    if (pendingKsef.length === 0) return;
    setSendingAll(true);
    let ok = 0; let fail = 0;
    for (const inv of pendingKsef) {
      try {
        await api.post(`/invoices/${inv.id}/send-ksef`);
        ok++;
      } catch {
        fail++;
      }
    }
    await Promise.all([refreshInvoices(), refreshDashboard()]);
    setSendingAll(false);
    if (fail === 0) toast.success(`Wysłano ${ok} faktur do KSeF`);
    else toast.warning(`Wysłano ${ok}, błędy: ${fail}`);
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Faktury sprzedaży</h1>
        <Button onClick={openNew} data-testid="invoice-create-button"><Plus className="h-4 w-4" /> Nowa faktura</Button>
      </div>

      {/* KSeF pending banner */}
      {pendingKsef.length > 0 && (
        <div className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
          errorKsef.length > 0
            ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
            : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
        )}>
          <div className="flex items-center gap-2.5">
            {errorKsef.length > 0
              ? <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              : <Clock className="h-4 w-4 shrink-0 text-amber-500" />}
            <div>
              <span className={cn(
                "text-sm font-semibold",
                errorKsef.length > 0 ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"
              )}>
                {errorKsef.length > 0
                  ? `${errorKsef.length} faktur z błędem KSeF · ${pendingKsef.length - errorKsef.length} oczekujących`
                  : `${pendingKsef.length} ${pendingKsef.length === 1 ? "faktura oczekuje" : "faktur oczekuje"} na wysyłkę do KSeF`}
              </span>
              <p className={cn(
                "text-xs",
                errorKsef.length > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
              )}>
                {errorKsef.length > 0
                  ? "Kliknij ikonę wysyłki przy fakturze, aby spróbować ponownie."
                  : "Użyj przycisku przy każdej fakturze lub wyślij wszystkie naraz."}
              </p>
            </div>
          </div>
          <Button
            variant={errorKsef.length > 0 ? "destructive" : "default"}
            onClick={sendAllPending}
            loading={sendingAll}
            disabled={sendingAll}
            className="shrink-0"
          >
            <SendHorizonal className="h-4 w-4" />
            {sendingAll ? "Wysyłanie…" : `Wyślij wszystkie (${pendingKsef.length})`}
          </Button>
        </div>
      )}

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-8" placeholder="Szukaj po numerze lub kliencie..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="invoice-search-input" />
          </div>
          <div className="w-44"><Select value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "Wszystkie statusy" }, ...INVOICE_STATUSES.map((s) => ({ value: s, label: s }))]} data-testid="invoice-list-filter-status-select" /></div>
          <div className="w-48"><Select value={ksefFilter} onChange={setKsefFilter} options={[
            { value: "all", label: "Wszystkie KSeF" },
            { value: "sent", label: "✓ Wysłane do KSeF" },
            { value: "not_sent", label: "⏳ Oczekujące" },
            { value: "error", label: "✗ Błąd wysyłki" },
            { value: "real_prod", label: "🟢 Produkcja KSeF" },
            { value: "real_test", label: "🔵 KSeF TEST" },
            { value: "simulation", label: "⬜ Symulacja" },
          ]} data-testid="invoice-ksef-filter" /></div>
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
                {filtered.map((i, idx) => {
                  const hasError = !i.ksef?.ksef_number && !!i.ksef_last_error?.message;
                  const isPending = !i.ksef?.ksef_number;
                  const isSending = sendingId === i.id;
                  return (
                    <tr
                      key={i.id}
                      className={cn(
                        "group cursor-pointer transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10",
                        hasError
                          ? "bg-red-50/50 dark:bg-red-500/5"
                          : idx % 2
                            ? "bg-slate-50/60 dark:bg-white/5"
                            : ""
                      )}
                      onClick={() => setDetail(i)}
                      data-testid={`invoice-row-${idx}`}
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-100">{i.number}</span>
                        {hasError && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-red-500">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[160px]">{i.ksef_last_error.message.slice(0, 60)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-slate-500">{formatDate(i.issue_date)}</td>
                      <td className="px-2 py-2.5 text-slate-500">{formatDate(i.due_date)}</td>
                      <td className="px-2 py-2.5 text-slate-700 dark:text-slate-200">{i.buyer?.name}</td>
                      <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatMoney(i.vat_summary?.total_net, i.currency)}</td>
                      <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-500">{formatMoney(i.vat_summary?.total_vat, i.currency)}</td>
                      <td className="px-2 py-2.5 text-right font-mono tabular-nums font-medium">{formatMoney(i.vat_summary?.total_gross, i.currency)}</td>
                      <td className="px-2 py-2.5">
                        <StatusBadge status={i.effective_status || i.status} />
                        <KsefBadge ksef={i.ksef} ksefLastError={i.ksef_last_error} />
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className={cn(
                          "flex items-center justify-end gap-0.5 transition-opacity",
                          isPending ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                        )}>
                          <button onClick={() => setDetail(i)} aria-label="Podgląd" className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => openEdit(i)} aria-label="Edytuj" className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => quickDup(i)} aria-label="Duplikuj" className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"><Copy className="h-4 w-4" /></button>
                          <button
                            onClick={() => quickSend(i)}
                            aria-label="Wyślij do KSeF"
                            disabled={isSending}
                            title={i.ksef?.ksef_number ? "Wyślij ponownie do KSeF" : hasError ? "Wyślij ponownie (poprzednia próba nie powiodła się)" : "Wyślij do KSeF"}
                            className={cn(
                              "rounded p-1.5 transition-colors",
                              isSending ? "animate-pulse cursor-wait text-slate-400" :
                              hasError ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" :
                              isPending ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10" :
                              "text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/10"
                            )}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          {i.ksef?.upo_xml && (
                            <button onClick={() => downloadUpo(i)} aria-label="Pobierz UPO" title="Pobierz UPO XML" className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><Download className="h-4 w-4" /></button>
                          )}
                          <button onClick={() => setConfirmDel(i)} aria-label="Usuń" className="rounded p-1.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
