import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, FileOutput, Repeat } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { Card, Button } from "@/components/ui-kit";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { formatMoney, formatDate } from "@/lib/format";
import { computeVatGroups } from "@/lib/vat";

export default function Templates() {
  const { templates, clients, refreshTemplates, refreshInvoices, refreshDashboard, api } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const clientName = (id) => clients.find((c) => c.id === id)?.name || "—";
  const issue = async (t) => {
    try { const r = (await api.post(`/templates/${t.id}/issue`)).data; toast.success(`Wystawiono fakturę ${r.number}`); await Promise.all([refreshInvoices(), refreshDashboard()]); }
    catch (e) { toast.error(e.response?.data?.detail || "Błąd wystawiania"); }
  };
  const doDelete = async () => {
    try { await api.delete(`/templates/${confirmDel.id}`); toast.success("Usunięto szablon"); await refreshTemplates(); }
    catch (e) { toast.error("Błąd usuwania"); }
    finally { setConfirmDel(null); }
  };

  return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Szablony</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="template-create-button"><Plus className="h-4 w-4" /> Nowy szablon</Button>
      </div>

      {templates.length === 0 ? (
        <Card><EmptyState icon={Copy} title="Brak szablonów" description="Twórz szablony dla powtarzalnych faktur." actionLabel="Nowy szablon" onAction={() => setFormOpen(true)} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t, idx) => {
            const vat = computeVatGroups(t.items || []);
            return (
              <Card key={t.id} className="flex flex-col p-5" data-testid={`template-card-${idx}`}>
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{t.name}</div>
                  {t.cyclic && <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"><Repeat className="h-3 w-3" /> {t.frequency}</span>}
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <div>Klient: <span className="text-slate-700 dark:text-slate-200">{clientName(t.client_id)}</span></div>
                  <div>Pozycji: {t.items?.length || 0} · Brutto <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{formatMoney(vat.total_gross)}</span></div>
                  {t.cyclic && <div>Następna: {formatDate(t.first_date)}</div>}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" onClick={() => issue(t)} data-testid={`template-issue-${idx}`}><FileOutput className="h-4 w-4" /> Wystaw fakturę</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(t); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDel(t)} className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TemplateForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={doDelete} message={`Usunąć szablon ${confirmDel?.name}?`} />
    </div>
  );
}
