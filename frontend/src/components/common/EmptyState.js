import React from "react";
import { Button } from "@/components/ui-kit";
import { Inbox } from "lucide-react";

export const EmptyState = ({ icon: Icon = Inbox, title, description, actionLabel, onAction, testId }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
      <Icon className="h-7 w-7" />
    </div>
    <div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
    {actionLabel && onAction && (
      <Button onClick={onAction} data-testid={testId} className="mt-1">{actionLabel}</Button>
    )}
  </div>
);
