import React from 'react';
import { Activity, ShieldAlert, Percent, Database } from 'lucide-react';

interface KPICardsProps {
  totalQueries: number;
  blockedQueries: number;
  cachedQueries: number;
  percentBlocked: number;
  gravityDomains: number;
  totalQpm: number;
  activeNodesCount: number;
}

export const KPICards: React.FC<KPICardsProps> = ({
  totalQueries,
  blockedQueries,
  cachedQueries,
  percentBlocked,
  gravityDomains,
  totalQpm,
  activeNodesCount,
}) => {
  return (
    <section
      aria-label="DNS Cluster Key Metrics"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
    >
      {/* 1. Total Queries (Blue) */}
      <div
        className="flex min-h-[115px] flex-col justify-between rounded-lg p-4 text-white shadow-md border border-white/10"
        style={{
          background: 'linear-gradient(135deg, #0b7285 0%, #0969da 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wide uppercase opacity-90">Total Queries</span>
          <Activity className="h-4 w-4 opacity-80" />
        </div>
        <div className="my-1 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
          {totalQueries.toLocaleString()}
        </div>
        <div className="flex items-center justify-between text-[11px] opacity-85">
          <span>{totalQpm.toFixed(1)} queries/min</span>
          <span className="font-mono">Cached: {cachedQueries.toLocaleString()}</span>
        </div>
      </div>

      {/* 2. Queries Blocked (Red) */}
      <div
        className="flex min-h-[115px] flex-col justify-between rounded-lg p-4 text-white shadow-md border border-white/10"
        style={{
          background: 'linear-gradient(135deg, #c92a2a 0%, #c93c37 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wide uppercase opacity-90">Queries Blocked</span>
          <ShieldAlert className="h-4 w-4 opacity-80" />
        </div>
        <div className="my-1 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
          {blockedQueries.toLocaleString()}
        </div>
        <div className="flex items-center justify-between text-[11px] opacity-85">
          <span>Ad & Tracker sinkhole</span>
          <span>Pi-hole v6 FTL</span>
        </div>
      </div>

      {/* 3. Percentage Blocked (Orange) */}
      <div
        className="flex min-h-[115px] flex-col justify-between rounded-lg p-4 text-white shadow-md border border-white/10"
        style={{
          background: 'linear-gradient(135deg, #d9480f 0%, #bf8700 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wide uppercase opacity-90">Percentage Blocked</span>
          <Percent className="h-4 w-4 opacity-80" />
        </div>
        <div className="my-1 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
          {percentBlocked.toFixed(1)}%
        </div>
        <div className="flex items-center justify-between text-[11px] opacity-85">
          <span>Network blocking ratio</span>
          <span>{activeNodesCount} active node(s)</span>
        </div>
      </div>

      {/* 4. Domains on Lists (Green) */}
      <div
        className="flex min-h-[115px] flex-col justify-between rounded-lg p-4 text-white shadow-md border border-white/10"
        style={{
          background: 'linear-gradient(135deg, #2b8a3e 0%, #347d39 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wide uppercase opacity-90">Domains on Lists</span>
          <Database className="h-4 w-4 opacity-80" />
        </div>
        <div className="my-1 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
          {gravityDomains.toLocaleString()}
        </div>
        <div className="flex items-center justify-between text-[11px] opacity-85">
          <span>Gravity database</span>
          <span>Synced cluster</span>
        </div>
      </div>
    </section>
  );
};
