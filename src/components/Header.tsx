import React from 'react';
import { Shield, ShieldAlert, Sun, Moon, RefreshCw, User, LogOut } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  blockingEnabled: boolean;
  onToggleBlocking: () => void;
  blockingBusy: boolean;
  onRefresh: () => void;
  username: string | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  blockingEnabled,
  onToggleBlocking,
  blockingBusy,
  onRefresh,
  username,
  onLogout,
}) => {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--border)] px-4 py-3 sm:px-6"
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/icon.png"
            alt="PiSyncHub Logo"
            className="h-8 w-8 rounded-md object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[var(--text-strong)]">PiSyncHub</span>
              <span className="rounded bg-[var(--card-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">
                v6 Cluster
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Multi-Node Pi-hole Orchestrator & Vault</div>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prominent Network-wide Blocking Toggle */}
          <button
            type="button"
            disabled={blockingBusy}
            onClick={onToggleBlocking}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-transform active:translate-y-px ${
              blockingEnabled
                ? 'bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)]'
                : 'bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)]'
            }`}
            title="Toggle network-wide DNS blocking across all nodes"
          >
            {blockingEnabled ? <ShieldAlert className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            <span>{blockingEnabled ? '🛡️ Disable Blocking' : '🛡️ Enable Blocking'}</span>
          </button>

          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-strong)] transition-colors hover:bg-[var(--card-hover)]"
            title="Toggle Dark and Light mode"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span className="hidden sm:inline">☀️ / 🌙 Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-500" />
                <span className="hidden sm:inline">☀️ / 🌙 Dark</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-strong)] transition-colors hover:bg-[var(--card-hover)]"
            title="Refresh metrics across all nodes"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh Metrics</span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 border-l border-[var(--border)] pl-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-strong)]">
              <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span>{username || 'admin'}</span>
            </div>
            {username && (
              <button
                type="button"
                onClick={onLogout}
                className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--accent-red)]"
                title="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
