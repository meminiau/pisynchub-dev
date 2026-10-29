import React from 'react';
import { PiholeNode } from '../types';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface PreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceNode: PiholeNode | null;
  targetNodes: PiholeNode[];
  syncScopes: {
    adlists: boolean;
    domains: boolean;
    groups: boolean;
    localDns: boolean;
  };
  autoBackup: boolean;
  setAutoBackup: (val: boolean) => void;
}

export const PreflightModal: React.FC<PreflightModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sourceNode,
  targetNodes,
  syncScopes,
  autoBackup,
  setAutoBackup,
}) => {
  if (!isOpen || !sourceNode) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[var(--border)] p-6 shadow-2xl transition-all"
        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-amber)]/15 text-[var(--accent-amber)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-strong)]">
              Teleport Sync Pre-Flight Confirmation
            </h2>
            <div className="text-xs text-[var(--text-muted)]">
              Verify configuration synchronization targets and parameters
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-[var(--border)] p-4 text-xs" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div className="mb-2">
            <span className="text-[var(--text-muted)]">Primary Master Source: </span>
            <strong className="text-[var(--text-strong)] font-mono">{sourceNode.name} ({sourceNode.url})</strong>
          </div>

          <div className="mb-2">
            <span className="text-[var(--text-muted)]">Target Replica Node(s): </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {targetNodes.map((n) => (
                <span
                  key={n.name}
                  className="rounded bg-[var(--card-bg)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--text-strong)] border border-[var(--border)]"
                >
                  {n.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[var(--text-muted)]">Configuration Scopes: </span>
            <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-medium text-[var(--accent-blue)]">
              {syncScopes.adlists && <span className="rounded bg-sky-500/10 px-1.5 py-0.5">Adlists</span>}
              {syncScopes.domains && <span className="rounded bg-sky-500/10 px-1.5 py-0.5">Domains (Allow/Deny)</span>}
              {syncScopes.groups && <span className="rounded bg-sky-500/10 px-1.5 py-0.5">Client Groups</span>}
              {syncScopes.localDns && <span className="rounded bg-sky-500/10 px-1.5 py-0.5">Local DNS & CNAMEs</span>}
            </div>
          </div>
        </div>

        {/* Warning Callout */}
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-[var(--text-strong)]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            Executing sync will overwrite corresponding configuration tables on the target replica nodes to match the master.
          </span>
        </div>

        {/* Auto Backup Checkbox */}
        <label className="mb-5 flex cursor-pointer items-center gap-2 text-xs text-[var(--text-strong)]">
          <input
            type="checkbox"
            checked={autoBackup}
            onChange={(e) => setAutoBackup(e.target.checked)}
            className="h-4 w-4 rounded accent-[var(--accent-blue)]"
          />
          <span>Automatically create snapshot Teleporter archives of target nodes prior to sync</span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-strong)] transition-colors hover:bg-[var(--card-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-md bg-[var(--accent-amber)] px-4 py-2 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90"
          >
            <span>🚀 Confirm & Execute Sync</span>
          </button>
        </div>
      </div>
    </div>
  );
};
