import React, { useState } from 'react';
import { PiholeNode } from '../types';
import { PreflightModal } from './PreflightModal';
import { Send, CheckCircle2 } from 'lucide-react';

interface TeleportSyncProps {
  nodes: PiholeNode[];
  onExecuteSync: (params: {
    sourceIndex: number;
    targetIndices: number[];
    scopes: {
      adlists: boolean;
      domains: boolean;
      groups: boolean;
      localDns: boolean;
    };
    autoBackup: boolean;
  }) => Promise<void>;
  syncBusy: boolean;
  syncLogs: string[];
}

export const TeleportSync: React.FC<TeleportSyncProps> = ({
  nodes,
  onExecuteSync,
  syncBusy,
  syncLogs,
}) => {
  const [sourceIdx, setSourceIdx] = useState(0);
  const [targetIndices, setTargetIndices] = useState<number[]>(
    nodes.length > 1 ? nodes.map((_, i) => i).filter((i) => i !== 0) : []
  );
  const [scopes, setScopes] = useState({
    adlists: true,
    domains: true,
    groups: true,
    localDns: true,
  });
  const [autoBackup, setAutoBackup] = useState(true);
  const [showPreflight, setShowPreflight] = useState(false);

  const toggleTarget = (idx: number) => {
    if (targetIndices.includes(idx)) {
      setTargetIndices(targetIndices.filter((i) => i !== idx));
    } else {
      setTargetIndices([...targetIndices, idx]);
    }
  };

  const handleSourceChange = (newSrc: number) => {
    setSourceIdx(newSrc);
    // remove newSrc from targets if present
    setTargetIndices((prev) => prev.filter((i) => i !== newSrc));
  };

  const sourceNode = nodes[sourceIdx] || null;
  const targetNodes = targetIndices.map((i) => nodes[i]).filter(Boolean);

  const handlePreflightConfirm = async () => {
    setShowPreflight(false);
    await onExecuteSync({
      sourceIndex: sourceIdx,
      targetIndices,
      scopes,
      autoBackup,
    });
  };

  return (
    <div
      className="rounded-lg border border-[var(--border)] p-4 shadow-sm"
      style={{ backgroundColor: 'var(--card-bg)' }}
    >
      <div className="mb-4 border-b border-[var(--border-subtle)] pb-3">
        <h2 className="text-base font-bold text-[var(--text-strong)]">
          Selective Teleporter & Rules Sync Engine
        </h2>
        <div className="text-xs text-[var(--text-muted)]">
          Synchronize adlists, custom domain filtering, groups, and local DNS without manual export friction
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Source Node */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--text-strong)]">
            Source Node (Primary Master)
          </label>
          <select
            value={sourceIdx}
            onChange={(e) => handleSourceChange(Number(e.target.value))}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-strong)]"
            style={{ backgroundColor: 'var(--input-bg)' }}
          >
            {nodes.map((n, i) => (
              <option key={n.name} value={i}>
                {n.name} ({n.url})
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Configurations will be extracted live from this master node.
          </p>
        </div>

        {/* Target Nodes Checkbox Grid */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--text-strong)]">
            Target Replica Nodes
          </label>
          <div
            className="flex flex-wrap gap-2 rounded-md border border-[var(--border)] p-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            {nodes.map((n, i) => {
              if (i === sourceIdx) return null;
              const isChecked = targetIndices.includes(i);
              return (
                <label
                  key={n.name}
                  className={`flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium border transition-colors ${
                    isChecked
                      ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--text-strong)]'
                      : 'border-[var(--border)] text-[var(--text-muted)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleTarget(i)}
                    className="h-3.5 w-3.5 rounded accent-[var(--accent-blue)]"
                  />
                  <span>{n.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scope Toggles */}
      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-strong)]">
          Configuration Scopes to Synchronize
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-strong)]">
            <input
              type="checkbox"
              checked={scopes.adlists}
              onChange={(e) => setScopes({ ...scopes, adlists: e.target.checked })}
              className="h-3.5 w-3.5 rounded accent-[var(--accent-blue)]"
            />
            <span>Adlists / Blocklists</span>
          </label>

          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-strong)]">
            <input
              type="checkbox"
              checked={scopes.domains}
              onChange={(e) => setScopes({ ...scopes, domains: e.target.checked })}
              className="h-3.5 w-3.5 rounded accent-[var(--accent-blue)]"
            />
            <span>Domains (Allow / Deny / Regex)</span>
          </label>

          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-strong)]">
            <input
              type="checkbox"
              checked={scopes.groups}
              onChange={(e) => setScopes({ ...scopes, groups: e.target.checked })}
              className="h-3.5 w-3.5 rounded accent-[var(--accent-blue)]"
            />
            <span>Client Groups</span>
          </label>

          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-strong)]">
            <input
              type="checkbox"
              checked={scopes.localDns}
              onChange={(e) => setScopes({ ...scopes, localDns: e.target.checked })}
              className="h-3.5 w-3.5 rounded accent-[var(--accent-blue)]"
            />
            <span>Local DNS & CNAMEs</span>
          </label>
        </div>
      </div>

      {/* Sync Execution Button */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          disabled={syncBusy || targetIndices.length === 0}
          onClick={() => setShowPreflight(true)}
          className="flex items-center gap-2 rounded-md bg-[var(--accent-amber)] px-4 py-2 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          <span>{syncBusy ? 'Syncing...' : '🚀 Execute Node Sync'}</span>
        </button>

        {targetIndices.length === 0 && (
          <span className="text-xs text-[var(--accent-red)]">Select at least one target replica node.</span>
        )}
      </div>

      {/* Sync Activity Log */}
      {syncLogs.length > 0 && (
        <div className="mt-4 rounded-md border border-[var(--border)] p-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div className="mb-1 text-xs font-bold text-[var(--text-strong)]">Recent Sync Activity</div>
          <div className="max-h-28 overflow-y-auto font-mono text-[11px] text-[var(--text-muted)] space-y-1">
            {syncLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-Flight Modal */}
      <PreflightModal
        isOpen={showPreflight}
        onClose={() => setShowPreflight(false)}
        onConfirm={handlePreflightConfirm}
        sourceNode={sourceNode}
        targetNodes={targetNodes}
        syncScopes={scopes}
        autoBackup={autoBackup}
        setAutoBackup={setAutoBackup}
      />
    </div>
  );
};
