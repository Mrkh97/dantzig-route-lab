import { Activity, BarChart2, GitCompareArrows, ShieldCheck, TrendingUp } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GAProgressSnapshot, GAResult } from "@/lib/tsp/types";

interface MetricStripProps {
  progress: GAProgressSnapshot | null;
  result: GAResult | null;
  referenceDistance: number | null;
}

export function MetricStrip({ progress, result, referenceDistance }: MetricStripProps): ReactElement {
  const bestDistance = progress?.bestDistance ?? result?.bestSample.totalDistance ?? null;
  const averageDistance = progress?.averageDistance ?? result?.history.at(-1)?.averageDistance ?? null;
  const difference =
    bestDistance !== null && referenceDistance !== null ? Math.round(bestDistance - referenceDistance) : null;
  const differencePercent =
    difference !== null && referenceDistance ? (difference / referenceDistance) * 100 : null;
  const routeIsValid = progress?.routeIsValid ?? result?.routeIsValid ?? false;
  const generation = progress?.generation ?? result?.generations ?? null;

  return (
    <>
      <MetricCard
        icon={<TrendingUp className="size-4" />}
        label="Best distance (current)"
        value={bestDistance === null ? "Waiting" : Math.round(bestDistance).toLocaleString()}
        helper={generation === null ? "No run yet" : `Updated generation ${generation.toLocaleString()}`}
        valueClassName="text-primary"
      />
      <MetricCard
        icon={<Activity className="size-4" />}
        label="Reference distance"
        value={referenceDistance?.toLocaleString() ?? "n/a"}
        helper="Dantzig (1963) optimal"
      />
      <MetricCard
        icon={<GitCompareArrows className="size-4" />}
        label="Difference from reference"
        value={difference === null ? "n/a" : difference.toLocaleString()}
        helper={differencePercent === null ? "Waiting" : `${differencePercent.toFixed(2)}%`}
        valueClassName={cn(difference !== null && difference > 0 ? "text-destructive" : "text-chart-2")}
        helperClassName={cn(difference !== null && difference > 0 ? "text-destructive" : "text-chart-2")}
      />
      <MetricCard
        icon={<BarChart2 className="size-4" />}
        label="Average distance"
        value={averageDistance === null ? "Waiting" : averageDistance.toFixed(2)}
        helper="Population average"
      />
      <MetricCard
        icon={<ShieldCheck className="size-4" />}
        label="Route validity"
        value={routeIsValid ? "Valid" : "Waiting"}
        helper={routeIsValid ? "All cities visited once" : "Awaiting complete tour"}
        valueClassName={routeIsValid ? "text-chart-2" : "text-muted-foreground"}
      />
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  valueClassName,
  helperClassName
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  valueClassName?: string;
  helperClassName?: string;
}): ReactElement {
  return (
    <Card size="sm" className="min-h-[96px] rounded-lg shadow-none">
      <CardHeader className="gap-0 px-3 pb-0">
        <CardTitle className="flex items-start gap-2 text-[11px] leading-tight font-medium">
          <span className="text-muted-foreground">{icon}</span>
          <span>{label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-3">
        <div className={cn("text-[28px] leading-none font-medium tabular-nums", valueClassName)}>{value}</div>
        <div className={cn("text-[11px] leading-tight text-muted-foreground", helperClassName)}>{helper}</div>
      </CardContent>
    </Card>
  );
}
