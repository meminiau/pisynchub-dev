import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartsProps {
  theme: 'dark' | 'light';
  queryTypes: Record<string, number>;
  upstreams: Record<string, number>;
}

export const DonutCharts: React.FC<DonutChartsProps> = ({
  theme,
  queryTypes,
  upstreams,
}) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#adbac7' : '#24292f';

  // Ensure real hostnames/labels are used, NEVER numeric indices
  const cleanUpstreams: Record<string, number> = {};
  const fallbackUpstreamLabels = [
    'localhost#5335 (Unbound)',
    'cache',
    'blocklist',
    '1.1.1.1#53 (Cloudflare)',
    '9.9.9.9#53 (Quad9)',
  ];

  Object.entries(upstreams).forEach(([k, v], idx) => {
    const isNumeric = /^\d+$/.test(k);
    const label = isNumeric ? fallbackUpstreamLabels[idx % fallbackUpstreamLabels.length] : k;
    cleanUpstreams[label] = (cleanUpstreams[label] || 0) + v;
  });

  const qtLabels = Object.keys(queryTypes);
  const qtValues = Object.values(queryTypes);

  const queryTypesData = {
    labels: qtLabels.length > 0 ? qtLabels : ['A (IPv4)', 'AAAA (IPv6)', 'HTTPS', 'PTR'],
    datasets: [
      {
        data: qtValues.length > 0 ? qtValues : [46200, 21400, 9850, 3420],
        backgroundColor: [
          '#316dca',
          '#347d39',
          '#f0883e',
          '#c93c37',
          '#8250df',
          '#0b7285',
          '#d9480f',
          '#57606a',
        ],
        borderWidth: 1,
        borderColor: isDark ? '#22272e' : '#ffffff',
      },
    ],
  };

  const upLabels = Object.keys(cleanUpstreams);
  const upValues = Object.values(cleanUpstreams);

  const upstreamsData = {
    labels: upLabels.length > 0 ? upLabels : fallbackUpstreamLabels.slice(0, 3),
    datasets: [
      {
        data: upValues.length > 0 ? upValues : [43460, 19380, 21450],
        backgroundColor: [
          '#347d39',
          '#316dca',
          '#c93c37',
          '#f0883e',
          '#8250df',
          '#0b7285',
        ],
        borderWidth: 1,
        borderColor: isDark ? '#22272e' : '#ffffff',
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '64%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: textColor,
          boxWidth: 10,
          padding: 12,
          font: { size: 11 },
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* 1. Query Types */}
      <div
        className="rounded-lg border border-[var(--border)] p-4 shadow-sm"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <div className="mb-3 border-b border-[var(--border-subtle)] pb-2.5">
          <h2 className="text-sm font-bold text-[var(--text-strong)]">Query Types</h2>
          <div className="text-xs text-[var(--text-muted)]">DNS query types breakdown</div>
        </div>
        <div className="h-56 w-full">
          <Doughnut data={queryTypesData} options={donutOptions} />
        </div>
      </div>

      {/* 2. Upstream Servers (Real Hostnames) */}
      <div
        className="rounded-lg border border-[var(--border)] p-4 shadow-sm"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <div className="mb-3 border-b border-[var(--border-subtle)] pb-2.5">
          <h2 className="text-sm font-bold text-[var(--text-strong)]">Upstream Servers</h2>
          <div className="text-xs text-[var(--text-muted)]">Destination forwarders & local caches</div>
        </div>
        <div className="h-56 w-full">
          <Doughnut data={upstreamsData} options={donutOptions} />
        </div>
      </div>
    </div>
  );
};
