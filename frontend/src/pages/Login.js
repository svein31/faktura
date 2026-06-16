import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { FileText, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button, Input, Field } from "@/components/ui-kit";
import { apiErrorText } from "@/lib/api";



function Brand() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0f172a] p-10 text-white lg:flex">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold">F</div>
        <div><div className="font-semibold">Faktura KSeF</div><div className="text-[11px] uppercase tracking-wider text-indigo-300">e-Faktury 2.0</div></div>
      </div>
      <div className="space-y-5">
        <h2 className="text-3xl font-semibold leading-tight">Nowoczesne fakturowanie zgodne z KSeF</h2>
        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-400" /> Faktury sprzedaży, koszty, raporty VAT i JPK-V7</li>
          <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-400" /> Automatyczna numeracja, kwota słownie, MPP</li>
          <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-400" /> Wysyłka do KSeF, numer KSeF i UPO</li>
        </ul>
      </div>
      <div className="text-xs text-slate-400">Tryb symulacji KSeF — dane bezpiecznie zapisywane w Twoim koncie.</div>
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
    </div>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async () => {
    if (!email || !password) { toast.error("Podaj email i hasło"); return; }
    setLoading(true);
    try { await login(email, password); toast.success("Zalogowano"); navigate("/"); }
    catch (e) { toast.error(apiErrorText(e.response?.data?.detail) || "Błąd logowania"); }
    finally { setLoading(false); }
  };


  return (
    <div className="grid min-h-dvh grid-cols-1 bg-slate-50 dark:bg-[#0b1220] lg:grid-cols-2">
      <Brand />
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center lg:hidden"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">F</div></div>
          <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Zaloguj się</h1><p className="mt-1 text-sm text-slate-500">Witaj ponownie w Faktura KSeF</p></div>

          <div className="space-y-3">
            <Field label="Adres email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="jan@firma.pl" data-testid="login-email-input" /></Field>
            <Field label="Hasło"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" data-testid="login-password-input" /></Field>
          </div>
          <Button className="w-full" onClick={submit} loading={loading} data-testid="login-submit-button">Zaloguj się</Button>
          <p className="text-center text-sm text-slate-500">Nie masz konta? <Link to="/register" className="font-medium text-indigo-600 hover:underline">Załóż konto</Link></p>
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-400 dark:bg-white/5">Konto demo: admin@faktura.pl / Admin123!</p>
        </div>
      </div>
    </div>
  );
}
