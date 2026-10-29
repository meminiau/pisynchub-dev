import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Database,
  Sliders,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { PiholeNode, NodeDetailedConfig, DomainRule, AdlistRule, NodeUpstream, ToastNotification } from '../types';
import { api } from '../services/api';

interface NodeSettingsDrawerProps {
  node: PiholeNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (nodeName: string) => void;
  onTriggerToast: (toast: Omit<ToastNotification, 'id'>) => void;
  onCreateBackup: (nodeIndex: number) => void;
  nodeIndex: number;
}

export const NodeSettingsDrawer: React.FC<NodeSettingsDrawerProps> = ({
  node,
  isOpen,
  onClose,
  onSaved,
  onTriggerToast,
  onCreateBackup,
  nodeIndex,
}) => {
  const [activeTab, setActiveTab] = useState<'dns' | 'domains' | 'adlists' | 'config'>('dns');
  const [config, setConfig] = useState<NodeDetailedConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingGravity, setUpdatingGravity] = useState(false);

  // New Domain form state
  const [newDomain, setNewDomain] = useState({
    domain: '',
    type: 'allow' as 'allow' | 'deny',
    kind: 'exact' as 'exact' | 'regex' | 'wildcard',
    comment: '',
  });

  // New Adlist form state
  const [newAdlistUrl, setNewAdlistUrl] = useState('');
  const [newAdlistComment, setNewAdlistComment] = useState('');

  // New Custom Upstream form state
  const [newUpstream, setNewUpstream] = useState({
    name: '',
    ip: '',
    port: 53,
  });

  useEffect(() => {
    if (!isOpen || !node) return;
    let isMounted = true;
    setLoading(true);

    api.getNodeConfig(node.name)
      .then((data) => {
        if (isMounted) {
          setConfig(JSON.parse(JSON.stringify(data)));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoading(false);
          onTriggerToast({
            type: 'error',
            title: 'Failed to load node config',
            message: String(err),
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, node, onTriggerToast]);

  if (!isOpen || !node) return null;

  // Handlers for DNS & Upstreams
  const toggleUpstream = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      upstreams: config.upstreams.map((u) => (u.id === id ? { ...u, enabled: !u.enabled } : u)),
    });
  };

  const handleAddCustomUpstream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !newUpstream.name || !newUpstream.ip) return;
    const added: NodeUpstream = {
      id: `custom_${Date.now()}`,
      name: newUpstream.name.trim(),
      ip: newUpstream.ip.trim(),
      port: Number(newUpstream.port) || 53,
      enabled: true,
      isCustom: true,
    };
    setConfig({
      ...config,
      upstreams: [...config.upstreams, added],
    });
    setNewUpstream({ name: '', ip: '', port: 53 });
    onTriggerToast({
      type: 'info',
      title: 'Upstream Staged',
      message: `Added ${added.name} (${added.ip}#${added.port}). Click "Apply Changes" to save.`,
    });
  };

  const handleDeleteUpstream = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      upstreams: config.upstreams.filter((u) => u.id !== id),
    });
  };

  // Handlers for Domains
  const handleAddDomainRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !newDomain.domain.trim()) return;
    const rule: DomainRule = {
      id: `rule_${Date.now()}`,
      domain: newDomain.domain.trim(),
      type: newDomain.type,
      kind: newDomain.kind,
      comment: newDomain.comment.trim() || 'Added via PiSyncHub Inspector',
      enabled: true,
      date_added: new Date().toISOString().split('T')[0],
    };
    setConfig({
      ...config,
      domains: [rule, ...config.domains],
    });
    setNewDomain({ domain: '', type: 'allow', kind: 'exact', comment: '' });
    onTriggerToast({
      type: 'info',
      title: 'Domain Rule Added',
      message: `Staged ${rule.type.toUpperCase()}: ${rule.domain}`,
    });
  };

  const handleDeleteDomain = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      domains: config.domains.filter((d) => d.id !== id),
    });
  };

  const toggleDomain = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      domains: config.domains.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d)),
    });
  };

  // Handlers for Adlists
  const handleAddAdlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !newAdlistUrl.trim()) return;
    const list: AdlistRule = {
      id: `adlist_${Date.now()}`,
      url: newAdlistUrl.trim(),
      comment: newAdlistComment.trim() || 'Custom Blocklist',
      enabled: true,
      domain_count: 0,
      status: 'active',
    };
    setConfig({
      ...config,
      adlists: [...config.adlists, list],
    });
    setNewAdlistUrl('');
    setNewAdlistComment('');
    onTriggerToast({
      type: 'info',
      title: 'Blocklist Added',
      message: `Staged ${list.url}. Trigger "Update Gravity" to compile rules.`,
    });
  };

  const handleDeleteAdlist = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      adlists: config.adlists.filter((a) => a.id !== id),
    });
  };

  const toggleAdlist = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      adlists: config.adlists.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    });
  };

  // Trigger Gravity Update
  const handleUpdateGravity = async () => {
    if (!node) return;
    setUpdatingGravity(true);
    try {
      const res = await api.updateGravity(node.name);
      setUpdatingGravity(false);
      onTriggerToast({
        type: 'success',
        title: 'Gravity Updated',
        message: `${res.detail} (${res.domains.toLocaleString()} rules compiled)`,
      });
      onSaved(node.name);
    } catch (err) {
      setUpdatingGravity(false);
      onTriggerToast({
        type: 'error',
        title: 'Gravity Update Failed',
        message: String(err),
      });
    }
  };

  // Apply All Changes to Node
  const handleApplyChanges = async () => {
    if (!node || !config) return;
    setSaving(true);
    try {
      await api.updateNodeConfig(node.name, config);
      setSaving(false);
      onTriggerToast({
        type: 'success',
        title: 'Settings Applied',
        message: `Successfully synchronized configuration updates with ${node.name}.`,
      });
      onSaved(node.name);
      onClose();
    } catch (err) {
      setSaving(false);
      onTriggerToast({
        type: 'error',
        title: 'Failed to Apply Changes',
        message: String(err),
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-out Panel (Drawer) adhering seamlessly to BOTH Dark and Light Mode via CSS variables */}
      <div
        className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-[var(--border)] shadow-2xl transition-transform duration-300"
        style={{
          backgroundColor: 'var(--drawer-bg)',
          color: 'var(--text)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)]"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <Server className="h-5 w-5 text-[var(--accent-blue)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="drawer-title" className="text-base font-bold text-[var(--text-strong)]">
                  {node.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
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
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text-strong)]"
              title="Close Panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex border-b border-[var(--border)] px-6"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('dns')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'dns'
                ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]'
            }`}
          >
            <Globe className="h-4 w-4" />
            DNS & Upstreams
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('domains')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'domains'
                ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Domains & Whitelist
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adlists')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'adlists'
                ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]'
            }`}
          >
            <Database className="h-4 w-4" />
            Adlists
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'config'
                ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-strong)]'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Raw Config / Teleporter
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading || !config ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-[var(--text-muted)]">
              <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent-blue)]" />
              <span>Fetching Pi-hole v6 node configuration...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: DNS & Upstreams */}
              {activeTab === 'dns' && (
                <div className="flex flex-col gap-6">
                  {/* Upstream DNS Servers */}
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[var(--text-strong)]">Upstream DNS Servers</h3>
                    <p className="mb-3 text-xs text-[var(--text-muted)]">
                      Select which upstream resolvers this Pi-hole node forwards non-cached queries to.
                    </p>

                    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      {config.upstreams.map((upstream) => (
                        <div
                          key={upstream.id}
                          className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-[var(--card-hover)]"
                        >
                          <label className="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={upstream.enabled}
                              onChange={() => toggleUpstream(upstream.id)}
                              className="h-4 w-4 rounded accent-[var(--accent-blue)]"
                            />
                            <div>
                              <div className="text-xs font-semibold text-[var(--text-strong)]">{upstream.name}</div>
                              <div className="font-mono text-[11px] text-[var(--text-muted)]">
                                {upstream.ip}#{upstream.port}
                              </div>
                            </div>
                          </label>

                          {upstream.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUpstream(upstream.id)}
                              className="rounded p-1 text-[var(--accent-red)] transition-colors hover:bg-rose-500/15"
                              title="Delete custom upstream"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Custom Upstream Form */}
                    <form onSubmit={handleAddCustomUpstream} className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Resolver Label (e.g. AdGuard)"
                        value={newUpstream.name}
                        onChange={(e) => setNewUpstream({ ...newUpstream, name: e.target.value })}
                        className="flex-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-strong)]"
                        style={{ backgroundColor: 'var(--input-bg)' }}
                      />
                      <input
                        type="text"
                        placeholder="IP (e.g. 192.168.1.5)"
                        value={newUpstream.ip}
                        onChange={(e) => setNewUpstream({ ...newUpstream, ip: e.target.value })}
                        className="w-36 rounded-md border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--text-strong)]"
                        style={{ backgroundColor: 'var(--input-bg)' }}
                      />
                      <input
                        type="number"
                        placeholder="Port"
                        value={newUpstream.port}
                        onChange={(e) => setNewUpstream({ ...newUpstream, port: Number(e.target.value) })}
                        className="w-18 rounded-md border border-[var(--border)] px-2 py-1.5 font-mono text-xs text-[var(--text-strong)]"
                        style={{ backgroundColor: 'var(--input-bg)' }}
                      />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-md bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Upstream
                      </button>
                    </form>
                  </div>

                  {/* DNSSEC Toggle */}
                  <div
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)]">
                        <ShieldCheck className="h-4 w-4 text-[var(--accent-green)]" />
                        <span>Use DNSSEC Validation</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Validate DNSSEC signatures returned by upstream DNS servers to prevent cache poisoning.
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={config.dnssec_enabled}
                        onChange={(e) => setConfig({ ...config, dnssec_enabled: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--accent-green)] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  {/* Conditional Forwarding */}
                  <div className="rounded-lg border border-[var(--border)] p-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-[var(--text-strong)]">Conditional Forwarding</div>
                      <input
                        type="checkbox"
                        checked={config.conditional_forwarding}
                        onChange={(e) => setConfig({ ...config, conditional_forwarding: e.target.checked })}
                        className="h-4 w-4 rounded accent-[var(--accent-blue)]"
                      />
                    </div>
                    <p className="mb-3 text-xs text-[var(--text-muted)]">
                      Forward reverse DNS lookups for local subnets to your DHCP router to display client hostnames.
                    </p>
                    {config.conditional_forwarding && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]">Local Subnet CIDR</label>
                          <input
                            type="text"
                            value={config.rev_server_cidr || ''}
                            onChange={(e) => setConfig({ ...config, rev_server_cidr: e.target.value })}
                            className="w-full rounded border border-[var(--border)] px-2 py-1 font-mono text-xs text-[var(--text-strong)]"
                            style={{ backgroundColor: 'var(--input-bg)' }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]">Router IP</label>
                          <input
                            type="text"
                            value={config.rev_server_target || ''}
                            onChange={(e) => setConfig({ ...config, rev_server_target: e.target.value })}
                            className="w-full rounded border border-[var(--border)] px-2 py-1 font-mono text-xs text-[var(--text-strong)]"
                            style={{ backgroundColor: 'var(--input-bg)' }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]">Local Domain</label>
                          <input
                            type="text"
                            value={config.rev_server_domain || ''}
                            onChange={(e) => setConfig({ ...config, rev_server_domain: e.target.value })}
                            className="w-full rounded border border-[var(--border)] px-2 py-1 font-mono text-xs text-[var(--text-strong)]"
                            style={{ backgroundColor: 'var(--input-bg)' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Domains & Whitelist */}
              {activeTab === 'domains' && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-strong)]">Custom Domain Filtering Rules</h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Manage exact, wildcard, and regex allowlists and denylists for this node.
                      </p>
                    </div>
                    <span className="rounded bg-[var(--bg-elevated)] px-2 py-1 font-mono text-xs font-semibold text-[var(--text-strong)] border border-[var(--border)]">
                      {config.domains.length} Rules
                    </span>
                  </div>

                  {/* Add New Domain Form */}
                  <form
                    onSubmit={handleAddDomainRule}
                    className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="Domain or regex pattern (e.g. adservice.google.com)"
                          value={newDomain.domain}
                          onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                          className="w-full rounded border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--text-strong)]"
                          style={{ backgroundColor: 'var(--input-bg)' }}
                        />
                      </div>
                      <div>
                        <select
                          value={newDomain.type}
                          onChange={(e) => setNewDomain({ ...newDomain, type: e.target.value as 'allow' | 'deny' })}
                          className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text-strong)]"
                          style={{ backgroundColor: 'var(--input-bg)' }}
                        >
                          <option value="allow">Allow (Whitelist)</option>
                          <option value="deny">Deny (Blacklist)</option>
                        </select>
                      </div>
                      <div>
                        <select
                          value={newDomain.kind}
                          onChange={(e) =>
                            setNewDomain({ ...newDomain, kind: e.target.value as 'exact' | 'regex' | 'wildcard' })
                          }
                          className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text-strong)]"
                          style={{ backgroundColor: 'var(--input-bg)' }}
                        >
                          <option value="exact">Exact Match</option>
                          <option value="regex">Regex Pattern</option>
                          <option value="wildcard">Wildcard Domain</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Comment / rationale (optional)"
                        value={newDomain.comment}
                        onChange={(e) => setNewDomain({ ...newDomain, comment: e.target.value })}
                        className="flex-1 rounded border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-strong)]"
                        style={{ backgroundColor: 'var(--input-bg)' }}
                      />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded bg-[var(--accent-green)] px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Rule
                      </button>
                    </div>
                  </form>

                  {/* Rules Table */}
                  <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border)]" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                          <th className="px-3 py-2 font-semibold text-[var(--text-strong)]">Status</th>
                          <th className="px-3 py-2 font-semibold text-[var(--text-strong)]">Domain / Regex</th>
                          <th className="px-3 py-2 font-semibold text-[var(--text-strong)]">Type</th>
                          <th className="px-3 py-2 font-semibold text-[var(--text-strong)]">Kind</th>
                          <th className="px-3 py-2 font-semibold text-[var(--text-strong)]">Comment</th>
                          <th className="px-3 py-2 text-right font-semibold text-[var(--text-strong)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.domains.map((rule) => (
                          <tr
                            key={rule.id}
                            className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--card-hover)]"
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={rule.enabled}
                                onChange={() => toggleDomain(rule.id)}
                                className="h-3.5 w-3.5 rounded accent-[var(--accent-blue)]"
                              />
                            </td>
                            <td className="max-w-[180px] truncate px-3 py-2 font-mono font-medium text-[var(--text-strong)]">
                              {rule.domain}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-block rounded-xs px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  rule.type === 'allow'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {rule.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[var(--text-muted)]">{rule.kind}</td>
                            <td className="max-w-[140px] truncate px-3 py-2 text-[var(--text-muted)]" title={rule.comment}>
                              {rule.comment}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteDomain(rule.id)}
                                className="rounded p-1 text-[var(--accent-red)] transition-colors hover:bg-rose-500/15"
                                title="Delete rule"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: Adlists */}
              {activeTab === 'adlists' && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-strong)]">Active Gravity Adlists</h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Curated blocklist feeds fetched and parsed into Pi-hole v6 FTL Gravity database.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={updatingGravity}
                      onClick={handleUpdateGravity}
                      className="flex items-center gap-1.5 rounded-md bg-[var(--accent-green)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${updatingGravity ? 'animate-spin' : ''}`} />
                      <span>{updatingGravity ? 'Compiling Gravity...' : 'Update Gravity'}</span>
                    </button>
                  </div>

                  {/* Add Adlist Form */}
                  <form
                    onSubmit={handleAddAdlist}
                    className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <input
                      type="url"
                      required
                      placeholder="Blocklist raw URL (e.g. https://adaway.org/hosts.txt)"
                      value={newAdlistUrl}
                      onChange={(e) => setNewAdlistUrl(e.target.value)}
                      className="w-full rounded border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--text-strong)]"
                      style={{ backgroundColor: 'var(--input-bg)' }}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Description / Author comment"
                        value={newAdlistComment}
                        onChange={(e) => setNewAdlistComment(e.target.value)}
                        className="flex-1 rounded border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-strong)]"
                        style={{ backgroundColor: 'var(--input-bg)' }}
                      />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded bg-[var(--accent-blue)] px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Blocklist
                      </button>
                    </div>
                  </form>

                  {/* Adlists List */}
                  <div className="flex flex-col gap-2">
                    {config.adlists.map((adlist) => (
                      <div
                        key={adlist.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--card-hover)]"
                        style={{ backgroundColor: 'var(--bg-elevated)' }}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={adlist.enabled}
                            onChange={() => toggleAdlist(adlist.id)}
                            className="mt-1 h-4 w-4 rounded accent-[var(--accent-blue)]"
                          />
                          <div>
                            <div className="font-mono text-xs font-semibold text-[var(--text-strong)]">
                              {adlist.comment}
                            </div>
                            <div className="max-w-md truncate font-mono text-[11px] text-[var(--text-muted)]" title={adlist.url}>
                              {adlist.url}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                              <span>Domains: <strong className="text-[var(--text-strong)] font-mono">{adlist.domain_count?.toLocaleString() || 'N/A'}</strong></span>
                              <span>·</span>
                              <span className="text-emerald-400 font-medium">Status: Active</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteAdlist(adlist.id)}
                          className="rounded p-1.5 text-[var(--accent-red)] transition-colors hover:bg-rose-500/15"
                          title="Remove blocklist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Raw Config / Teleporter */}
              {activeTab === 'config' && (
                <div className="flex flex-col gap-6">
                  {/* Teleporter Backup Snapshot */}
                  <div
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div>
                      <div className="text-sm font-bold text-[var(--text-strong)]">Instant Teleporter Backup</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Generate and download a compressed .zip snapshot of this node's full configuration.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCreateBackup(nodeIndex)}
                      className="flex items-center gap-1.5 rounded-md bg-[var(--accent-amber)] px-3 py-2 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download .zip</span>
                    </button>
                  </div>

                  {/* Key Pi-hole v6 FTL Parameters */}
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[var(--text-strong)]">FTL Core Daemon Parameters</h3>
                    <p className="mb-3 text-xs text-[var(--text-muted)]">
                      Advanced parameters stored in Pi-hole v6 <code>/etc/pihole/pihole.toml</code>.
                    </p>

                    <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)] p-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">FTL DNS Port</label>
                        <input
                          type="number"
                          value={config.raw_config.ftl_port}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              raw_config: { ...config.raw_config, ftl_port: Number(e.target.value) },
                            })
                          }
                          className="w-full rounded border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--text-strong)]"
                          style={{ backgroundColor: 'var(--input-bg)' }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">Cache Size (Entries)</label>
                        <input
                          type="number"
                          value={config.raw_config.cache_size}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              raw_config: { ...config.raw_config, cache_size: Number(e.target.value) },
                            })
                          }
                          className="w-full rounded border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--text-strong)]"
                          style={{ backgroundColor: 'var(--input-bg)' }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">Blocking Mode</label>
                        <select
                          value={config.raw_config.blocking_mode}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              raw_config: {
                                ...config.raw_config,
                                blocking_mode: e.target.value as 'NULL' | 'IP' | 'NODATA' | 'NXDOMAIN',
                              },
                            })
                          }
                          className="w-full rounded border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-strong)]"
                          style={{ backgroundColor: 'var(--input-bg)' }}
                        >
                          <option value="NULL">NULL (0.0.0.0 / :: - Recommended)</option>
                          <option value="NXDOMAIN">NXDOMAIN (Domain does not exist)</option>
                          <option value="NODATA">NODATA (Empty response)</option>
                          <option value="IP">IP (Pi-hole host IP)</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">Max Log Age (Days)</label>
                        <input
                          type="number"
                          value={config.raw_config.max_log_age_days}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              raw_config: { ...config.raw_config, max_log_age_days: Number(e.target.value) },
                            })
                          }
                          className="w-full rounded border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--text-strong)]"
                          style={{ backgroundColor: 'var(--input-bg)' }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">Rate Limit Queries</label>
                        <input
                          type="number"
                          value={config.raw_config.rate_limit_count}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              raw_config: { ...config.raw_config, rate_limit_count: Number(e.target.value) },
                            })
                          }
                          className="w-full rounded border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--text-strong)]"
                          style={{ backgroundColor: 'var(--input-bg)' }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--text-strong)]">Rate Limit Interval (Sec)</label>
                        <input
                          type="number"
                          value={config.raw_config.rate_limit_interval}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              raw_config: { ...config.raw_config, rate_limit_interval: Number(e.target.value) },
                            })
                          }
                          className="w-full rounded border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--text-strong)]"
                          style={{ backgroundColor: 'var(--input-bg)' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Apply Changes & Discard */}
        <div
          className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-strong)] transition-colors hover:bg-[var(--card-hover)]"
          >
            Discard
          </button>

          <button
            type="button"
            disabled={saving || loading}
            onClick={handleApplyChanges}
            className="flex items-center gap-2 rounded-md bg-[var(--accent-green)] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Applying to Node...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Apply Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
