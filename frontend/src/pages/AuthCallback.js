import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { setToken, getAppBaseUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui-kit";

export default function AuthCallback() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const m = window.location.hash.match(/session_id=([^&]+)/);
    if (!m) { navigate("/login"); return; }
    const sid = decodeURIComponent(m[1]);
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", {}, { headers: { "X-Session-ID": sid } });
        if (data.session_token) setToken(data.session_token);
        setUser(data.user);
        window.history.replaceState(null, "", getAppBaseUrl());
        toast.success("Zalogowano przez Google");
        navigate("/");
      } catch (e) {
        toast.error("Logowanie Google nie powiodło się");
        navigate("/login");
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#0b1220]">
      <Spinner className="h-7 w-7" />
      <p className="text-sm text-slate-500">Logowanie przez Google...</p>
    </div>
  );
}
