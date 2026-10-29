import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  isSetup: boolean;
  onSuccess: (username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, isSetup, onSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSetup && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!password) {
      setError('Password cannot be empty');
      return;
    }

    setBusy(true);
    try {
      if (isSetup) {
        await api.setupInitialAuth({ username, password });
        onSuccess(username);
      } else {
        const res = await api.login({ username, password });
        onSuccess(res.username || username);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-xl border border-[var(--border)] p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-[var(--accent-blue)]/10 p-2.5 text-[var(--accent-blue)]">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-strong)]">
              {isSetup ? 'Initial Admin Setup' : 'PiSyncHub Login'}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {isSetup
                ? 'Create your master administrator credentials to secure the cluster'
                : 'Enter credentials to manage Pi-hole v6 nodes and sync rules'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Admin Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[#111322] py-2 pl-9 pr-3 text-sm text-[var(--text)] focus:border-[var(--accent-blue)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              {isSetup ? 'Create Master Password' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-md border border-[var(--border)] bg-[#111322] py-2 pl-9 pr-3 text-sm text-[var(--text)] focus:border-[var(--accent-blue)] focus:outline-none"
              />
            </div>
          </div>

          {isSetup && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-md border border-[var(--border)] bg-[#111322] py-2 pl-9 pr-3 text-sm text-[var(--text)] focus:border-[var(--accent-blue)] focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-md bg-[var(--accent-blue,#2563eb)] py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Saving...' : isSetup ? 'Complete Setup & Unlock Hub' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
};
