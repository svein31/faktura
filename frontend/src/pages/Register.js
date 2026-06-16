import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button, Input, Field } from "@/components/ui-kit";
import { apiErrorText } from "@/lib/api";



export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async () => {
    if (!name || !email || password.length < 6) { toast.error("Wypełnij dane (hasło min. 6 znaków)"); return; }
    setLoading(true);
    try { await register(email, password, name); toast.success("Konto utworzone — witaj!"); navigate("/"); }
    catch (e) { toast.error(apiErrorText(e.response?.data?.detail) || "Błąd rejestracji"); }
    finally { setLoading(false); }
  };


  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 dark:bg-[#0b1220]">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">F</div><h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Załóż konto</h1><p className="mt-1 text-sm text-slate-500">Rozpocznij fakturowanie w KSeF</p></div>

        <div className="space-y-3">
          <Field label="Imię i nazwisko"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" data-testid="register-name-input" /></Field>
          <Field label="Adres email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@firma.pl" data-testid="register-email-input" /></Field>
          <Field label="Hasło"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="min. 6 znaków" data-testid="register-password-input" /></Field>
        </div>
        <Button className="w-full" onClick={submit} loading={loading} data-testid="register-submit-button">Załóż konto</Button>
        <p className="text-center text-sm text-slate-500">Masz już konto? <Link to="/login" className="font-medium text-indigo-600 hover:underline">Zaloguj się</Link></p>
      </div>
    </div>
  );
}
