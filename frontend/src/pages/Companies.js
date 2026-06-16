import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle2, Building2, Landmark } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { Card, Button } from "@/components/ui-kit";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { formatNip } from "@/lib/nip";

export default function Companies() {
  const { companies, refreshCompanies, refreshInvoices, api } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const activate = async (c) => {
    try { await api.post(`/companies/${c.id}/activate`); toast.success(`Aktywna firma: ${c.short_name || c.name}`); await Promise.all([refreshCompanies(), refreshInvoices()]); }
    catch (e) { toast.error("Błąd"); }
  };
  const doDelete = async () => {
    try { await api.delete(`/companies/${confirmDel.id}`); toast.success("Usunięto firmę"); await refreshCompanies(); }
    catch (e) { toast.error("Błąd usuwania"); }
    finally { setConfirmDel(null); }
  };

  return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Moje firmy</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="company-create-button"><Plus className="h-4 w-4" /> Nowa firma</Button>
      </div>

      {companies.length === 0 ? (
        <Card><EmptyState icon={Building2} title="Brak firm" description="Dodaj swoją firmę, aby wystawiać faktury." actionLabel="Nowa firma" onAction={() => setFormOpen(true)} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {companies.map((c, idx) => (
            <Card key={c.id} className="p-5" data-testid={`company-card-${idx}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"><Building2 className="h-5 w-5" /></div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</div>
                    <div className="font-mono text-xs text-slate-400">NIP {formatNip(c.nip)}</div>
                  </div>
                </div>
                {c.is_active && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Aktywna</span>}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div>{c.street}, {c.postal_code} {c.city}</div>
                <div className="flex items-center gap-1"><Landmark className="h-3 w-3" /> {c.bank_accounts?.[0]?.iban || "brak konta"}</div>
                <div>{c.vat_status} · {c.tax_form}</div>
                <div>Schemat: <span className="font-mono">{c.invoice_scheme}</span></div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {!c.is_active && <Button size="sm" variant="secondary" onClick={() => activate(c)} data-testid={`company-activate-${idx}`}>Ustaw jako aktywną</Button>}
                <Button size="sm" variant="outline" onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil className="h-4 w-4" /> Edytuj</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDel(c)} className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CompanyForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={doDelete} message={`Usunąć firmę ${confirmDel?.name}?`} />
    </div>
  );
}
