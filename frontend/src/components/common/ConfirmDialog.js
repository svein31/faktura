import React from "react";
import { Modal, ModalHeader, Button } from "@/components/ui-kit";
import { AlertTriangle } from "lucide-react";

export const ConfirmDialog = ({ open, onClose, onConfirm, title = "Potwierdź", message, confirmLabel = "Usuń", danger = true }) => (
  <Modal open={open} onClose={onClose} size="sm">
    <ModalHeader title={title} onClose={onClose} />
    <div className="flex items-start gap-3 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="pt-1.5 text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </div>
    <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-white/10">
      <Button variant="outline" onClick={onClose} data-testid="confirm-cancel-button">Anuluj</Button>
      <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} data-testid="confirm-ok-button">{confirmLabel}</Button>
    </div>
  </Modal>
);
