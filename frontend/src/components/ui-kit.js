import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X, Loader2 } from "lucide-react";

export const cn = (...c) => c.filter(Boolean).join(" ");

/* ---------------- Button ---------------- */
export const Button = React.forwardRef(({ variant = "primary", size = "md", className, children, loading, disabled, ...props }, ref) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    outline: "border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-9 px-4 text-sm", lg: "h-10 px-5 text-sm", icon: "h-9 w-9", "icon-sm": "h-8 w-8" };
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]",
        variants[variant], sizes[size], className
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
Button.displayName = "Button";

/* ---------------- Input / Textarea ---------------- */
export const Input = React.forwardRef(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-500",
      error ? "border-rose-400 ring-1 ring-rose-400/40" : "border-slate-200 dark:border-white/15",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/15 dark:bg-slate-950/40 dark:text-slate-100",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/* ---------------- Field wrapper ---------------- */
export const Field = ({ label, children, hint, required, className }) => (
  <div className={cn("space-y-1", className)}>
    {label && (
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

/* ---------------- Select (custom popover) ---------------- */
export const Select = ({ value, onChange, options = [], placeholder = "Wybierz...", className, "data-testid": tid }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    const handleScroll = (e) => {
      // only close if scroll happened outside the dropdown itself
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  }, [open]);

  const norm = options.map((o) => (typeof o === "object" ? o : { value: o, label: o }));
  const selected = norm.find((o) => o.value === value);

  return (
    <div ref={triggerRef} className={className}>
      <button
        type="button" data-testid={tid} onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/15 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-white/5"
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-slate-900"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {norm.map((o) => (
            <button
              key={String(o.value)} type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check className="h-4 w-4 text-indigo-600" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

/* ---------------- Card ---------------- */
export const Card = ({ className, children, ...props }) => (
  <div className={cn("rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] dark:border-white/10 dark:bg-slate-900/40", className)} {...props}>
    {children}
  </div>
);

/* ---------------- Badge ---------------- */
export const Badge = ({ className, children }) => (
  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}>{children}</span>
);

/* ---------------- Checkbox ---------------- */
export const Checkbox = ({ checked, onChange, label, "data-testid": tid, className }) => (
  <label className={cn("flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200", className)}>
    <button
      type="button" role="checkbox" aria-checked={!!checked} data-testid={tid}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
        checked ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white dark:border-white/20 dark:bg-slate-950/40"
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
    {label && <span>{label}</span>}
  </label>
);

/* ---------------- Toggle switch ---------------- */
export const Switch = ({ checked, onChange, "data-testid": tid }) => (
  <button
    type="button" role="switch" aria-checked={!!checked} data-testid={tid}
    onClick={() => onChange(!checked)}
    className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-white/20")}
  >
    <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
  </button>
);

/* ---------------- Modal ---------------- */
export const Modal = ({ open, onClose, children, size = "md", className }) => {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose && onClose(); };
    if (open) {
      document.addEventListener("keydown", h);
      document.body.style.overflow = "hidden";
    }
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl", full: "max-w-[1400px]" };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm animate-in fade-in-0 duration-150 sm:p-4" onMouseDown={onClose}>
      <div
        className={cn("relative my-2 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in-0 slide-in-from-bottom-1 duration-200 dark:border-white/10 dark:bg-slate-900 sm:my-6", sizes[size], className)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export const ModalHeader = ({ title, subtitle, onClose, children }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
    <div className="min-w-0">
      <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
      {subtitle && <p className="truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-2">
      {children}
      {onClose && (
        <button onClick={onClose} aria-label="Zamknij" data-testid="modal-close-button" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  </div>
);

/* ---------------- Tabs ---------------- */
export const Tabs = ({ tabs, value, onChange, className }) => (
  <div className={cn("inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-950/40", className)}>
    {tabs.map((t) => (
      <button
        key={t.value} onClick={() => onChange(t.value)} data-testid={`tab-${t.value}`}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          value === t.value ? "bg-white text-indigo-700 shadow-sm dark:bg-white/10 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        )}
      >
        {t.label}
      </button>
    ))}
  </div>
);

/* ---------------- Spinner ---------------- */
export const Spinner = ({ className }) => <Loader2 className={cn("h-5 w-5 animate-spin text-indigo-600", className)} />;
