import {
  BarChart3,
  Download,
  LoaderCircle,
  Network,
  Settings,
  ShieldAlert,
  SlidersHorizontal
} from "lucide-react";
import { useEffect, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ControlPanel } from "@/ui/components/ControlPanel";
import { MetricStrip } from "@/ui/components/MetricStrip";
import { RouteMap } from "@/ui/components/RouteMap";
import { RouteSequence } from "@/ui/components/RouteSequence";
import { RunHistory } from "@/ui/components/RunHistory";
import { useSolverStore } from "@/ui/store/solverStore";

export function App(): ReactElement {
  const {
    data,
    config,
    selection,
    result,
    progress,
    history,
    status,
    error,
    loadData,
    updateConfig,
    setSelection,
    resetDefaults,
    startRun,
    cancelRun
  } = useSolverStore();

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentRoute = progress?.currentGenerationRoute.length
    ? progress.currentGenerationRoute
    : result?.bestSample.route ?? [];
  const progressValue = status === "running" ? progress?.percent ?? 0 : result ? 100 : 0;
  const generationLabel =
    status === "running" && progress
      ? `Generation ${progress.generation.toLocaleString()} / ${progress.totalGenerations.toLocaleString()}`
      : result
        ? `Generation ${result.generations.toLocaleString()} / ${result.generations.toLocaleString()}`
        : `Generation 0 / ${config.generations.toLocaleString()}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="grid h-[72px] grid-cols-[minmax(440px,1fr)_minmax(420px,0.9fr)_auto] items-center border-b border-border bg-card px-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-11 place-items-center text-primary">
            <Network strokeWidth={1.4} className="size-10" />
          </div>
          <h1 className="truncate text-2xl font-semibold tracking-normal">Dantzig Route Lab</h1>
          <Separator orientation="vertical" className="h-7" />
          <div className="flex min-w-0 items-center gap-3 text-[15px] text-muted-foreground">
            <span>TSP</span>
            <span>·</span>
            <span className="truncate">42-city Dantzig dataset</span>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-4 px-5">
          <div className="flex min-w-[105px] items-center gap-2 text-sm">
            {status === "running" ? (
              <LoaderCircle className="size-4 animate-spin text-primary" />
            ) : (
              <span className="size-4 rounded-full border border-primary" />
            )}
            <span className="truncate">{statusLabel(status)}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{generationLabel}</span>
              <span>{progressValue.toFixed(1)}%</span>
            </div>
            <Progress value={progressValue} />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <Button variant="outline" size="icon-lg" aria-label="Open analytics">
            <BarChart3 data-icon="inline-start" />
          </Button>
          <Button variant="outline" size="icon-lg" aria-label="Download current run">
            <Download data-icon="inline-start" />
          </Button>
          <Button variant="outline" size="icon-lg" aria-label="Open settings">
            <Settings data-icon="inline-start" />
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-[minmax(0,1fr)_440px] border-b border-border">
        <RouteMap coordinates={data?.coordinates ?? null} route={currentRoute} status={status} />
        <aside className="border-l border-border bg-card px-6 py-6">
          <div className="mb-5 flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            <h2 className="text-base font-semibold">Algorithm Controls</h2>
          </div>
          <ControlPanel
            config={config}
            selection={selection}
            disabled={status === "running" || status === "loading"}
            canRun={Boolean(data) && status !== "running" && status !== "loading"}
            running={status === "running"}
            onConfigChange={updateConfig}
            onSelectionChange={setSelection}
            onRun={startRun}
            onCancel={cancelRun}
            onReset={resetDefaults}
          />
        </aside>
      </section>

      <section className="grid grid-cols-[repeat(5,minmax(0,1fr))_minmax(440px,1.75fr)] gap-3 border-b border-border bg-background px-6 py-4">
        <MetricStrip progress={progress} result={result} referenceDistance={data?.minimalTourLength ?? null} />
        <RouteSequence route={currentRoute} />
      </section>

      {error ? (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <ShieldAlert className="size-4" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="px-6 py-3">
        <RunHistory history={history} />
      </section>
    </main>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "loading":
      return "Loading...";
    case "running":
      return "Running...";
    case "ready":
      return "Completed";
    case "error":
      return "Needs attention";
    default:
      return "Ready";
  }
}
