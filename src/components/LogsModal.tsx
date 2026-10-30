import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Terminal } from 'lucide-react';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  // Auto-scroll to the bottom when new logs arrive
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-[var(--border)] shadow-2xl"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[var(--accent-blue)]" />
            <h2 className="text-sm font-bold text-[var(--text-strong)]">Live Container Logs</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text-strong)] cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--accent-red)] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-4 font-mono text-xs text-emerald-400">
          {logs.length === 0 ? (
            <div className="text-[var(--text-muted)]">No logs available. Wait for container activity...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1 whitespace-pre-wrap break-words">
                {log}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};
