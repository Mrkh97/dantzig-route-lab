import { create } from "zustand";

import { loadDantzigData } from "@/lib/tsp/data";
import { calculateGenerationPercent } from "@/lib/tsp/progress";
import type { GAConfig, GAProgressSnapshot, GAResult, SelectionType, TSPData } from "@/lib/tsp/types";
import type { SolverWorkerRequest, SolverWorkerResponse } from "@/ui/workers/solverWorkerTypes";

export type RunStatus = "idle" | "loading" | "running" | "ready" | "error";

export interface HistoryEntry {
  id: string;
  result: GAResult;
  config: GAConfig;
  createdAt: string;
}

interface SolverStore {
  data: TSPData | null;
  config: GAConfig;
  selection: SelectionType;
  result: GAResult | null;
  progress: GAProgressSnapshot | null;
  history: HistoryEntry[];
  status: RunStatus;
  error: string | null;
  currentRunId: string | null;
  loadData: () => Promise<void>;
  updateConfig: (patch: Partial<GAConfig>) => void;
  setSelection: (selection: SelectionType) => void;
  resetDefaults: () => void;
  startRun: () => void;
  cancelRun: () => void;
}

export const dashboardDefaultConfig: GAConfig = {
  populationSize: 500,
  generations: 10000,
  crossoverCount: 400,
  mutationRate: 0.01,
  eliteCount: 5,
  tournamentSize: 5,
  seed: 20240524
};

let solverWorker: Worker | null = null;

export const useSolverStore = create<SolverStore>((set, get) => ({
  data: null,
  config: dashboardDefaultConfig,
  selection: "tournament",
  result: null,
  progress: null,
  history: [],
  status: "loading",
  error: null,
  currentRunId: null,

  async loadData() {
    set({ status: "loading", error: null });
    try {
      const data = await loadDantzigData();
      set({ data, status: "idle" });
    } catch (caught) {
      set({
        status: "error",
        error: caught instanceof Error ? caught.message : "Failed to load the Dantzig dataset."
      });
    }
  },

  updateConfig(patch) {
    set((state) => ({
      config: {
        ...state.config,
        ...patch
      }
    }));
  },

  setSelection(selection) {
    set({ selection });
  },

  resetDefaults() {
    set({
      config: dashboardDefaultConfig,
      selection: "tournament",
      error: null
    });
  },

  startRun() {
    const state = get();
    if (!state.data) {
      set({ status: "error", error: "Dantzig dataset has not loaded yet." });
      return;
    }

    solverWorker?.terminate();
    const worker = new Worker(new URL("../workers/solver.worker.ts", import.meta.url), { type: "module" });
    solverWorker = worker;

    const runId = createRunId(state.config.seed);
    set({
      currentRunId: runId,
      status: "running",
      error: null,
      result: null,
      progress: {
        generation: 0,
        totalGenerations: state.config.generations,
        percent: 0,
        bestDistance: 0,
        averageDistance: 0,
        currentGenerationRoute: [],
        bestRoute: [],
        routeIsValid: false
      }
    });

    worker.onmessage = (event: MessageEvent<SolverWorkerResponse>) => {
      const message = event.data;
      const current = get();

      if (message.runId !== current.currentRunId) {
        if (message.type !== "progress") {
          worker.terminate();
          if (solverWorker === worker) {
            solverWorker = null;
          }
        }
        return;
      }

      if (message.type === "progress") {
        const progress = normalizeProgress(message.progress, current.progress);
        if (progress) {
          set({ progress });
        }
        return;
      }

      if (message.type === "done") {
        const createdAt = new Date();
        set((latest) => ({
          result: message.result,
          progress: progressFromResult(message.result),
          status: "ready",
          currentRunId: null,
          history: [
            {
              id: runId,
              result: message.result,
              config: latest.config,
              createdAt: createdAt.toLocaleString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              })
            },
            ...latest.history
          ].slice(0, 8)
        }));
        worker.terminate();
        if (solverWorker === worker) {
          solverWorker = null;
        }
        return;
      }

      if (message.type === "cancelled") {
        set({ status: "idle", currentRunId: null, progress: null });
        worker.terminate();
        if (solverWorker === worker) {
          solverWorker = null;
        }
        return;
      }

      set({
        status: "error",
        currentRunId: null,
        error: message.message
      });
      worker.terminate();
      if (solverWorker === worker) {
        solverWorker = null;
      }
    };

    worker.onerror = (event) => {
      set({
        status: "error",
        currentRunId: null,
        error: event.message || "Solver worker failed."
      });
      worker.terminate();
      if (solverWorker === worker) {
        solverWorker = null;
      }
    };

    const request: SolverWorkerRequest = {
      type: "start",
      runId,
      payload: {
        cities: state.data.cities,
        distances: state.data.distances,
        config: state.config,
        selection: state.selection,
        referenceDistance: state.data.minimalTourLength
      }
    };
    worker.postMessage(request);
  },

  cancelRun() {
    const state = get();
    if (!solverWorker || !state.currentRunId) {
      return;
    }

    const request: SolverWorkerRequest = {
      type: "cancel",
      runId: state.currentRunId
    };
    solverWorker.postMessage(request);
    set({ status: "idle", currentRunId: null, progress: null });
  }
}));

function progressFromResult(result: GAResult): GAProgressSnapshot {
  const latest = result.history[result.history.length - 1];

  return {
    generation: result.generations,
    totalGenerations: result.generations,
    percent: calculateGenerationPercent(result.generations, result.generations),
    bestDistance: latest?.bestDistance ?? result.bestSample.totalDistance,
    averageDistance: latest?.averageDistance ?? result.bestSample.totalDistance,
    currentGenerationRoute: result.bestSample.route,
    bestRoute: result.bestSample.route,
    routeIsValid: result.routeIsValid
  };
}

function normalizeProgress(
  progress: GAProgressSnapshot,
  previous: GAProgressSnapshot | null
): GAProgressSnapshot | null {
  if (previous && progress.totalGenerations !== previous.totalGenerations) {
    return null;
  }
  if (previous && progress.generation < previous.generation) {
    return null;
  }

  const totalGenerations = Math.max(0, progress.totalGenerations);
  const generation = Math.min(Math.max(0, progress.generation), totalGenerations);
  const currentGenerationRoute =
    progress.currentGenerationRoute?.length > 0 ? progress.currentGenerationRoute : progress.bestRoute;

  return {
    ...progress,
    generation,
    totalGenerations,
    percent: calculateGenerationPercent(generation, totalGenerations),
    currentGenerationRoute,
    bestRoute: progress.bestRoute.length > 0 ? progress.bestRoute : currentGenerationRoute
  };
}

function createRunId(seed: number | null): string {
  const timestamp = new Date();
  const date = timestamp.toISOString().slice(0, 10).replaceAll("-", "");
  const time = `${timestamp.toTimeString().slice(0, 8).replaceAll(":", "")}-${String(
    timestamp.getMilliseconds()
  ).padStart(3, "0")}`;
  const randomSuffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `#${date}-${time}-${seed ?? "random"}-${randomSuffix}`;
}
