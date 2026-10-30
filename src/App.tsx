import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from './services/api';
import { PiholeNode, BackupItem, ToastNotification } from './types';
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
import { AuthModal } from './components/AuthModal';
import { LogsModal } from './components/LogsModal';
import { ToastContainer } from './components/Toast';
import { ShieldAlert, Plus, Server } from 'lucide-react';

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

  const handleToggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Auth & Setup state
  const [username, setUsername] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isSetupMode, setIsSetupMode] = useState<boolean>(false);

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
  const [showLogsModal, setShowLogsModal] = useState(false); // NEW Logs Modal State

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

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Data loader
  const refreshData = useCallback(async () => {
    try {
      const stats = await api.getDashboardStats();
      if (stats.blocking) setBlockingEnabled(stats.blocking.enabled);
      if (Array.isArray(stats.nodes)) setNodes(stats.nodes);
      const bData = await api.getBackups();
      if (bData && Array.isArray(bData.backups)) setBackups(bData.backups);
    } catch (err) {
      addToast({ type: 'error', title: 'Error refreshing cluster stats', message: String(err) });
    }
  }, [addToast]);

  // Initial Auth & Setup Check
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();

        if (data.setup_required) {
          setIsSetupMode(true);
          setShowAuthModal(true);
          setUsername(null);
        } else if (!data.logged_in) {
          setIsSetupMode(false);
          setShowAuthModal(true);
          setUsername(null);
        } else {
          setShowAuthModal(false);
          setUsername(data.username || 'admin');
          refreshData();
        }
      } catch {
        setShowAuthModal(false);
      }
    };
    checkAuthStatus();
  }, [refreshData]);

  useEffect(() => {
    if (username && !showAuthModal) {
      const interval = setInterval(refreshData, 30000);
      return () => clearInterval(interval);
    }
  }, [refreshData, username, showAuthModal]);

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
        message: nextState ? 'DNS filtering active across cluster.' : 'Filtering paused.',
      });
      refreshData();
    } catch (err) {
      setBlockingBusy(false);
      addToast({ type: 'error', title: 'Update failed', message: String(err) });
    }
  };

  const activeScopedNodes = useMemo(() => {
    if (selectedNodeFilter === 'ALL') return nodes;
    return nodes.filter((n) => n.name === selectedNodeFilter);
  }, [nodes, selectedNodeFilter]);

  const kpiTotals = useMemo(() => {
    let totalQueries = 0, blockedQueries = 0, cachedQueries = 0, maxGravity = 0, totalQpm = 0;
    activeScopedNodes.forEach((n) => {
      totalQueries += Number(n.queries || 0);
      blockedQueries += Number(n.blocked || 0);
      cachedQueries += Number(n.cached || 0);
      maxGravity = Math.max(maxGravity, Number(n.gravity_size || 0));
      totalQpm += Number(n.qpm || 0);
    });
    return {
      totalQueries, blockedQueries, cachedQueries,
      percentBlocked: totalQueries > 0 ? (blockedQueries / totalQueries) * 100 : 0,
      gravityDomains: maxGravity, totalQpm,
    };
  }, [activeScopedNodes]);

  const { aggQueryTypes, aggUpstreams } = useMemo(() => {
    const qt: Record<string, number> = {};
    const up: Record<string, number> = {};
    activeScopedNodes.forEach((n) => {
      if (n.querytypes) Object.entries(n.querytypes).forEach(([k, v]) => { qt[k] = (qt[k] || 0) + v; });
      if (n.upstreams) Object.entries(n.upstreams).forEach(([k, v]) => { up[k] = (up[k] || 0) + v; });
    });
    return { aggQueryTypes: qt, aggUpstreams: up };
  }, [activeScopedNodes]);

  // Aggregate Real Top Items
  const aggTopItems = useMemo(() => {
    const perm: Record<string, number> = {};
    const blck: Record<string, number> = {};
    const cliTot: Record<string, number> = {};
    const cliBlk: Record<string, number> = {};

    activeScopedNodes.forEach(node => {
      const n = node as any;
      const addItems = (source: any[], target: Record<string, number>, keyName: string) => {
        if (Array.isArray(source)) {
          source.forEach(item => {
            if (item && typeof item === 'object') {
              const name = item[keyName] || item.name || item.ip || 'Unknown';
              const count = item.count || item.queries || 0;
              target[name] = (target[name] || 0) + count;
            }
          });
        }
      };
      
      if (n.top_items) {
        addItems(n.top_items.top_permitted, perm, 'domain');
        addItems(n.top_items.top_blocked, blck, 'domain');
        addItems(n.top_items.top_clients, cliTot, 'client');
        addItems(n.top_items.top_clients_blocked, cliBlk, 'client');
      }
    });

    const toArray = (dict: Record<string, number>, keyName: string) => 
      Object.entries(dict).map(([k, v]) => ({ [keyName]: k, count: v })).sort((a: any, b: any) => b.count - a.count).slice(0, 10);

    return {
      permittedDomains: toArray(perm, 'domain') as {domain: string, count: number}[],
      blockedDomains: toArray(blck, 'domain') as {domain: string, count: number}[],
      topClientsTotal: toArray(cliTot, 'client') as {client: string, count: number}[],
      topClientsBlocked: toArray(cliBlk, 'client') as {client: string, count: number}[],
    };
  }, [activeScopedNodes]);

  const handleManageNode = (node: PiholeNode, index: number) => { setDrawerNode(node); setDrawerNodeIndex(index); setIsDrawerOpen(true); };
  const handleDeleteNode = async (index: number) => { await api.deleteNode(index); refreshData(); };
  const handleCreateNodeBackup = async (index: number) => { await api.createBackup(index); refreshData(); };
  const handleRestoreBackup = async (index: number, file: File) => { await api.restoreBackup(index, file.name); refreshData(); };
  
  const handleAddNode = async (nodeData: { name: string; url: string; api_key?: string }) => {
    await api.addNode(nodeData); setIsAddNodeOpen(false); refreshData();
  };

  const handleExecuteSync = async (params: any) => {
    setSyncBusy(true);
    try {
      const res = await api.executeSync({
        source_index: params.sourceIndex, target_indices: params.targetIndices,
        sync_adlists: params.scopes.adlists, sync_domains: params.scopes.domains,
        sync_groups: params.scopes.groups, sync_local_dns: params.scopes.localDns,
      });
      setSyncLogs((prev) => [`[${new Date().toLocaleTimeString()}] Sync completed:`, ...res.log, ...prev]);
      refreshData();
    } finally {
      setSyncBusy(false);
    }
  };
    return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-150">
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
          setShowAuthModal(true);
          setIsSetupMode(false);
          addToast({ type: 'info', title: 'Logged Out', message: 'Admin session closed.' });
        }}
        onShowLogs={() => setShowLogsModal(true)}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
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
              className="rounded bg-[var(--accent-green)] px-3 py-1 font-bold text-white hover:opacity-90 cursor-pointer"
            >
              Resume Blocking
            </button>
          </div>
        )}

        {/* Overview Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-strong)]">
              Network-Wide DNS Overview
            </h1>
            <div className="text-xs text-[var(--text-muted)]">
              Aggregated real-time telemetry across {nodes.length} Pi-hole v6 nodes
            </div>
          </div>

          {nodes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--text-muted)]">Scope:</span>
              <button
                type="button"
                onClick={() => setSelectedNodeFilter('ALL')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
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
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    selectedNodeFilter === n.name
                      ? 'bg-[var(--accent-blue)] text-white'
                      : 'border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-strong)] hover:bg-[var(--card-hover)]'
                  }`}
                >
                  {n.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <KPICards
          totalQueries={kpiTotals.totalQueries}
          blockedQueries={kpiTotals.blockedQueries}
          cachedQueries={kpiTotals.cachedQueries}
          percentBlocked={kpiTotals.percentBlocked}
          gravityDomains={kpiTotals.gravityDomains}
          totalQpm={kpiTotals.totalQpm}
          activeNodesCount={activeScopedNodes.length}
        />

        {nodes.length > 0 && (
          <>
            <ActivityCharts
              theme={theme}
              labels={stats?.history?.labels}
              permitted={stats?.history?.permitted}
              cached={stats?.history?.cached}
              blocked={stats?.history?.blocked}
              clientSeries={stats?.history?.client_series}
            />
            
            <DonutCharts theme={theme} queryTypes={aggQueryTypes} upstreams={aggUpstreams} />
            <TopListsTables
              totalQueries={kpiTotals.totalQueries}
              blockedQueries={kpiTotals.blockedQueries}
              permittedDomains={aggTopItems.permittedDomains}
              blockedDomains={aggTopItems.blockedDomains}
              topClientsTotal={aggTopItems.topClientsTotal}
              topClientsBlocked={aggTopItems.topClientsBlocked}
            />
          </>
        )}

        {/* Cluster Nodes Section */}
        <div className="rounded-lg border border-[var(--border)] p-4 shadow-sm bg-[var(--card-bg)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-[var(--accent-blue)]" />
                <h2 className="text-base font-bold text-[var(--text-strong)]">
                  Pi-hole v6 Cluster Nodes ({nodes.length})
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddNodeOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-[var(--accent-green)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Node
            </button>
          </div>

          {nodes.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-muted)]">No nodes connected yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {nodes.map((node, idx) => (
                <NodeCard key={`${node.name}-${idx}`} node={node} index={idx} onManageNode={handleManageNode} onBackupNode={handleCreateNodeBackup} onDeleteNode={handleDeleteNode} />
              ))}
            </div>
          )}
        </div>

        {nodes.length > 0 && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <TeleportSync nodes={nodes} onExecuteSync={handleExecuteSync} syncBusy={syncBusy} syncLogs={syncLogs} />
            <TeleporterVault nodes={nodes} backups={backups} onCreateBackup={handleCreateNodeBackup} onRestoreBackup={handleRestoreBackup} />
          </div>
        )}
      </main>

      <NodeSettingsDrawer node={drawerNode} isOpen={isDrawerOpen} onClose={() => { setIsDrawerOpen(false); setDrawerNode(null); }} onSaved={refreshData} onTriggerToast={addToast} onCreateBackup={handleCreateNodeBackup} nodeIndex={drawerNodeIndex} />
      <AddNodeModal isOpen={isAddNodeOpen} onClose={() => setIsAddNodeOpen(false)} onAdd={handleAddNode} />
      
      <AuthModal isOpen={showAuthModal} isSetup={isSetupMode} onSuccess={(user) => { setUsername(user); setShowAuthModal(false); setIsSetupMode(false); refreshData(); }} />
      
      {/* New Logs Modal */}
      <LogsModal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
