import {
  PiholeNode,
  DashboardStats,
  BackupItem,
  SyncRequestModel,
  NodeDetailedConfig,
  DomainRule,
  AdlistRule
} from '../types';

const STORAGE_KEYS = {
  NODES: 'pisynchub_nodes_v2',
  BLOCKING: 'pisynchub_blocking_v2',
  BACKUPS: 'pisynchub_backups_v2',
  NODE_CONFIGS: 'pisynchub_node_configs_v2',
  AUTH: 'pisynchub_auth_v2',
};

// Initial Seed Nodes
const INITIAL_NODES: PiholeNode[] = [
  {
    name: 'Pihole1 (Primary)',
    url: 'http://192.168.1.2:80',
    online: true,
    blocking_enabled: true,
    queries: 84290,
    blocked: 21450,
    cached: 19380,
    percent_blocked: 25.4,
    gravity_size: 418920,
    qpm: 58.5,
    cpu_load: 11.4,
    querytypes: {
      'A (IPv4)': 46200,
      'AAAA (IPv6)': 21400,
      'HTTPS': 9850,
      'PTR': 3420,
      'SVCB': 1680,
      'SRV': 940,
      'TXT': 520,
      'SOA': 280,
    },
    upstreams: {
      'localhost#5335 (Unbound)': 43460,
      'cache': 19380,
      'blocklist': 21450,
    },
    status: 'online',
  },
  {
    name: 'Pihole2 (Secondary)',
    url: 'http://192.168.1.3:80',
    online: true,
    blocking_enabled: true,
    queries: 49810,
    blocked: 13120,
    cached: 11490,
    percent_blocked: 26.3,
    gravity_size: 418920,
    qpm: 34.6,
    cpu_load: 8.2,
    querytypes: {
      'A (IPv4)': 27300,
      'AAAA (IPv6)': 12890,
      'HTTPS': 5610,
      'PTR': 2150,
      'SVCB': 980,
      'SRV': 510,
      'TXT': 240,
      'SOA': 130,
    },
    upstreams: {
      'localhost#5335 (Unbound)': 22100,
      '1.1.1.1#53 (Cloudflare)': 3100,
      'cache': 11490,
      'blocklist': 13120,
    },
    status: 'online',
  },
  {
    name: 'Pihole3 (IoT VLAN)',
    url: 'http://192.168.10.2:80',
    online: true,
    blocking_enabled: true,
    queries: 28640,
    blocked: 9890,
    cached: 5820,
    percent_blocked: 34.5,
    gravity_size: 418920,
    qpm: 19.9,
    cpu_load: 6.7,
    querytypes: {
      'A (IPv4)': 17850,
      'AAAA (IPv6)': 5420,
      'HTTPS': 2910,
      'PTR': 1490,
      'SVCB': 490,
      'SRV': 280,
      'TXT': 120,
      'SOA': 80,
    },
    upstreams: {
      '9.9.9.9#53 (Quad9)': 12930,
      'cache': 5820,
      'blocklist': 9890,
    },
    status: 'online',
  },
];

// Initial Seed Backups
const INITIAL_BACKUPS: BackupItem[] = [
  {
    filename: 'teleporter_Pihole1_20261028_180000.zip',
    size_kb: 482.4,
    created: '2026-10-28 18:00:00',
  },
  {
    filename: 'teleporter_Pihole2_20261028_180500.zip',
    size_kb: 481.9,
    created: '2026-10-28 18:05:00',
  },
  {
    filename: 'teleporter_Pihole3_20261027_040000.zip',
    size_kb: 216.1,
    created: '2026-10-27 04:00:00',
  },
];

// Initial Node Detailed Config Template
function createDefaultConfig(nodeName: string): NodeDetailedConfig {
  return {
    upstreams: [
      { id: '1', name: 'Cloudflare (DoH/DNS)', ip: '1.1.1.1', port: 53, enabled: true },
      { id: '2', name: 'Cloudflare Secondary', ip: '1.0.0.1', port: 53, enabled: true },
      { id: '3', name: 'Quad9 (Filtered + DNSSEC)', ip: '9.9.9.9', port: 53, enabled: false },
      { id: '4', name: 'Local Recursive Unbound', ip: '127.0.0.1', port: 5335, enabled: true, isCustom: true },
    ],
    dnssec_enabled: true,
    conditional_forwarding: true,
    rev_server_cidr: '192.168.1.0/24',
    rev_server_target: '192.168.1.1',
    rev_server_domain: 'lan',
    domains: [
      { id: 'd1', domain: 'gateway.icloud.com', type: 'allow', kind: 'exact', comment: 'Apple Private Relay bypass', enabled: true, date_added: '2026-10-20' },
      { id: 'd2', domain: 'unraid.local', type: 'allow', kind: 'exact', comment: 'Local NAS WebUI', enabled: true, date_added: '2026-10-21' },
      { id: 'd3', domain: '(\\.|^)doubleclick\\.net$', type: 'deny', kind: 'regex', comment: 'Ad network wildcard blocker', enabled: true, date_added: '2026-10-15' },
      { id: 'd4', domain: 'telemetry.microsoft.com', type: 'deny', kind: 'exact', comment: 'Windows OS diagnostic telemetry', enabled: true, date_added: '2026-10-16' },
      { id: 'd5', domain: '(\\.|^)tiktokv\\.com$', type: 'deny', kind: 'regex', comment: 'IoT network restrict', enabled: true, date_added: '2026-10-25' },
    ],
    adlists: [
      { id: 'a1', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts', comment: 'StevenBlack Unified Adware/Malware', enabled: true, domain_count: 184520, status: 'active' },
      { id: 'a2', url: 'https://adaway.org/hosts.txt', comment: 'AdAway mobile tracker list', enabled: true, domain_count: 8940, status: 'active' },
      { id: 'a3', url: 'https://v.firebog.net/hosts/Easyprivacy.txt', comment: 'Firebog EasyPrivacy trackers', enabled: true, domain_count: 32410, status: 'active' },
      { id: 'a4', url: 'https://raw.githubusercontent.com/PolishFiltersTeam/KADhosts/master/KADhosts.txt', comment: 'KADhosts malicious hosts list', enabled: true, domain_count: 192800, status: 'active' },
    ],
    raw_config: {
      ftl_port: 4711,
      max_log_age_days: 7,
      cache_size: 10000,
      blocking_mode: 'NULL',
      rate_limit_count: 1000,
      rate_limit_interval: 60,
      local_ttl: 2,
      edns0_enabled: true,
    },
  };
}

// Helpers
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const api = {
  // Auth
  async getAuthStatus() {
    const auth = getStored(STORAGE_KEYS.AUTH, { setup_required: false, logged_in: true, username: 'admin' });
    return auth;
  },

  async login(creds: { username: string }) {
    const auth = { setup_required: false, logged_in: true, username: creds.username || 'admin' };
    setStored(STORAGE_KEYS.AUTH, auth);
    return { status: 'success', username: auth.username };
  },

  async logout() {
    const auth = { setup_required: false, logged_in: false, username: null };
    setStored(STORAGE_KEYS.AUTH, auth);
    return { status: 'success' };
  },

  // Nodes
  async getNodes(): Promise<{ status: string; nodes: PiholeNode[] }> {
    const nodes = getStored<PiholeNode[]>(STORAGE_KEYS.NODES, INITIAL_NODES);
    return { status: 'success', nodes };
  },

  async addNode(node: { name: string; url: string; api_key?: string }): Promise<{ status: string; nodes: PiholeNode[] }> {
    const nodes = getStored<PiholeNode[]>(STORAGE_KEYS.NODES, INITIAL_NODES);
    const newNode: PiholeNode = {
      name: node.name,
      url: node.url.replace(/\/$/, ''),
      api_key: node.api_key || '',
      online: true,
      blocking_enabled: true,
      queries: 15420,
      blocked: 3890,
      cached: 2410,
      percent_blocked: 25.2,
      gravity_size: 418920,
      qpm: 12.5,
      cpu_load: 6.4,
      status: 'online',
      querytypes: {
        'A (IPv4)': 9200,
        'AAAA (IPv6)': 3800,
        'HTTPS': 1600,
        'PTR': 820,
      },
      upstreams: {
        'localhost#5335 (Unbound)': 11530,
        'cache': 2410,
        'blocklist': 3890,
      },
    };
    nodes.push(newNode);
    setStored(STORAGE_KEYS.NODES, nodes);

    // Seed its config as well
    const configs = getStored<Record<string, NodeDetailedConfig>>(STORAGE_KEYS.NODE_CONFIGS, {});
    configs[newNode.name] = createDefaultConfig(newNode.name);
    setStored(STORAGE_KEYS.NODE_CONFIGS, configs);

    return { status: 'success', nodes };
  },

  async deleteNode(index: number): Promise<{ status: string; nodes: PiholeNode[] }> {
    const nodes = getStored<PiholeNode[]>(STORAGE_KEYS.NODES, INITIAL_NODES);
    if (index >= 0 && index < nodes.length) {
      nodes.splice(index, 1);
      setStored(STORAGE_KEYS.NODES, nodes);
    }
    return { status: 'success', nodes };
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const nodes = getStored<PiholeNode[]>(STORAGE_KEYS.NODES, INITIAL_NODES);
    const blocking = getStored(STORAGE_KEYS.BLOCKING, { enabled: true, timer: null, updated_at: null });
    return {
      blocking,
      nodes: nodes.map(n => ({
        ...n,
        blocking_enabled: blocking.enabled,
      })),
    };
  },

  // Blocking Toggle
  async getBlockingStatus() {
    return getStored(STORAGE_KEYS.BLOCKING, { enabled: true, timer: null, updated_at: null });
  },

  async setBlockingStatus(enabled: boolean, timer?: number) {
    const state = {
      enabled,
      timer: timer || null,
      updated_at: new Date().toISOString(),
    };
    setStored(STORAGE_KEYS.BLOCKING, state);
    return { status: 'success', ...state };
  },

  // Node Detailed Config Inspector (Tabs 1-4)
  async getNodeConfig(nodeName: string): Promise<NodeDetailedConfig> {
    const configs = getStored<Record<string, NodeDetailedConfig>>(STORAGE_KEYS.NODE_CONFIGS, {});
    if (!configs[nodeName]) {
      configs[nodeName] = createDefaultConfig(nodeName);
      setStored(STORAGE_KEYS.NODE_CONFIGS, configs);
    }
    return configs[nodeName];
  },

  async updateNodeConfig(nodeName: string, updated: NodeDetailedConfig): Promise<{ status: string; config: NodeDetailedConfig }> {
    const configs = getStored<Record<string, NodeDetailedConfig>>(STORAGE_KEYS.NODE_CONFIGS, {});
    configs[nodeName] = updated;
    setStored(STORAGE_KEYS.NODE_CONFIGS, configs);
    return { status: 'success', config: updated };
  },

  async updateGravity(nodeName: string): Promise<{ status: string; detail: string; domains: number }> {
    // Simulate Pi-hole v6 FTL gravity update
    await new Promise((r) => setTimeout(r, 900));
    const configs = getStored<Record<string, NodeDetailedConfig>>(STORAGE_KEYS.NODE_CONFIGS, {});
    const cfg = configs[nodeName] || createDefaultConfig(nodeName);
    const count = cfg.adlists.filter(a => a.enabled).reduce((acc, a) => acc + (a.domain_count || 10000), 0);
    
    // Also update node gravity size
    const nodes = getStored<PiholeNode[]>(STORAGE_KEYS.NODES, INITIAL_NODES);
    const target = nodes.find(n => n.name === nodeName);
    if (target) {
      target.gravity_size = count;
      setStored(STORAGE_KEYS.NODES, nodes);
    }
    return {
      status: 'success',
      detail: `Pi-hole v6 FTL Gravity database regenerated successfully for ${nodeName}`,
      domains: count,
    };
  },

  // Backups
  async getBackups(): Promise<{ status: string; backups: BackupItem[] }> {
    const backups = getStored<BackupItem[]>(STORAGE_KEYS.BACKUPS, INITIAL_BACKUPS);
    return { status: 'success', backups };
  },

  async createBackup(nodeIndex: number): Promise<{ status: string; filename: string; size: number }> {
    const nodes = getStored<PiholeNode[]>(STORAGE_KEYS.NODES, INITIAL_NODES);
    const node = nodes[nodeIndex] || { name: 'Pihole1' };
    const cleanName = node.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date();
    const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `teleporter_${cleanName}_${ts}.zip`;

    const backups = getStored<BackupItem[]>(STORAGE_KEYS.BACKUPS, INITIAL_BACKUPS);
    backups.unshift({
      filename,
      size_kb: Math.round(350 + Math.random() * 200),
      created: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
    });
    setStored(STORAGE_KEYS.BACKUPS, backups);

    return { status: 'success', filename, size: 480000 };
  },

  async restoreBackup(nodeIndex: number, filename: string): Promise<{ status: string; detail: string }> {
    const nodes = getStored<PiholeNode[]>(STORAGE_KEYS.NODES, INITIAL_NODES);
    const node = nodes[nodeIndex] || { name: 'Target Node' };
    await new Promise(r => setTimeout(r, 600));
    return {
      status: 'success',
      detail: `Successfully restored ${filename} into ${node.name}. Gravity and local DNS tables reloaded.`,
    };
  },

  // Sync
  async executeSync(req: SyncRequestModel): Promise<{ status: string; log: string[] }> {
    const nodes = getStored<PiholeNode[]>(STORAGE_KEYS.NODES, INITIAL_NODES);
    const source = nodes[req.source_index] || { name: 'Master' };
    const logs: string[] = [];

    await new Promise(r => setTimeout(r, 800));

    for (const tIdx of req.target_indices) {
      if (tIdx === req.source_index || tIdx >= nodes.length) continue;
      const target = nodes[tIdx];
      if (req.sync_adlists) {
        logs.push(`Synced 4 Adlists from ${source.name} to ${target.name}`);
      }
      if (req.sync_domains) {
        logs.push(`Synced 142 Allow/Deny Domain rules to ${target.name}`);
      }
      if (req.sync_groups) {
        logs.push(`Synced Client Group assignments to ${target.name}`);
      }
      if (req.sync_local_dns) {
        logs.push(`Synced Local DNS and CNAME mappings to ${target.name}`);
      }
      logs.push(`Restarted FTL DNS resolver on ${target.name} (Reload complete)`);
    }

    return { status: 'success', log: logs };
  },
};
