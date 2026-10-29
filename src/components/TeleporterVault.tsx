import React, { useState } from 'react';
import { PiholeNode, BackupItem } from '../types';
import { Download, Upload, Archive, RefreshCw, FileArchive, Check } from 'lucide-react';

interface TeleporterVaultProps {
  nodes: PiholeNode[];
  backups: BackupItem[];
  onCreateBackup: (nodeIndex: number) => Promise<void>;
  onRestoreBackup: (nodeIndex: number, file: File) => Promise<void>;
}

export const TeleporterVault: React.FC<TeleporterVaultProps> = ({
  nodes,
  backups,
  onCreateBackup,
  onRestoreBackup,
}) => {
  const [selectedBackupNode, setSelectedBackupNode] = useState(0);
  const [selectedRestoreNode, setSelectedRestoreNode] = useState(0);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    await onCreateBackup(selectedBackupNode);
    setCreating(false);
  };

  const handleRestoreSubmit = async () => {
    if (!restoreFile) return;
    setConfirmRestoreOpen(false);
    setRestoring(true);
    await onRestoreBackup(selectedRestoreNode, restoreFile);
    setRestoring(false);
    setRestoreFile(null);
  };

  const downloadMockZip = (filename: string) => {
    // Generate a downloadable empty zip blob in browser
    const blob = new Blob(['PK\x05\x06' + '\x00'.repeat(18)], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-lg border border-[var(--border)] p-4 shadow-sm"
      style={{ backgroundColor: 'var(--card-bg)' }}
    >
      <div className="mb-4 border-b border-[var(--border-subtle)] pb-3">
        <h2 className="text-base font-bold text-[var(--text-strong)]">
          Teleporter Archive Vault (Backups & Restores)
        </h2>
        <div className="text-xs text-[var(--text-muted)]">
          Generate live Pi-hole v6 Teleporter .zip archives to persistent storage or restore configuration snapshots
        </div>
      </div>

      {/* Backup Trigger */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">
            Select Node to Backup
          </label>
          <select
            value={selectedBackupNode}
            onChange={(e) => setSelectedBackupNode(Number(e.target.value))}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-strong)]"
            style={{ backgroundColor: 'var(--input-bg)' }}
          >
            {nodes.map((n, i) => (
              <option key={n.name} value={i}>
                {n.name} ({n.url})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={creating}
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 rounded-md bg-[var(--accent-green)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {creating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Creating Backup...</span>
            </>
          ) : (
            <>
              <Archive className="h-4 w-4" />
              <span>Create Teleporter Backup</span>
            </>
          )}
        </button>
      </div>

      {/* Stored Archives Table */}
      <div className="mb-6">
        <h3 className="mb-2 text-xs font-bold text-[var(--text-strong)]">Stored Local Teleporter Backups</h3>
        <div className="overflow-x-auto rounded-md border border-[var(--border)]">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <th className="px-3 py-2 font-semibold text-[var(--text-strong)]">Archive Filename</th>
                <th className="px-3 py-2 font-semibold text-[var(--text-strong)]">Size</th>
                <th className="px-3 py-2 font-semibold text-[var(--text-strong)]">Timestamp</th>
                <th className="px-3 py-2 text-right font-semibold text-[var(--text-strong)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr
                  key={b.filename}
                  className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--card-hover)]"
                >
                  <td className="px-3 py-2 font-mono font-medium text-[var(--text-strong)] flex items-center gap-2">
                    <FileArchive className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                    <span>{b.filename}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[var(--text-muted)]">{b.size_kb} KB</td>
                  <td className="px-3 py-2 font-mono text-[var(--text-muted)]">{b.created}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => downloadMockZip(b.filename)}
                      className="inline-flex items-center gap-1 rounded bg-[var(--bg-elevated)] border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--accent-blue)] hover:bg-[var(--card-hover)]"
                    >
                      <Download className="h-3 w-3" />
                      Download .zip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore Section */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <h3 className="mb-2 text-xs font-bold text-[var(--text-strong)]">Restore Teleporter Backup to Node</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">Target Node</label>
            <select
              value={selectedRestoreNode}
              onChange={(e) => setSelectedRestoreNode(Number(e.target.value))}
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-strong)]"
              style={{ backgroundColor: 'var(--input-bg)' }}
            >
              {nodes.map((n, i) => (
                <option key={n.name} value={i}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">Select .zip Archive</label>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              className="w-full rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-strong)] file:mr-2 file:rounded file:border-0 file:bg-[var(--bg-elevated)] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-[var(--text-strong)]"
              style={{ backgroundColor: 'var(--input-bg)' }}
            />
          </div>

          <button
            type="button"
            disabled={!restoreFile || restoring}
            onClick={() => setConfirmRestoreOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-[var(--accent-red)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {restoring ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Restoring...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>♻️ Restore to Node</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* In-app Restore Confirmation Modal */}
      {confirmRestoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-md rounded-xl border border-[var(--border)] p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text)' }}
          >
            <h2 className="mb-2 text-base font-bold text-[var(--text-strong)]">Confirm Teleporter Restore</h2>
            <p className="mb-4 text-xs text-[var(--text-muted)]">
              Are you sure you want to restore <strong>{restoreFile?.name}</strong> to{' '}
              <strong>{nodes[selectedRestoreNode]?.name}</strong>? This will overwrite the node's active configuration.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreOpen(false)}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-strong)] hover:bg-[var(--card-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreSubmit}
                className="rounded-md bg-[var(--accent-red)] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90"
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
