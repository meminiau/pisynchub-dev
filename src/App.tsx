import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from './services/api';
import { PiholeNode, BackupItem, ToastNotification, DashboardStats } from './types';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { ActivityCharts } from './components/ActivityCharts';
import { DonutCharts } from './components/DonutCharts';
import { TopListsTables } from './components/TopListsTables';
import { NodeCard } from './components/NodeCard';
import { TeleportSync } from './components/TeleportSync';
import { TeleporterVault } from './components/TeleporterVault';
import { NodeSettingsDrawer } from './components/NodeSettingsDrawer';
import { AddNodeModal } from './components/AddNodeModal';
import { ToastContainer } from './components/Toast';
import { ShieldAlert, Plus, Server, Layers } from 'lucide-react';

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('pisynchub_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('pisynchub_theme', theme);
    } catch {}
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth state
  const [username, setUsername] = useState<string | null>('admin');

  // Blocking state
  const [blockingEnabled, setBlockingEnabled] = useState(true);
  const [blockingBusy, setBlockingBusy] = useState(false);

  // Nodes & Stats state
  const [nodes, setNodes] = useState<PiholeNode[]>([]);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string>('ALL');

  // Drawer & Modals state
  const [drawerNode, setDrawerNode] = useState<PiholeNode | null>(null);
  const [drawerNodeIndex, setDrawerNodeIndex] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);

  // Sync state
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((t: Omit<ToastNotification, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Data loader
  const refreshData = useCallback(async () => {
    try {
      const stats = await api.getDashboardStats();
      if (stats.blocking) {
        setBlockingEnabled(stats.blocking.enabled);
      }
      if (stats.nodes) {
        setNodes(stats.nodes);
      }

      const bData = await api.getBackups();
      if (bData.backups) {
        setBackups(bData.backups);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error refreshing cluster stats',
        message: String(err),
      });
    }
  }, [addToast]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Network-wide Blocking Toggle Handler
  const handleToggleBlocking = async () => {
    const nextState = !blockingEnabled;
    setBlockingBusy(true);
    try {
      await api.setBlockingStatus(nextState);
      setBlockingEnabled(nextState);
      setBlockingBusy(false);
      addToast({
        type: nextState ? 'success' : 'info',
        title: nextState ? '🛡️ Blocking Enabled' : '⚠️ Blocking Paused',
        message: nextState
          ? 'DNS gravity sinkhole filtering is active across all cluster nodes.'
          : 'All nodes are temporarily permitting non-filtered queries.',
      });
      refreshData();
    } catch (err) {
      setBlockingBusy(false);
      addToast({
        type: 'error',
        title: 'Failed to update blocking state',
        message: String(err),
      });
    }
  };

  // Filtered nodes
  const activeScopedNodes = useMemo(() => {
    if (selectedNodeFilter === 'ALL') return nodes;
    return nodes.filter((n) => n.name === selectedNodeFilter);
  }, [nodes, selectedNodeFilter]);

  // Aggregated KPI Totals
  const kpiTotals = useMemo(() => {
    let totalQueries = 0;
    let blockedQueries = 0;
    let cachedQueries = 0;
    let maxGravity = 0;
    let totalQpm = 0;

    activeScopedNodes.forEach((n) => {
      totalQueries += Number(n.queries || 0);
      blockedQueries += Number(n.blocked || 0);
      cachedQueries += Number(n.cached || 0);
      maxGravity = Math.max(maxGravity, Number(n.gravity_size || 0));
      totalQpm += Number(n.qpm || 0);
    });

    const pct = totalQueries > 0 ? (blockedQueries / totalQueries) * 100 : 0;

    return {
      totalQueries,
      blockedQueries,
      cachedQueries,
      percentBlocked: pct,
      gravityDomains: maxGravity,
      totalQpm,
    };
  }, [activeScopedNodes]);

  // Aggregated Query Types and Upstreams
  const { aggQueryTypes, aggUpstreams } = useMemo(() => {
    const qt: Record<string, number> = {};
    const up: Record<string, number> = {};

    activeScopedNodes.forEach((n) => {
      if (n.querytypes) {
        Object.entries(n.querytypes).forEach(([k, v]) => {
          qt[k] = (qt[k] || 0) + v;
        });
      }
      if (n.upstreams) {
        Object.entries(n.upstreams).forEach(([k, v]) => {
          up[k] = (up[k] || 0) + v;
        });
      }
    });

    return { aggQueryTypes: qt, aggUpstreams: up };
  }, [activeScopedNodes]);

  // Node Actions
  const handleManageNode = (node: PiholeNode, index: number) => {
    setDrawerNode(node);
    setDrawerNodeIndex(index);
    setIsDrawerOpen(true);
  };

  const handleCreateNodeBackup = async (index: number) => {
    const targetNode = nodes[index];
    try {
      const res = await api.createBackup(index);
      addToast({
        type: 'success',
        title: 'Teleporter Backup Created',
        message: `Saved ${res.filename} from ${targetNode ? targetNode.name : 'node'}.`,
      });
      refreshData();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Backup Failed',
        message: String(err),
      });
    }
  };

  const handleDeleteNode = async (index: number, name: string) => {
    try {
      await api.deleteNode(index);
      addToast({
        type: 'info',
        title: 'Node Removed',
        message: `Removed "${name}" from the cluster configuration.`,
      });
      refreshData();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to delete node',
        message: String(err),
      });
    }
  };

  const handleAddNode = async (nodeData: { name: string; url: string; api_key?: string }) => {
    try {
      await api.addNode(nodeData);
      addToast({
        type: 'success',
        title: 'Node Added to Cluster',
        message: `Successfully connected ${nodeData.name} (${nodeData.url}).`,
      });
      refreshData();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to add node',
        message: String(err),
      });
    }
  };

  const handleRestoreBackup = async (nodeIndex: number, file: File) => {
    const targetNode = nodes[nodeIndex];
    try {
      const res = await api.restoreBackup(nodeIndex, file.name);
      addToast({
        type: 'success',
        title: 'Teleporter Restore Complete',
        message: res.detail,
      });
      refreshData();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Restore Failed',
        message: String(err),
      });
    }
  };

  // Sync execution
  const handleExecuteSync = async (params: {
    sourceIndex: number;
    targetIndices: number[];
    scopes: {
      adlists: boolean;
      domains: boolean;
      groups: boolean;
      localDns: boolean;
    };
    autoBackup: boolean;
  }) => {
    setSyncBusy(true);
    const src = nodes[params.sourceIndex];
    const timestamp = new Date().toLocaleTimeString();

    if (params.autoBackup) {
      for (const tIdx of params.targetIndices) {
        await api.createBackup(tIdx);
      }
    }

    try {
      const res = await api.executeSync({
        source_index: params.sourceIndex,
        target_indices: params.targetIndices,
        sync_adlists: params.scopes.adlists,
        sync_domains: params.scopes.domains,
        sync_groups: params.scopes.groups,
        sync_local_dns: params.scopes.localDns,
      });

      setSyncBusy(false);
      setSyncLogs((prev) => [
        `[${timestamp}] Sync completed successfully from ${src?.name || 'Master'}:`,
        ...res.log,
        ...prev,
      ]);

      addToast({
        type: 'success',
        title: 'Teleporter Sync Executed',
        message: `Successfully replicated configurations to ${params.targetIndices.length} replica node(s).`,
      });
      refreshData();
    } catch (err) {
      setSyncBusy(false);
      addToast({
        type: 'error',
        title: 'Sync Execution Failed',
        message: String(err),
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-150">
      {/* Sticky Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        blockingEnabled={blockingEnabled}
        onToggleBlocking={handleToggleBlocking}
        blockingBusy={blockingBusy}
        onRefresh={refreshData}
        username={username}
        onLogout={() => {
          api.logout();
          setUsername(null);
          addToast({ type: 'info', title: 'Logged Out', message: 'Admin session closed.' });
        }}
      />

      {/* Main Content Body */}
      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
        {/* Paused Warning Banner */}
        {!blockingEnabled && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--accent-red)]/40 bg-[var(--accent-red-soft)] px-4 py-3 text-xs text-[var(--text-strong)] shadow-xs">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-4 w-4 text-[var(--accent-red)]" />
              <span>
                <strong>⚠️ Network-Wide DNS Blocking is Currently Paused:</strong> All active Pi-hole v6 nodes are resolving queries without gravity filtering.
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleBlocking}
              className="rounded bg-[var(--accent-green)] px-3 py-1 font-bold text-white hover:opacity-90"
            >
              Resume Blocking
            </button>
          </div>
        )}

        {/* Overview Header & Scope Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-strong)]">
              Network-Wide DNS Overview
            </h1>
            <div className="text-xs text-[var(--text-muted)]">
              Aggregated real-time telemetry across {nodes.length} Pi-hole v6 nodes · Filtering{' '}
              <strong className={blockingEnabled ? 'text-emerald-400' : 'text-rose-400'}>
                {blockingEnabled ? 'ACTIVE' : 'DISABLED'}
              </strong>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[var(--text-muted)]">Scope:</span>
            <button
              type="button"
              onClick={() => setSelectedNodeFilter('ALL')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedNodeFilter === 'ALL'
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-strong)] hover:bg-[var(--card-hover)]'
              }`}
            >
              All Nodes ({nodes.length})
            </button>
            {nodes.map((n) => (
              <button
                key={n.name}
                type="button"
                onClick={() => setSelectedNodeFilter(n.name)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedNodeFilter === n.name
                    ? 'bg-[var(--accent-blue)] text-white'
                    : 'border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-strong)] hover:bg-[var(--card-hover)]'
                }`}
              >
                {n.name}
              </button>
            ))}
          </div>
        </div>

        {/* 1. 4 Main Summary KPI Cards (Responsive 2x2 on mobile, 4 columns on desktop) */}
        <KPICards
          totalQueries={kpiTotals.totalQueries}
          blockedQueries={kpiTotals.blockedQueries}
          cachedQueries={kpiTotals.cachedQueries}
          percentBlocked={kpiTotals.percentBlocked}
          gravityDomains={kpiTotals.gravityDomains}
          totalQpm={kpiTotals.totalQpm}
          activeNodesCount={activeScopedNodes.length}
        />

        {/* 2. Dual 24-Hour Stacked Bar Charts */}
        <ActivityCharts theme={theme} />

        {/* 3. Donut Breakdowns (Query Types & Upstream Servers) */}
        <DonutCharts theme={theme} queryTypes={aggQueryTypes} upstreams={aggUpstreams} />

        {/* 4. 4 Aggregated Top Lists Data Tables */}
        <TopListsTables
          totalQueries={kpiTotals.totalQueries}
          blockedQueries={kpiTotals.blockedQueries}
        />

        {/* 5. Scalable Multi-Node Cards */}
        <div
          className="rounded-lg border border-[var(--border)] p-4 shadow-sm"
          style={{ backgroundColor: 'var(--card-bg)' }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-[var(--accent-blue)]" />
                <h2 className="text-base font-bold text-[var(--text-strong)]">
                  Pi-hole v6 Cluster Nodes ({nodes.length})
                </h2>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Manage individual node configurations, live telemetry, and open local Admin WebUI
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddNodeOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-[var(--accent-green)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Node</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {nodes.map((node, idx) => (
              <NodeCard
                key={`${node.name}-${idx}`}
                node={node}
                index={idx}
                onManageNode={handleManageNode}
                onBackupNode={handleCreateNodeBackup}
                onDeleteNode={handleDeleteNode}
              />
            ))}
          </div>
        </div>

        {/* 6. Selective Teleporter & Rules Sync Engine + Teleporter Vault */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <TeleportSync
            nodes={nodes}
            onExecuteSync={handleExecuteSync}
            syncBusy={syncBusy}
            syncLogs={syncLogs}
          />

          <TeleporterVault
            nodes={nodes}
            backups={backups}
            onCreateBackup={handleCreateNodeBackup}
            onRestoreBackup={handleRestoreBackup}
          />
        </div>
      </main>

      {/* In-App Node Config & Settings Inspector Drawer */}
      <NodeSettingsDrawer
        node={drawerNode}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerNode(null);
        }}
        onSaved={refreshData}
        onTriggerToast={addToast}
        onCreateBackup={handleCreateNodeBackup}
        nodeIndex={drawerNodeIndex}
      />

      {/* Add Node Modal */}
      <AddNodeModal
        isOpen={isAddNodeOpen}
        onClose={() => setIsAddNodeOpen(false)}
        onAdd={handleAddNode}
      />

      {/* Dynamic Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
