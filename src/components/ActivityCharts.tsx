import React, { useMemo } from 'react';
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
}

export const ActivityCharts: React.FC<ActivityChartsProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#adbac7' : '#24292f';
  const mutedColor = isDark ? '#768390' : '#57606a';
  const gridColor = isDark ? 'rgba(55, 62, 71, 0.45)' : 'rgba(208, 215, 222, 0.65)';

  // Generate 24 hourly buckets
  const { labels, permitted, cached, blocked, clientSeries } = useMemo(() => {
    const hours: string[] = [];
    const perm: number[] = [];
    const cach: number[] = [];
    const blck: number[] = [];
    const clients: Record<string, number[]> = {
      '192.168.1.10 (unraid-nas)': [],
      '192.168.1.24 (macbook-pro)': [],
      '192.168.1.50 (apple-tv-4k)': [],
      '192.168.1.12 (homeassistant)': [],
      '192.168.10.44 (samsung-tv)': [],
    };

    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600 * 1000);
      const hr = d.getHours();
      hours.push(`${String(hr).padStart(2, '0')}:00`);

      const wave = Math.sin(((hr - 6) / 24) * Math.PI * 2) * 0.45 + 1.0;
      const p = Math.round((2800 + ((hr * 137) % 700)) * wave);
      const c = Math.round((1450 + ((hr * 89) % 420)) * wave);
      const b = Math.round((1650 + ((hr * 113) % 510)) * wave);

      perm.push(p);
      cach.push(c);
      blck.push(b);

      const totalSlice = p + c + b;
      clients['192.168.1.10 (unraid-nas)'].push(Math.round(totalSlice * 0.28));
      clients['192.168.1.24 (macbook-pro)'].push(Math.round(totalSlice * 0.24));
      clients['192.168.1.50 (apple-tv-4k)'].push(Math.round(totalSlice * 0.19));
      clients['192.168.1.12 (homeassistant)'].push(Math.round(totalSlice * 0.16));
      clients['192.168.10.44 (samsung-tv)'].push(Math.round(totalSlice * 0.13));
    }

    return { labels: hours, permitted: perm, cached: cach, blocked: blck, clientSeries: clients };
  }, []);

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
          <Bar data={totalQueriesData} options={chartOptions} />
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
          <Bar data={clientActivityData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};
