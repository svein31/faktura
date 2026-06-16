import React, { useState } from "react";
import { toast } from "sonner";
import { Send, Copy, Printer, Pencil, ClipboardCopy, FileCheck2, History, ShieldCheck, FlaskConical, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Modal, ModalHeader, Button, Select } from "@/components/ui-kit";
import { A4InvoicePreview } from "@/components/invoices/A4InvoicePreview";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAppData } from "@/context/AppDataContext";
import { formatMoney, formatDate, INVOICE_STATUSES } from "@/lib/format";

export const InvoiceDetailModal = ({ open, onClose, invoice, onEdit }) => {
  const { companies, refreshInvoices, refreshDashboard, api } = useAppData();
  const [busy, setBusy] = useState(false);
  const [showUpo, setShowUpo] = useState(false);
  const [ksefError, setKsefError] = useState(null);
  const [showErrorDetail, setShowErrorDetail] = useState(true);
  const [tab, setTab] = useState("preview");
  if (!invoice) return null;
  const company = companies.find((c) => c.id === invoice.company_id);
  const cur = invoice.currency || "PLN";

  const lastError = ksefError || invoice.ksef_last_error;

  const sendKsef = async () => {
    setBusy(true);
    setKsefError(null);
    try {
      const res = (await api.post(`/invoices/${invoice.id}/send-ksef`)).data;
      toast.success(`Wysłano do KSeF: ${res.ksef.ksef_number}`);
      await Promise.all([refreshInvoices(), refreshDashboard()]);
      onClose();
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Nieznany błąd";
      setKsefError({ message: detail, at: new Date().toISOString() });
      toast.error("Błąd wysyłki do KSeF — sprawdź szczegóły poniżej");
      await refreshInvoices();
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status) => {
    try {
      await api.post(`/invoices/${invoice.id}/status`, { status });
      toast.success(`Status: ${status}`);
      await Promise.all([refreshInvoices(), refreshDashboard()]);
      onClose();
    } catch (e) { toast.error("Błąd zmiany statusu"); }
  };
  const duplicate = async () => {
    try { await api.post(`/invoices/${invoice.id}/duplicate`); toast.success("Zduplikowano fakturę"); await refreshInvoices(); onClose(); }
    catch (e) { toast.error("Błąd duplikowania"); }
  };
  const copyJson = () => { navigator.clipboard.writeText(JSON.stringify(invoice, null, 2)); toast.success("Skopiowano dane faktury (JSON)"); };
  const downloadUpo = () => {
    const blob = new Blob([invoice.ksef?.upo_xml || ""], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `UPO_${invoice.number?.replace(/\//g, "_")}.xml`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onClose={onClose} size="xl" className="h-[calc(100dvh-2rem)] sm:h-[calc(100dvh-4rem)] flex flex-col">
      <ModalHeader title={<span className="font-mono">{invoice.number}</span>} subtitle={`${invoice.buyer?.name || ""} · ${formatMoney(invoice.vat_summary?.total_gross, cur)}`} onClose={onClose}>
        <StatusBadge status={invoice.effective_status || invoice.status} />
      </ModalHeader>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3 dark:border-white/10">
        <Button size="sm" variant="outline" onClick={() => onEdit(invoice)} data-testid="invoice-edit-button"><Pencil className="h-4 w-4" /> Edytuj</Button>
        <Button size="sm" variant="outline" onClick={duplicate} data-testid="invoice-duplicate-button"><Copy className="h-4 w-4" /> Duplikuj</Button>
        <Button size="sm" onClick={sendKsef} loading={busy} data-testid="ksef-send-button"><Send className="h-4 w-4" /> Wyślij do KSeF</Button>
        <Button size="sm" variant="outline" onClick={() => window.print()} data-testid="invoice-print-button"><Printer className="h-4 w-4" /> Drukuj / PDF</Button>
        <Button size="sm" variant="ghost" onClick={copyJson}><ClipboardCopy className="h-4 w-4" /> Kopiuj JSON</Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <div className="w-40"><Select value={invoice.status} onChange={changeStatus} options={INVOICE_STATUSES} data-testid="invoice-status-select" /></div>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-12">
        <div className="overflow-y-auto p-4 lg:col-span-7">
          <A4InvoicePreview invoice={invoice} company={company} vat={invoice.vat_summary} printable />
        </div>
        <div className="space-y-4 overflow-y-auto border-t border-slate-200 p-4 dark:border-white/10 lg:col-span-5 lg:border-l lg:border-t-0">

          {/* KSeF error panel */}
          {lastError && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-500/40 dark:bg-red-500/10">
              <button
                className="flex w-full items-center justify-between gap-2"
                onClick={() => setShowErrorDetail((s) => !s)}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Błąd wysyłki do KSeF
                  {lastError.at && (
                    <span className="text-[10px] font-normal text-red-400 ml-1">
                      {new Date(lastError.at).toLocaleString("pl-PL")}
                    </span>
                  )}
                </div>
                {showErrorDetail
                  ? <ChevronUp className="h-4 w-4 text-red-400 shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-red-400 shrink-0" />}
              </button>
              {showErrorDetail && (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-red-900/10 dark:bg-red-900/30 p-2 text-[11px] text-red-800 dark:text-red-200 font-mono leading-relaxed">
                  {lastError.message}
                </pre>
              )}
              {lastError.mode && (
                <p className="mt-1 text-[10px] text-red-400">
                  Tryb: <span className="font-semibold uppercase">{lastError.mode}</span>
                  {lastError.environment && <> · Środowisko: <span className="font-semibold uppercase">{lastError.environment}</span></>}
                </p>
              )}
            </div>
          )}

          {/* KSeF panel */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><FileCheck2 className="h-4 w-4 text-indigo-600" /> KSeF</div>
            {invoice.ksef?.ksef_number ? (
              <div className="space-y-1 text-xs">
                {(() => {
                  const isReal = invoice.ksef.mode === "real";
                  const env = (invoice.ksef.environment || "").toLowerCase();
                  const isProd = env === "prod" || env === "production";
                  return (
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isReal && isProd ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" :
                        isReal ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" :
                        "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                      }`}>
                        {isReal ? <ShieldCheck className="h-3 w-3" /> : <FlaskConical className="h-3 w-3" />}
                        {isReal ? (isProd ? "Produkcja KSeF" : "KSeF TEST") : "Symulacja"}
                      </span>
                    </div>
                  );
                })()}
                <div className="flex justify-between gap-2"><span className="text-slate-500">Numer KSeF</span><span className="font-mono break-all text-right">{invoice.ksef.ksef_number}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Środowisko</span><span className="font-medium uppercase">{invoice.ksef.environment}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="text-emerald-600 font-medium">{invoice.ksef.status}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Wysłano</span><span>{new Date(invoice.ksef.sent_at).toLocaleString("pl-PL")}</span></div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowUpo((s) => !s)}>{showUpo ? "Ukryj UPO" : "Pokaż UPO"}</Button>
                  <Button size="sm" variant="ghost" onClick={downloadUpo}>⬇ Pobierz UPO</Button>
                </div>
                {showUpo && <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 p-2 text-[10px] text-emerald-200">{invoice.ksef.upo_xml}</pre>}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Faktura nie została jeszcze wysłana do KSeF.</p>
            )}
          </div>

          {/* History */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><History className="h-4 w-4 text-slate-400" /> Historia zmian</div>
            <ol className="space-y-2">
              {(invoice.history || []).slice().reverse().map((h, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  <div>
                    <div className="text-slate-700 dark:text-slate-200">{h.event}</div>
                    <div className="text-slate-400">{new Date(h.at).toLocaleString("pl-PL")}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Modal>
  );
};
