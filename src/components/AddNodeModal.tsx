import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (node: { name: string; url: string; api_key?: string }) => Promise<void>;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setBusy(true);
    await onAdd({ name: name.trim(), url: url.trim(), api_key: apiKey.trim() });
    setBusy(false);
    setName('');
    setUrl('');
    setApiKey('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-md rounded-xl border border-[var(--border)] p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text)' }}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="text-base font-bold text-[var(--text-strong)]">Add Pi-hole v6 Node</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-strong)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">
              Friendly Node Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pihole4-Guest"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-strong)]"
              style={{ backgroundColor: 'var(--input-bg)' }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">
              Base URL or IP Address
            </label>
            <input
              type="text"
              required
              placeholder="http://192.168.1.4:80"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--text-strong)]"
              style={{ backgroundColor: 'var(--input-bg)' }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">
              Pi-hole Web Password / App Password (Optional)
            </label>
            <input
              type="password"
              placeholder="Enter web admin password for API auth"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-strong)]"
              style={{ backgroundColor: 'var(--input-bg)' }}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-strong)] hover:bg-[var(--card-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-[var(--accent-green)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{busy ? 'Adding...' : 'Add Node'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
