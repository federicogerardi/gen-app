'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TrendPoint = {
  date: string;
  count: number;
};

type Props = {
  points30d: TrendPoint[];
};

const italianDecimalFormatter = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatDayLabel(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
  });
}

function buildPolyline(points: TrendPoint[]): string {
  if (points.length <= 1) return '0,100 100,100';

  const max = Math.max(1, ...points.map((point) => point.count));
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - (point.count / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');
}

export function PersonalTrendCard({ points30d }: Props) {
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');

  const visiblePoints = useMemo(
    () => (period === '7d' ? points30d.slice(-7) : points30d),
    [period, points30d],
  );

  const total = visiblePoints.reduce((sum, point) => sum + point.count, 0);
  const todayCount = visiblePoints[visiblePoints.length - 1]?.count ?? 0;
  const peak = Math.max(0, ...visiblePoints.map((point) => point.count));
  const average = visiblePoints.length > 0 ? total / visiblePoints.length : 0;
  const polyline = buildPolyline(visiblePoints);
  const firstLabel = visiblePoints[0] ? formatDayLabel(visiblePoints[0].date) : '-';
  const lastLabel = visiblePoints[visiblePoints.length - 1]
    ? formatDayLabel(visiblePoints[visiblePoints.length - 1].date)
    : '-';

  return (
    <Card className="app-surface rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Trend personale generazioni</CardTitle>
          <div className="inline-flex rounded-lg border border-black/10 bg-white/70 p-1" role="group" aria-label="Selettore periodo trend personale">
            <button
              type="button"
              onClick={() => setPeriod('7d')}
              className={`rounded-md px-2 py-1 text-xs font-medium outline-none transition ${
                period === '7d'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500/45'
              }`}
              aria-pressed={period === '7d'}
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30d')}
              className={`rounded-md px-2 py-1 text-xs font-medium outline-none transition ${
                period === '30d'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500/45'
              }`}
              aria-pressed={period === '30d'}
            >
              30d
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="sr-only" aria-live="polite">
          Periodo {period}: {total} generazioni totali, oggi {todayCount}.
        </p>

        <div className="rounded-xl border border-black/10 bg-white/70 p-3">
          <svg viewBox="0 0 100 100" className="h-20 w-full" role="img" aria-label={`Andamento generazioni personali ${period}`}>
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              points={polyline}
              className="text-slate-900"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{firstLabel}</span>
            <span>{lastLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-black/10 bg-white/70 p-2">
            <p className="text-xs text-muted-foreground">Totale periodo</p>
            <p className="font-semibold text-foreground">{total}</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white/70 p-2">
            <p className="text-xs text-muted-foreground">Oggi</p>
            <p className="font-semibold text-foreground">{todayCount}</p>
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white/70 p-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Legenda</p>
          <p>Picco periodo: {peak}</p>
          <p>Media giornaliera: {italianDecimalFormatter.format(average)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
