export interface PiholeNode {
  name: string;
  url: string;
  api_key?: string;
  online?: boolean;
  blocking_enabled?: boolean;
  queries?: number;
  blocked?: number;
  cached?: number;
  percent_blocked?: number;
  gravity_size?: number;
  qpm?: number;
  cpu_load?: number;
  querytypes?: Record<string, number>;
  upstreams?: Record<string, number>;
  status?: 'online' | 'offline';
}

export interface NodeUpstream {
  id: string;
  name: string;
  ip: string;
  port: number;
  enabled: boolean;
  isCustom?: boolean;
}

export interface DomainRule {
  id: string;
  domain: string;
  type: 'allow' | 'deny';
  kind: 'exact' | 'regex' | 'wildcard';
  comment: string;
  enabled: boolean;
  date_added?: string;
}

export interface AdlistRule {
  id: string;
  url: string;
  comment: string;
  enabled: boolean;
  domain_count?: number;
  status?: 'active' | 'updating' | 'error';
}

export interface RawNodeConfig {
  ftl_port: number;
  max_log_age_days: number;
  cache_size: number;
  blocking_mode: 'NULL' | 'IP' | 'NODATA' | 'NXDOMAIN';
  rate_limit_count: number;
  rate_limit_interval: number;
  local_ttl: number;
  edns0_enabled: boolean;
}

export interface NodeDetailedConfig {
  upstreams: NodeUpstream[];
  dnssec_enabled: boolean;
  conditional_forwarding: boolean;
  rev_server_cidr?: string;
  rev_server_target?: string;
  rev_server_domain?: string;
  domains: DomainRule[];
  adlists: AdlistRule[];
  raw_config: RawNodeConfig;
}

export interface BackupItem {
  filename: string;
  size_kb: number;
  created: string;
}

export interface SyncRequestModel {
  source_index: number;
  target_indices: number[];
  sync_adlists: boolean;
  sync_domains: boolean;
  sync_groups?: boolean;
  sync_local_dns?: boolean;
}

export interface DashboardStats {
  blocking: {
    enabled: boolean;
    timer?: number | null;
    updated_at?: string | null;
  };
  nodes: PiholeNode[];
  history?: {
    labels: string[];
    permitted: number[];
    cached: number[];
    blocked: number[];
    client_series: Record<string, number[]>;
  };
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}
