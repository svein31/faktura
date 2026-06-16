import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, FileText, Users } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { Card, Button, Input, Modal, ModalHeader } from "@/components/ui-kit";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ClientForm } from "@/components/clients/ClientForm";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatMoney, formatDate } from "@/lib/format";
import { formatNip } from "@/lib/nip";

export default function Clients() {
  const { clients, refreshClients, api } = useAppData();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [invoicesOf, setInvoicesOf] = useState(null);
  const [clientInvoices, setClientInvoices] = useState([]);

  useEffect(() => { if (location.state?.openNew) { setEditing(null); setFormOpen(true); } }, [location.state]);

  const filtered = useMemo(() => clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || `${c.name} ${c.nip} ${c.city}`.toLowerCase().includes(q);
  }), [clients, search]);

  const showInvoices = async (c) => {
    setInvoicesOf(c);
    try { setClientInvoices((await api.get(`/clients/${c.id}/invoices`)).data); } catch (e) { setClientInvoices([]); }
  };
  const doDelete = async () => {
    try { await api.delete(`/clients/${confirmDel.id}`); toast.success("Usunięto klienta"); await refreshClients(); }
    catch (e) { toast.error("Błąd usuwania"); }
    finally { setConfirmDel(null); }
  };

  return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Klienci</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="client-create-button"><Plus className="h-4 w-4" /> Nowy klient</Button>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-8" placeholder="Szukaj klienta..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="client-search-input" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Brak klientów" description="Dodaj pierwszego klienta." actionLabel="Nowy klient" onAction={() => setFormOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-950/70">
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Nazwa</th><th className="px-2 py-2.5 font-medium">NIP / PESEL</th><th className="px-2 py-2.5 font-medium">Miasto</th><th className="px-2 py-2.5 font-medium">Kontakt</th><th className="px-2 py-2.5 text-right font-medium">Faktury</th><th className="px-2 py-2.5 text-right font-medium">Przychód</th><th className="px-4 py-2.5 text-right font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => (
                  <tr key={c.id} className={`group transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 ${idx % 2 ? "bg-slate-50/60 dark:bg-white/5" : ""}`} data-testid={`client-row-${idx}`}>
                    <td className="px-4 py-2.5"><div className="font-medium text-slate-800 dark:text-slate-100">{c.name}</div><div className="text-xs text-slate-400">{c.type}</div></td>
                    <td className="px-2 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{c.nip ? formatNip(c.nip) : c.pesel || "—"}</td>
                    <td className="px-2 py-2.5 text-slate-500">{c.city}</td>
                    <td className="px-2 py-2.5 text-xs text-slate-500"><div>{c.email}</div><div>{c.phone}</div></td>
                    <td className="px-2 py-2.5 text-right font-mono">{c.invoice_count}</td>
                    <td className="px-2 py-2.5 text-right font-mono font-medium">{formatMoney(c.total_revenue)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                        <button onClick={() => showInvoices(c)} aria-label="Faktury klienta" className="rounded p-1.5 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/10"><FileText className="h-4 w-4" /></button>
                        <button onClick={() => { setEditing(c); setFormOpen(true); }} aria-label="Edytuj" className="rounded p-1.5 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setConfirmDel(c)} aria-label="Usuń" className="rounded p-1.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ClientForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={doDelete} message={`Usunąć klienta ${confirmDel?.name}?`} />

      <Modal open={!!invoicesOf} onClose={() => setInvoicesOf(null)} size="lg">
        <ModalHeader title={`Faktury: ${invoicesOf?.name || ""}`} onClose={() => setInvoicesOf(null)} />
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {clientInvoices.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Brak faktur dla tego klienta</p> : (
            <table className="w-full text-sm">
              <tbody>
                {clientInvoices.map((i, idx) => (
                  <tr key={i.id} className={idx % 2 ? "bg-slate-50/60 dark:bg-white/5" : ""}>
                    <td className="px-3 py-2 font-mono text-xs">{i.number}</td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(i.issue_date)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMoney(i.vat_summary?.total_gross, i.currency)}</td>
                    <td className="px-3 py-2 text-right"><StatusBadge status={i.effective_status || i.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </div>
  );
}
