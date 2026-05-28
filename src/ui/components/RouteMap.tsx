import { useMemo, type ReactElement } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { RunStatus } from "@/ui/store/solverStore";

type Coordinates = Record<number, [number, number]>;

interface RouteMapProps {
  coordinates: Coordinates | null;
  route: number[];
  status: RunStatus;
}

interface ProjectedPoint {
  city: number;
  x: number;
  y: number;
}

const width = 1080;
const height = 536;
const plot = {
  left: 34,
  top: 18,
  right: 24,
  bottom: 34
};
const plotWidth = width - plot.left - plot.right;
const plotHeight = height - plot.top - plot.bottom;

export function RouteMap({ coordinates, route, status }: RouteMapProps): ReactElement {
  const points = useMemo(() => projectPoints(coordinates), [coordinates]);
  const routePath = useMemo(() => buildRoutePath(points, route), [points, route]);
  const firstPoint = route.length > 0 ? points.find((point) => point.city === route[0]) : null;

  if (!coordinates) {
    return (
      <section className="h-[584px] bg-card p-5">
        <Skeleton className="size-full rounded-lg" />
      </section>
    );
  }

  return (
    <section className="relative h-[584px] bg-card p-5">
      <svg className="block size-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="City route map">
        <defs>
          <pattern id="fine-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.45" fill="#e8e8e8" />
          </pattern>
          <pattern id="major-grid" width={plotWidth / 10} height={plotHeight / 10} patternUnits="userSpaceOnUse">
            <path d={`M ${plotWidth / 10} 0 L 0 0 0 ${plotHeight / 10}`} fill="none" stroke="#dfdfdf" strokeWidth="1" />
          </pattern>
          <filter id="start-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0.82 0 0 0 0.82 0 0.35 0 0 0.35 0 0 0.08 0 0.08 0 0 0 0.45 0"
            />
          </filter>
        </defs>

        <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} fill="url(#fine-dots)" />
        <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} fill="url(#major-grid)" />
        <ContourLines />
        <Axes />

        {routePath ? (
          <path
            d={routePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(status === "running" && "drop-shadow-sm")}
          />
        ) : null}

        {firstPoint ? (
          <g>
            <circle cx={firstPoint.x} cy={firstPoint.y} r="18" fill="none" stroke="var(--primary)" strokeOpacity="0.18" strokeWidth="2" />
            <circle cx={firstPoint.x} cy={firstPoint.y} r="27" fill="none" stroke="var(--primary)" strokeOpacity="0.1" strokeWidth="2" />
            <circle cx={firstPoint.x} cy={firstPoint.y} r="36" fill="none" stroke="var(--primary)" strokeOpacity="0.07" strokeWidth="2" />
          </g>
        ) : null}

        {points.map((point) => (
          <g key={point.city}>
            <circle cx={point.x} cy={point.y} r="9" fill="#ffffff" stroke="#3f3f46" strokeWidth="1.2" />
            <text
              x={point.x}
              y={point.y + 3.2}
              textAnchor="middle"
              className="fill-foreground text-[10px] font-medium"
            >
              {point.city}
            </text>
          </g>
        ))}
      </svg>

      <div className="absolute bottom-8 right-8 flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2 text-sm shadow-sm">
        <span className="h-px w-7 bg-primary" />
        <span>Best tour (current)</span>
      </div>

      {route.length === 0 ? (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
          {status === "running" ? "Waiting for first generation" : "Run the solver to draw the route"}
        </div>
      ) : null}
    </section>
  );
}

function projectPoints(coordinates: Coordinates | null): ProjectedPoint[] {
  if (!coordinates) {
    return [];
  }

  const entries = Object.entries(coordinates).map(([city, [x, y]]) => ({
    city: Number(city),
    sourceX: x,
    sourceY: y
  }));
  const minX = Math.min(...entries.map((entry) => entry.sourceX));
  const maxX = Math.max(...entries.map((entry) => entry.sourceX));
  const minY = Math.min(...entries.map((entry) => entry.sourceY));
  const maxY = Math.max(...entries.map((entry) => entry.sourceY));

  return entries.map((entry) => ({
    city: entry.city,
    x: plot.left + ((entry.sourceX - minX) / (maxX - minX)) * plotWidth,
    y: plot.top + (1 - (entry.sourceY - minY) / (maxY - minY)) * plotHeight
  }));
}

function buildRoutePath(points: ProjectedPoint[], route: number[]): string {
  if (points.length === 0 || route.length === 0) {
    return "";
  }

  const byCity = new Map(points.map((point) => [point.city, point]));
  const routePoints = [...route, route[0]]
    .map((city) => byCity.get(city))
    .filter((point): point is ProjectedPoint => Boolean(point));

  return routePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function Axes(): ReactElement {
  const labels = Array.from({ length: 11 }, (_, index) => index * 10);

  return (
    <g className="fill-muted-foreground text-[13px]">
      {labels.map((label) => {
        const x = plot.left + (label / 100) * plotWidth;
        const y = plot.top + (1 - label / 100) * plotHeight;
        return (
          <g key={label}>
            <text x={plot.left - 10} y={y + 4} textAnchor="end">
              {label}
            </text>
            <text x={x} y={height - 7} textAnchor="middle">
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function ContourLines(): ReactElement {
  return (
    <g fill="none" stroke="#d8d8d8" strokeDasharray="2 4" strokeOpacity="0.55" strokeWidth="1">
      <path d="M60 112 C146 64 190 156 119 211 C51 264 114 353 34 420" />
      <path d="M181 18 C144 103 269 122 300 205 C331 291 217 329 257 432" />
      <path d="M318 15 C423 89 313 142 360 219 C405 292 498 253 505 344 C514 459 389 425 345 521" />
      <path d="M470 58 C602 5 718 79 676 176 C637 264 731 314 716 414 C702 501 583 463 546 534" />
      <path d="M739 35 C873 -1 916 88 844 164 C772 240 927 267 919 366 C910 474 788 449 763 525" />
      <path d="M936 30 C1023 78 979 151 1036 212 C1093 274 995 326 1051 402 C1084 449 1019 493 976 526" />
      <path d="M82 476 C190 400 289 501 414 471 C538 441 645 517 768 474 C890 431 962 514 1046 456" />
    </g>
  );
}
