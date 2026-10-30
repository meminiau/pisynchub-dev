import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';

interface DomainItem {
  domain: string;
  count: number;
}

interface ClientItem {
  client: string;
  count: number;
}

interface TopListsTablesProps {
  totalQueries: number;
  blockedQueries: number;
  // Live data parsed directly from Pi-hole v6 /api/stats/top_items
  permittedDomains?: DomainItem[];
  blockedDomains?: DomainItem[];
  topClientsTotal?: ClientItem[];
  topClientsBlocked?: ClientItem[];
}

export const TopListsTables: React.FC<TopListsTablesProps> = ({
  totalQueries,
  blockedQueries,
  permittedDomains = [],
  blockedDomains = [],
  topClientsTotal = [],
  topClientsBlocked = [],
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

  const permitted = filterDomains(permittedDomains);
  const blocked = filterDomains(blockedDomains);
  const clientsTotal = filterClients(topClientsTotal);
  const clientsBlocked = filterClients(topClientsBlocked);

  const maxPermitted = Math.max(...permitted.map((i) => i.count), 1);
  const maxBlocked = Math.max(...blocked.map((i) => i.count), 1);
  const maxClientsTotal = Math.max(...clientsTotal.map((i) => i.count), 1);
  const maxClientsBlocked = Math.max(...clientsBlocked.map((i) => i.count), 1);

  const renderEmptyState = (label: string) => (
    <div className="flex flex-col items-center justify-center py-6 text-center text-[var(--text-muted)] opacity-70">
      <AlertCircle className="mb-2 h-6 w-6" />
      <span className="text-xs">Awaiting real-time {label}...</span>
    </div>
  );

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
          <div className="overflow-x-auto min-h-[150px]">
            {permitted.length === 0 ? renderEmptyState('permitted queries') : (
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
            )}
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
          <div className="overflow-x-auto min-h-[150px]">
            {blocked.length === 0 ? renderEmptyState('blocked domains') : (
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
            )}
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
          <div className="overflow-x-auto min-h-[150px]">
            {clientsTotal.length === 0 ? renderEmptyState('active clients') : (
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
            )}
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
          <div className="overflow-x-auto min-h-[150px]">
            {clientsBlocked.length === 0 ? renderEmptyState('blocked clients') : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
