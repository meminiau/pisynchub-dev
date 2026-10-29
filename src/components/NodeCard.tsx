import React from 'react';
import { Settings, ExternalLink, Download, Trash2, Cpu, Activity, ShieldCheck, Database } from 'lucide-react';
import { PiholeNode } from '../types';

interface NodeCardProps {
  node: PiholeNode;
  index: number;
  onManageNode: (node: PiholeNode, index: number) => void;
  onBackupNode: (index: number) => void;
  onDeleteNode: (index: number, name: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  index,
  onManageNode,
  onBackupNode,
  onDeleteNode,
}) => {
  const adminUrl = `${node.url.replace(/\/$/, '')}/admin`;

  return (
    <div
      className="flex flex-col justify-between rounded-lg border border-[var(--border)] p-4 shadow-sm transition-all duration-200"
      style={{ backgroundColor: 'var(--card-bg)' }}
    >
      <div>
        {/* Card Header */}
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[var(--text-strong)]">{node.name}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  node.online
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${node.online ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {node.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="font-mono text-xs text-[var(--text-muted)]">{node.url}</div>
          </div>

          {/* Open Admin WebUI Button */}
          <a
            href={adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-strong)] transition-colors hover:bg-[var(--card-hover)]"
            title={`Open ${node.name} Web Admin Interface`}
          >
            <span>Open Admin WebUI</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Telemetry Row 1 */}
        <div className="mb-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Queries Today</div>
            <div className="font-mono text-sm font-bold text-[var(--text-strong)]">
              {(node.queries || 0).toLocaleString()}
            </div>
          </div>

          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Blocked</div>
            <div className="font-mono text-sm font-bold text-[var(--accent-red)]">
              {(node.blocked || 0).toLocaleString()} <span className="text-[10px] text-[var(--text-muted)] font-normal">({node.percent_blocked || 0}%)</span>
            </div>
          </div>

          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Gravity Rules</div>
            <div className="font-mono text-sm font-bold text-[var(--accent-green)]">
              {(node.gravity_size || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Telemetry Row 2: QPM, CPU, Status */}
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="flex items-center justify-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5">
            <Activity className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
            <span className="font-mono text-xs font-semibold text-[var(--text-strong)]">{node.qpm || 42.0} QPM</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5">
            <Cpu className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
            <span className="font-mono text-xs font-semibold text-[var(--text-strong)]">{node.cpu_load || 8.5}% CPU</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-green)]" />
            <span className="text-xs font-semibold text-[var(--text-strong)]">v6 Core</span>
          </div>
        </div>
      </div>

      {/* Card Actions Footer with primary Manage Node button */}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
        {/* Primary In-App Manage Node Button */}
        <button
          type="button"
          onClick={() => onManageNode(node, index)}
          className="flex items-center gap-1.5 rounded-md bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>⚙️ Manage Node</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onBackupNode(index)}
            className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-strong)] transition-colors hover:bg-[var(--card-hover)]"
            title="Create instant Teleporter .zip backup for this node"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteNode(index, node.name)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-rose-500/15 hover:text-[var(--accent-red)]"
            title="Remove node from cluster"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
