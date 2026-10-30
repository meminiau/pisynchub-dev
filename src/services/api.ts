import {
  PiholeNode,
  DashboardStats,
  BackupItem,
  SyncRequestModel,
  NodeDetailedConfig,
} from '../types';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMessage = `HTTP error ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data.detail === 'string') {
        errMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        // Formats FastAPI validation error lists into readable text
        errMessage = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (data.message && typeof data.message === 'string') {
        errMessage = data.message;
      } else if (data.detail && typeof data.detail === 'object') {
        errMessage = JSON.stringify(data.detail);
      }
    } catch {
      const text = await res.text();
      if (text) errMessage = text;
    }
    throw new Error(errMessage);
  }
  return res.json();
}

export const api = {
  // Auth & System Setup
  async getAuthStatus(): Promise<{ setup_required: boolean; authenticated: boolean; username: string | null }> {
    const res = await fetch('/api/auth/status');
    return handleResponse(res);
  },

  async login(creds: { username: string; password?: string }): Promise<{ status: string; username: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    return handleResponse(res);
  },

  async setupInitialAuth(creds: { username: string; password: string }): Promise<{ status: string }> {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    return handleResponse(res);
  },

  async logout(): Promise<{ status: string }> {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    return handleResponse(res);
  },

  // Nodes Management
  async getNodes(): Promise<{ status: string; nodes: PiholeNode[] }> {
    const res = await fetch('/api/nodes');
    return handleResponse(res);
  },

  async addNode(node: { name: string; url: string; api_key?: string }): Promise<{ status: string; nodes: PiholeNode[] }> {
    const res = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node),
    });
    return handleResponse(res);
  },

  async deleteNode(index: number): Promise<{ status: string; nodes: PiholeNode[] }> {
    const res = await fetch(`/api/nodes/${index}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
    // Telemetry & Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats');
    return handleResponse(res);
  },

  // Network-Wide Blocking Status
  async getBlockingStatus(): Promise<{ enabled: boolean; timer: number | null }> {
    const res = await fetch('/api/blocking/status');
    return handleResponse(res);
  },

  async setBlockingStatus(enabled: boolean, timer?: number): Promise<{ status: string; enabled: boolean }> {
    const res = await fetch('/api/blocking/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, timer }),
    });
    return handleResponse(res);
  },

  // Node Detailed Configuration (Drawer)
  async getNodeConfig(nodeIndex: number): Promise<NodeDetailedConfig> {
    const res = await fetch(`/api/nodes/${nodeIndex}/config`);
    return handleResponse(res);
  },

  async updateNodeConfig(nodeIndex: number, updated: NodeDetailedConfig): Promise<{ status: string; config: NodeDetailedConfig }> {
    const res = await fetch(`/api/nodes/${nodeIndex}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    return handleResponse(res);
  },

  async updateGravity(nodeIndex: number): Promise<{ status: string; detail: string; domains: number }> {
    const res = await fetch(`/api/nodes/${nodeIndex}/gravity/update`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // Teleporter Backups & Vault
  async getBackups(): Promise<{ status: string; backups: BackupItem[] }> {
    const res = await fetch('/api/backups');
    return handleResponse(res);
  },

  async createBackup(nodeIndex: number): Promise<{ status: string; filename: string; size: number }> {
    const res = await fetch(`/api/backups/create/${nodeIndex}`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async restoreBackup(nodeIndex: number, filename: string): Promise<{ status: string; detail: string }> {
    const res = await fetch(`/api/backups/restore/${nodeIndex}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    return handleResponse(res);
  },

  // High-Availability Sync
  async executeSync(req: SyncRequestModel): Promise<{ status: string; log: string[] }> {
    const res = await fetch('/api/sync/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return handleResponse(res);
  },
};
