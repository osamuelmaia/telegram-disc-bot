'use client';

interface Point {
  x: number;
  y: number;
}

interface SparklineChartProps {
  points: Point[];
  color?: string;
}

export default function SparklineChart({ points, color = '#4f46e5' }: SparklineChartProps) {
  const W = 600;
  const H = 140;
  const padX = 4;
  const padY = 8;

  if (points.length < 2) {
    const y = H / 2;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <line x1={padX} y1={y} x2={W - padX} y2={y} stroke={color} strokeWidth="2" strokeDasharray="8 5" strokeOpacity="0.5" />
      </svg>
    );
  }

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const sx = (x: number) => padX + ((x - minX) / rangeX) * (W - padX * 2);
  const sy = (y: number) => padY + (1 - (y - minY) / rangeY) * (H - padY * 2);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');

  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${sx(last.x).toFixed(1)} ${H} L ${sx(first.x).toFixed(1)} ${H} Z`;

  const gradientId = `sg-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
