import React from 'react';
import { ToastNotification } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-[var(--border)] p-3.5 shadow-xl transition-all duration-300"
          style={{
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-strong)',
          }}
        >
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />}

          <div className="flex-1 text-xs">
            <div className="font-bold text-[var(--text-strong)]">{toast.title}</div>
            {toast.message && <div className="mt-0.5 text-[var(--text-muted)]">{toast.message}</div>}
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-strong)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
