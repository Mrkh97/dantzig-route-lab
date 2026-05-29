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
const cityCoordinateScale = 0.78;
const usContextMapHref = "/assets/us-context-map.png";

export function RouteMap({ coordinates, route, status }: RouteMapProps): ReactElement {
  const points = useMemo(() => projectPoints(coordinates), [coordinates]);
  const routePath = useMemo(() => buildRoutePath(points, route), [points, route]);
  const firstPoint = route.length > 0 ? points.find((point) => point.city === route[0]) : null;

  if (!coordinates) {
    return (
      <section className="h-full">
        <Skeleton className="size-full rounded-lg" />
      </section>
    );
  }

  return (
    <section className="relative h-full">
      <svg className="block size-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Dantzig route map with United States context">
        <defs>
          <clipPath id="route-map-plot-clip">
            <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} rx="18" />
          </clipPath>
        </defs>

        <g clipPath="url(#route-map-plot-clip)">
          <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} fill="#fafafa" />
          <image
            href={usContextMapHref}
            x={plot.left}
            y={plot.top}
            width={plotWidth}
            height={plotHeight}
            opacity="0.72"
            preserveAspectRatio="xMidYMid slice"
          />
          <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} fill="#ffffff" fillOpacity="0.18" />
          <ContextGrid />
        </g>
        <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} rx="18" fill="none" stroke="var(--border)" strokeOpacity="0.72" />

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

      <div className="absolute bottom-8 right-8 flex items-center gap-3 rounded-md border border-white/70 bg-white/85 px-4 py-2 text-sm shadow-sm backdrop-blur">
        <span className="h-px w-7 bg-primary" />
        <span>Best tour (current)</span>
      </div>

      {route.length === 0 ? (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-md border border-white/70 bg-white/85 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
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
  const centerX = plot.left + plotWidth / 2;
  const centerY = plot.top + plotHeight / 2;

  return entries.map((entry) => {
    const x = plot.left + ((entry.sourceX - minX) / (maxX - minX)) * plotWidth;
    const y = plot.top + (1 - (entry.sourceY - minY) / (maxY - minY)) * plotHeight;

    return {
      city: entry.city,
      x: centerX + (x - centerX) * cityCoordinateScale,
      y: centerY + (y - centerY) * cityCoordinateScale
    };
  });
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

function ContextGrid(): ReactElement {
  const columns = Array.from({ length: 13 }, (_, index) => plot.left + (index / 12) * plotWidth);
  const rows = Array.from({ length: 7 }, (_, index) => plot.top + (index / 6) * plotHeight);

  return (
    <g stroke="var(--border)" strokeOpacity="0.28" strokeWidth="1">
      {columns.map((x) => (
        <line key={`column-${x}`} x1={x} y1={plot.top} x2={x} y2={plot.top + plotHeight} />
      ))}
      {rows.map((y) => (
        <line key={`row-${y}`} x1={plot.left} y1={y} x2={plot.left + plotWidth} y2={y} />
      ))}
    </g>
  );
}
