import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface DomainItem {
  domain: string;
  count: number;
}

interface ClientItem {
  client: string;
  count: number;
}

const DEFAULT_TOP_PERMITTED: DomainItem[] = [
  { domain: 'gateway.icloud.com', count: 8420 },
  { domain: 'time.apple.com', count: 6190 },
  { domain: 'connectivitycheck.gstatic.com', count: 5340 },
  { domain: 'api.github.com', count: 4210 },
  { domain: 'play.googleapis.com', count: 3890 },
  { domain: 'cloudflare-dns.com', count: 3410 },
  { domain: 'mesu.apple.com', count: 2980 },
  { domain: 'ntp.ubuntu.com', count: 2640 },
  { domain: 'registry-1.docker.io', count: 2190 },
  { domain: 'weather-data.apple.com', count: 1850 },
];

const DEFAULT_TOP_BLOCKED: DomainItem[] = [
  { domain: 'telemetry.microsoft.com', count: 9640 },
  { domain: 'metrics.icloud.com', count: 7410 },
  { domain: 'googleads.g.doubleclick.net', count: 6280 },
  { domain: 'app-measurement.com', count: 5490 },
  { domain: 'events.gfe.nvidia.com', count: 4120 },
  { domain: 'samsungacr.com', count: 3870 },
  { domain: 'fireoscaptiveportal.com', count: 3390 },
  { domain: 'graph.facebook.com', count: 2940 },
  { domain: 'ads.youtube.com', count: 2480 },
  { domain: 'log.pinterest.com', count: 1920 },
];

const DEFAULT_TOP_CLIENTS_TOTAL: ClientItem[] = [
  { client: '192.168.1.10 (unraid-nas.lan)', count: 38420 },
  { client: '192.168.1.24 (macbook-pro.lan)', count: 29150 },
  { client: '192.168.1.50 (apple-tv-4k.lan)', count: 22840 },
  { client: '192.168.1.12 (homeassistant.lan)', count: 19680 },
  { client: '192.168.1.105 (iphone-16-pro.lan)', count: 16490 },
  { client: '192.168.10.44 (samsung-qled-tv.iot)', count: 14120 },
  { client: '192.168.1.88 (proxmox-node1.lan)', count: 11850 },
  { client: '192.168.10.62 (roborock-vacuum.iot)', count: 6910 },
];

const DEFAULT_TOP_CLIENTS_BLOCKED: ClientItem[] = [
  { client: '192.168.10.44 (samsung-qled-tv.iot)', count: 9840 },
  { client: '192.168.1.24 (macbook-pro.lan)', count: 8120 },
  { client: '192.168.1.50 (apple-tv-4k.lan)', count: 7450 },
  { client: '192.168.1.105 (iphone-16-pro.lan)', count: 6390 },
  { client: '192.168.10.62 (roborock-vacuum.iot)', count: 4820 },
  { client: '192.168.1.10 (unraid-nas.lan)', count: 3410 },
  { client: '192.168.1.12 (homeassistant.lan)', count: 2510 },
  { client: '192.168.1.88 (proxmox-node1.lan)', count: 1920 },
];

interface TopListsTablesProps {
  totalQueries: number;
  blockedQueries: number;
}

export const TopListsTables: React.FC<TopListsTablesProps> = ({
  totalQueries,
  blockedQueries,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filterDomains = (list: DomainItem[]) => {
    if (!filterQuery.trim()) return list;
    const q = filterQuery.toLowerCase();
    return list.filter((i) => i.domain.toLowerCase().includes(q));
  };

  const filterClients = (list: ClientItem[]) => {
    if (!filterQuery.trim()) return list;
    const q = filterQuery.toLowerCase();
    return list.filter((i) => i.client.toLowerCase().includes(q));
  };

  const permitted = filterDomains(DEFAULT_TOP_PERMITTED);
  const blocked = filterDomains(DEFAULT_TOP_BLOCKED);
  const clientsTotal = filterClients(DEFAULT_TOP_CLIENTS_TOTAL);
  const clientsBlocked = filterClients(DEFAULT_TOP_CLIENTS_BLOCKED);

  const maxPermitted = Math.max(...permitted.map((i) => i.count), 1);
  const maxBlocked = Math.max(...blocked.map((i) => i.count), 1);
  const maxClientsTotal = Math.max(...clientsTotal.map((i) => i.count), 1);
  const maxClientsBlocked = Math.max(...clientsBlocked.map((i) => i.count), 1);

  return (
    <div
      className="rounded-lg border border-[var(--border)] p-4 shadow-sm"
      style={{ backgroundColor: 'var(--card-bg)' }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-strong)]">Aggregated Top Lists</h2>
          <div className="text-xs text-[var(--text-muted)]">
            Relative frequency distribution across active Pi-hole v6 cluster nodes
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Search domain or client..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-strong)] placeholder-[var(--text-muted)]"
            style={{ backgroundColor: 'var(--input-bg)' }}
          />
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Table 1: Top Permitted Domains */}
        <div
          className="rounded-md border border-[var(--border)] p-3"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-strong)]">Top Permitted Domains</h3>
            <span className="text-[11px] text-[var(--text-muted)]">Resolved lookups</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                  <th className="py-1.5 font-semibold">Domain</th>
                  <th className="py-1.5 text-right font-semibold">Hits</th>
                  <th className="py-1.5 pl-3 font-semibold">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {permitted.map((row) => {
                  const relBar = Math.round((row.count / maxPermitted) * 100);
                  const sharePct = ((row.count / Math.max(totalQueries, 1)) * 100).toFixed(1);
                  return (
                    <tr
                      key={row.domain}
                      className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--card-hover)]"
                    >
                      <td className="max-w-[200px] truncate py-1.5 font-mono text-[11px] text-[var(--text-strong)]" title={row.domain}>
                        {row.domain}
                      </td>
                      <td className="py-1.5 text-right font-mono font-semibold text-[var(--text-strong)]">
                        {row.count.toLocaleString()}
                      </td>
                      <td className="py-1.5 pl-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-[var(--bar-track)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--accent-green)] transition-all duration-300"
                              style={{ width: `${relBar}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-[var(--text-muted)] w-8 text-right">{sharePct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Top Blocked Domains */}
        <div
          className="rounded-md border border-[var(--border)] p-3"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-strong)]">Top Blocked Domains</h3>
            <span className="text-[11px] text-[var(--text-muted)]">Gravity sinkhole</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                  <th className="py-1.5 font-semibold">Domain</th>
                  <th className="py-1.5 text-right font-semibold">Hits</th>
                  <th className="py-1.5 pl-3 font-semibold">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((row) => {
                  const relBar = Math.round((row.count / maxBlocked) * 100);
                  const sharePct = ((row.count / Math.max(blockedQueries, 1)) * 100).toFixed(1);
                  return (
                    <tr
                      key={row.domain}
                      className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--card-hover)]"
                    >
                      <td className="max-w-[200px] truncate py-1.5 font-mono text-[11px] text-[var(--text-strong)]" title={row.domain}>
                        {row.domain}
                      </td>
                      <td className="py-1.5 text-right font-mono font-semibold text-[var(--text-strong)]">
                        {row.count.toLocaleString()}
                      </td>
                      <td className="py-1.5 pl-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-[var(--bar-track)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--accent-red)] transition-all duration-300"
                              style={{ width: `${relBar}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-[var(--text-muted)] w-8 text-right">{sharePct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3: Top Clients (Total) */}
        <div
          className="rounded-md border border-[var(--border)] p-3"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-strong)]">Top Clients (total)</h3>
            <span className="text-[11px] text-[var(--text-muted)]">All queries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                  <th className="py-1.5 font-semibold">Client</th>
                  <th className="py-1.5 text-right font-semibold">Requests</th>
                  <th className="py-1.5 pl-3 font-semibold">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {clientsTotal.map((row) => {
                  const relBar = Math.round((row.count / maxClientsTotal) * 100);
                  const sharePct = ((row.count / Math.max(totalQueries, 1)) * 100).toFixed(1);
                  return (
                    <tr
                      key={row.client}
                      className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--card-hover)]"
                    >
                      <td className="max-w-[200px] truncate py-1.5 font-mono text-[11px] text-[var(--text-strong)]" title={row.client}>
                        {row.client}
                      </td>
                      <td className="py-1.5 text-right font-mono font-semibold text-[var(--text-strong)]">
                        {row.count.toLocaleString()}
                      </td>
                      <td className="py-1.5 pl-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-[var(--bar-track)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--accent-green)] transition-all duration-300"
                              style={{ width: `${relBar}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-[var(--text-muted)] w-8 text-right">{sharePct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 4: Top Clients (Blocked Only) */}
        <div
          className="rounded-md border border-[var(--border)] p-3"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-strong)]">Top Clients (blocked only)</h3>
            <span className="text-[11px] text-[var(--text-muted)]">Filtered queries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                  <th className="py-1.5 font-semibold">Client</th>
                  <th className="py-1.5 text-right font-semibold">Blocked</th>
                  <th className="py-1.5 pl-3 font-semibold">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {clientsBlocked.map((row) => {
                  const relBar = Math.round((row.count / maxClientsBlocked) * 100);
                  const sharePct = ((row.count / Math.max(blockedQueries, 1)) * 100).toFixed(1);
                  return (
                    <tr
                      key={row.client}
                      className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--card-hover)]"
                    >
                      <td className="max-w-[200px] truncate py-1.5 font-mono text-[11px] text-[var(--text-strong)]" title={row.client}>
                        {row.client}
                      </td>
                      <td className="py-1.5 text-right font-mono font-semibold text-[var(--text-strong)]">
                        {row.count.toLocaleString()}
                      </td>
                      <td className="py-1.5 pl-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-[var(--bar-track)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--accent-red)] transition-all duration-300"
                              style={{ width: `${relBar}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-[var(--text-muted)] w-8 text-right">{sharePct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
