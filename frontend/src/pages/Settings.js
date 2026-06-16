import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Download, Upload, DatabaseBackup, CheckCircle2, XCircle, Loader2, FlaskConical, Clock, Send } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/lib/i18n";
import { Card, Button, Input, Textarea, Select, Field, Tabs, Switch } from "@/components/ui-kit";
import { PAYMENT_METHODS, PAYMENT_TERMS } from "@/lib/format";

function KsefStepResults({ result, busy }) {
  if (!result || busy) return null;
  const isPermErr = result.permissions_error ||
    (result.steps || []).some(s => !s.ok && (s.detail || "").includes("BRAK UPRAWNIEŃ TOKENU"));
  const portalUrl = result.environment === "prod"
    ? "https://ksef.mf.gov.pl"
    : "https://ksef-test.mf.gov.pl";
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
        result.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
      }`}>
        {result.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
        {result.message || (result.success ? "Autoryzacja KSeF zakończona sukcesem" : "Autoryzacja KSeF nieudana — sprawdź szczegóły")}
      </div>

      {isPermErr && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none">⚠️</span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Token nie ma uprawnień InvoiceWrite w portalu KSeF</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                KSeF zwrócił <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">presentPermissions: []</code> — token działa, ale nie ma przypisanego uprawnienia do wystawiania faktur.
              </p>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mt-2">Co zrobić:</p>
              <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
                <li>Zaloguj się do portalu KSeF: <a href={portalUrl} target="_blank" rel="noreferrer" className="underline font-medium">{portalUrl}</a></li>
                <li>Przejdź do <strong>Zarządzanie → Uprawnienia → Tokeny</strong></li>
                <li>Znajdź swój token i kliknij <strong>Edytuj</strong></li>
                <li>Zaznacz uprawnienie <strong>InvoiceWrite</strong> (lub FeInvoiceWrite)</li>
                <li>Zapisz i odczekaj ~2 minuty, następnie kliknij „Testuj ponownie"</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {(result.steps || []).length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          {(result.steps || []).map((step, i) => (
            <div key={i} className={`flex gap-3 border-b border-slate-100 dark:border-white/5 last:border-b-0 px-3 py-2.5 ${step.ok ? "" : "bg-red-50/60 dark:bg-red-500/5"}`}>
              <div className="mt-0.5 shrink-0">
                {step.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${step.ok ? "text-slate-700 dark:text-slate-200" : "text-red-700 dark:text-red-300"}`}>
                    {i + 1}. {step.name}
                  </span>
                  {step.duration_ms > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                      <Clock className="h-3 w-3" />{step.duration_ms} ms
                    </span>
                  )}
                </div>
                <p className={`mt-0.5 break-all font-mono text-[11px] leading-relaxed whitespace-pre-wrap ${step.ok ? "text-slate-500 dark:text-slate-400" : "text-red-600 dark:text-red-400"}`}>
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function schemePreview(scheme) {
  const d = new Date();
  return (scheme || "").replace("{YYYY}", d.getFullYear()).replace("{YY}", String(d.getFullYear()).slice(2)).replace("{MM}", String(d.getMonth() + 1).padStart(2, "0")).replace(/\{(N+)\}/g, (m, n) => "1".padStart(n.length, "0")).replace("{TYPE}", "FV");
}

export default function Settings() {
  const { settings, refreshSettings, refreshAll, api } = useAppData();
  const { theme, setTheme } = useTheme();
  const { lang, setLanguage } = useI18n();
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(settings || {});
  const [saving, setSaving] = useState(false);
  const [ksefBusy, setKsefBusy] = useState(false);
  const [ksefSendBusy, setKsefSendBusy] = useState(false);
  const [authTestResult, setAuthTestResult] = useState(null);
  const [sendTestResult, setSendTestResult] = useState(null);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    setSaving(true);
    try { await api.put("/settings", form); toast.success("Ustawienia zapisane"); await refreshSettings(); }
    catch (e) { toast.error("Błąd zapisu"); }
    finally { setSaving(false); }
  };

  const runAuthTest = async () => {
    setKsefBusy(true);
    setAuthTestResult(null);
    setSendTestResult(null);
    try {
      const r = (await api.post("/tools/ksef-auth-test", {
        ksef_token: form.ksef_token,
        ksef_env: form.ksef_env,
      })).data;
      setAuthTestResult(r);
      if (r.success) toast.success("Autoryzacja KSeF zakończona sukcesem!");
      else toast.error("Autoryzacja KSeF nieudana — sprawdź szczegóły");
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || "Nieznany błąd";
      setAuthTestResult({ success: false, steps: [{ name: "Błąd żądania", ok: false, detail, duration_ms: 0 }] });
      toast.error("Błąd testu autoryzacji");
    } finally {
      setKsefBusy(false);
    }
  };

  const runSendTest = async () => {
    setKsefSendBusy(true);
    setSendTestResult(null);
    setAuthTestResult(null);
    try {
      const r = (await api.post("/tools/ksef-send-test", {
        ksef_token: form.ksef_token,
        ksef_env: form.ksef_env,
      })).data;
      setSendTestResult(r);
      if (r.success) toast.success(`Testowa faktura wysłana! Numer KSeF: ${r.ksef_number}`);
      else toast.error("Wysyłka testowej faktury nieudana — sprawdź szczegóły");
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || "Nieznany błąd";
      setSendTestResult({ success: false, steps: [{ name: "Błąd żądania", ok: false, detail, duration_ms: 0 }] });
      toast.error("Błąd wysyłki testowej faktury");
    } finally {
      setKsefSendBusy(false);
    }
  };
  const exportJson = async () => {
    try {
      const data = (await api.get("/reports/export")).data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `backup_faktura_${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Wyeksportowano dane (JSON)");
    } catch (e) { toast.error("Błąd eksportu"); }
  };
  const importJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      let n = 0;
      for (const c of data.companies || []) { const { id, user_id, ...rest } = c; await api.post("/companies", rest); n++; }
      for (const c of data.clients || []) { const { id, user_id, ...rest } = c; await api.post("/clients", rest); n++; }
      for (const ex of data.expenses || []) { const { id, user_id, ...rest } = ex; await api.post("/expenses", rest); n++; }
      for (const tpl of data.templates || []) { const { id, user_id, ...rest } = tpl; await api.post("/templates", rest); n++; }
      await refreshAll();
      toast.success(`Zaimportowano ${n} rekordów (bez faktur)`);
    } catch (err) { toast.error("Nieprawidłowy plik JSON"); }
  };

  return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Ustawienia</h1>
        <Button onClick={save} loading={saving} data-testid="settings-save-button"><Save className="h-4 w-4" /> Zapisz</Button>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: "general", label: "Ogólne" }, { value: "numbering", label: "Numeracja" }, { value: "email", label: "Email" }, { value: "ksef", label: "KSeF" }, { value: "data", label: "Eksport/Import" }]} />

      {tab === "general" && (
        <Card className="max-w-2xl space-y-4 p-5">
          <div className="flex items-center justify-between"><div><div className="text-sm font-medium text-slate-700 dark:text-slate-200">Tryb ciemny</div><div className="text-xs text-slate-400">Przełącz między jasnym a ciemnym motywem</div></div><Switch checked={theme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} data-testid="settings-theme-switch" /></div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Język"><Select value={lang} onChange={setLanguage} options={[{ value: "pl", label: "Polski" }, { value: "en", label: "English" }]} /></Field>
            <Field label="Waluta bazowa"><Select value={form.base_currency || "PLN"} onChange={(v) => set({ base_currency: v })} options={["PLN", "EUR", "USD", "GBP"]} /></Field>
            <Field label="Rok podatkowy"><Input type="number" value={form.tax_year || 2024} onChange={(e) => set({ tax_year: parseInt(e.target.value) })} /></Field>
          </div>
        </Card>
      )}

      {tab === "numbering" && (
        <Card className="max-w-2xl space-y-4 p-5">
          <Field label="Schemat numeru faktury" hint={`Podgląd: ${schemePreview(form.invoice_scheme || "FV/{YYYY}/{MM}/{NNN}")}`}>
            <Input value={form.invoice_scheme || ""} onChange={(e) => set({ invoice_scheme: e.target.value })} data-testid="settings-scheme-input" />
          </Field>
          <Field label="Reset licznika"><Select value={form.counter_reset || "monthly"} onChange={(v) => set({ counter_reset: v })} options={[{ value: "monthly", label: "Miesięczny" }, { value: "yearly", label: "Roczny" }]} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Domyślny termin płatności"><Select value={form.default_payment_days || 14} onChange={(v) => set({ default_payment_days: v })} options={PAYMENT_TERMS.map((d) => ({ value: d, label: `${d} dni` }))} /></Field>
            <Field label="Domyślna metoda płatności"><Select value={form.default_payment_method || "Przelew"} onChange={(v) => set({ default_payment_method: v })} options={PAYMENT_METHODS} /></Field>
          </div>
        </Card>
      )}

      {tab === "email" && (
        <Card className="max-w-2xl space-y-3 p-5">
          <Field label="Szablon e-maila z fakturą" hint="Dostępne zmienne: {numer}, {kwota}, {termin}">
            <Textarea rows={8} value={form.email_template || ""} onChange={(e) => set({ email_template: e.target.value })} />
          </Field>
        </Card>
      )}

      {tab === "ksef" && (
        <Card className="max-w-2xl space-y-4 p-5">
          {form.ksef_token ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              Token KSeF jest ustawiony (Środowisko: {form.ksef_env === "prod" ? "Produkcja" : form.ksef_env === "demo" ? "Demo" : "Testowe"}).
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
              Tryb symulacji KSeF 2.0 — podaj realny token, aby podłączyć prawdziwe API.
            </div>
          )}
          <Field label="Token KSeF"><Input value={form.ksef_token || ""} onChange={(e) => set({ ksef_token: e.target.value })} placeholder="Wklej token KSeF..." data-testid="settings-ksef-token-input" /></Field>
          <Field label="Środowisko"><Select value={form.ksef_env || "test"} onChange={(v) => set({ ksef_env: v })} options={[{ value: "test", label: "Testowe" }, { value: "demo", label: "Demo" }, { value: "prod", label: "Produkcja" }]} /></Field>

          <Button
            variant="outline"
            onClick={runAuthTest}
            loading={ksefBusy}
            data-testid="settings-ksef-test-button"
          >
            <FlaskConical className="h-4 w-4" />
            {ksefBusy ? "Testowanie autoryzacji…" : "Testuj pełną autoryzację KSeF"}
          </Button>

          {ksefBusy && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Trwa testowanie połączenia z KSeF — może potrwać do 30 sekund…
            </div>
          )}

          <KsefStepResults result={authTestResult} busy={ksefBusy} />

          {/* Send test invoice */}
          <div className="border-t border-slate-200 dark:border-white/10 pt-4 space-y-3">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Wyślij testową fakturę</div>
              <div className="text-xs text-slate-400 mt-0.5">Wysyła minimalną fakturę (1 zł) do KSeF — sprawdza pełny flow wraz z wysyłką dokumentu.</div>
            </div>
            <Button
              onClick={runSendTest}
              loading={ksefSendBusy}
              disabled={!form.ksef_token}
            >
              <Send className="h-4 w-4" />
              {ksefSendBusy ? "Wysyłanie testowej faktury…" : "Wyślij testową fakturę do KSeF"}
            </Button>
            {ksefSendBusy && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Wysyłanie testowej faktury — może potrwać do 60 sekund…
              </div>
            )}
            <KsefStepResults result={sendTestResult} busy={ksefSendBusy} />
          </div>
        </Card>
      )}

      {tab === "data" && (
        <Card className="max-w-2xl space-y-4 p-5">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-white/10">
            <div><div className="text-sm font-medium text-slate-700 dark:text-slate-200">Eksport danych (JSON)</div><div className="text-xs text-slate-400">Pobierz wszystkie dane konta</div></div>
            <Button variant="outline" onClick={exportJson} data-testid="settings-export-button"><Download className="h-4 w-4" /> Eksportuj</Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-white/10">
            <div><div className="text-sm font-medium text-slate-700 dark:text-slate-200">Import z JSON</div><div className="text-xs text-slate-400">Przywróć firmy, klientów, wydatki i szablony</div></div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"><Upload className="h-4 w-4" /> Importuj<input type="file" accept="application/json" className="hidden" onChange={importJson} /></label>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-white/10">
            <div><div className="text-sm font-medium text-slate-700 dark:text-slate-200">Kopia zapasowa</div><div className="text-xs text-slate-400">Pobierz pełny backup danych</div></div>
            <Button variant="outline" onClick={exportJson}><DatabaseBackup className="h-4 w-4" /> Pobierz backup</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
