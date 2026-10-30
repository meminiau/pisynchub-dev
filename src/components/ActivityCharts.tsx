import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ActivityChartsProps {
  theme: 'dark' | 'light';
  labels?: string[];
  permitted?: number[];
  cached?: number[];
  blocked?: number[];
  clientSeries?: Record<string, number[]>;
}

export const ActivityCharts: React.FC<ActivityChartsProps> = ({
  theme,
  labels = [],
  permitted = [],
  cached = [],
  blocked = [],
  clientSeries = {},
}) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#adbac7' : '#24292f';
  const mutedColor = isDark ? '#768390' : '#57606a';
  const gridColor = isDark ? 'rgba(55, 62, 71, 0.45)' : 'rgba(208, 215, 222, 0.65)';

  const hasData = labels.length > 0;

  const totalQueriesData = {
    labels,
    datasets: [
      {
        label: 'Permitted',
        data: permitted,
        backgroundColor: '#347d39', // Accent green
        borderRadius: 2,
      },
      {
        label: 'Cached',
        data: cached,
        backgroundColor: '#316dca', // Accent blue
        borderRadius: 2,
      },
      {
        label: 'Blocked',
        data: blocked,
        backgroundColor: '#c93c37', // Accent red
        borderRadius: 2,
      },
    ],
  };

  const clientPalette = ['#316dca', '#347d39', '#f0883e', '#8250df', '#c93c37'];
  const clientActivityData = {
    labels,
    datasets: Object.entries(clientSeries).map(([clientName, vals], idx) => ({
      label: clientName,
      data: vals,
      backgroundColor: clientPalette[idx % clientPalette.length],
      borderRadius: 2,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: textColor,
          boxWidth: 10,
          font: { size: 11 },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: mutedColor,
          maxTicksLimit: 8,
          maxRotation: 0,
          font: { size: 10 },
        },
      },
      y: {
        stacked: true,
        grid: { color: gridColor },
        ticks: {
          color: mutedColor,
          font: { size: 10 },
        },
      },
    },
  };

  const renderEmptyState = (label: string) => (
    <div className="flex h-full flex-col items-center justify-center text-center text-[var(--text-muted)] opacity-70">
      <Activity className="mb-2 h-6 w-6" />
      <span className="text-xs">Awaiting real-time {label}...</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* Chart 1: Total Queries */}
      <div
        className="rounded-lg border border-[var(--border)] p-4 shadow-sm"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <div className="mb-3 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-strong)]">Total queries over last 24 hours</h2>
            <div className="text-xs text-[var(--text-muted)]">
              Permitted (green), Cached (blue), and Blocked (red) stacked time-series
            </div>
          </div>
        </div>
        <div className="h-60 w-full">
          {hasData ? (
            <Bar data={totalQueriesData} options={chartOptions} />
          ) : (
            renderEmptyState('query history')
          )}
        </div>
      </div>

      {/* Chart 2: Client Activity */}
      <div
        className="rounded-lg border border-[var(--border)] p-4 shadow-sm"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <div className="mb-3 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-strong)]">Client activity over last 24 hours</h2>
            <div className="text-xs text-[var(--text-muted)]">
              Top query-producing client IPs and devices over 24-hour intervals
            </div>
          </div>
        </div>
        <div className="h-60 w-full">
          {hasData && Object.keys(clientSeries).length > 0 ? (
            <Bar data={clientActivityData} options={chartOptions} />
          ) : (
            renderEmptyState('client activity')
          )}
        </div>
      </div>
    </div>
  );
};
