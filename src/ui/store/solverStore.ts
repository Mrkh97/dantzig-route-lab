import { create } from "zustand";

import { loadDantzigData } from "@/lib/tsp/data";
import { createRandomSeed } from "@/lib/tsp/random";
import type { GAConfig, GAProgressSnapshot, GAResult, SelectionType, TSPData } from "@/lib/tsp/types";
import { createInitialProgress, normalizeRunProgress, progressFromResult } from "@/ui/store/progressState";
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
  algorithmType: "elitist",
  populationSize: 1500,
  generations: 300,
  crossoverCount: 1000,
  mutationMethod: "scramble",
  mutationRate: 0.1,
  eliteCount: 5,
  localSearchCount: 2,
  tournamentSize: 5,
  seed: -1
};

let solverWorker: Worker | null = null;
let pendingProgress: GAProgressSnapshot | null = null;
let pendingProgressRunId: string | null = null;
let pendingProgressFrame: number | null = null;

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
    cancelPendingProgress();
    const runConfig = resolveRunConfig(state.config);
    const worker = new Worker(new URL("../workers/solver.worker.ts", import.meta.url), { type: "module" });
    solverWorker = worker;

    const runId = createRunId(runConfig.seed);
    set({
      currentRunId: runId,
      status: "running",
      error: null,
      result: null,
      progress: createInitialProgress(runConfig.generations)
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
        if (pendingProgressRunId === message.runId) {
          cancelPendingProgress();
        }
        return;
      }

      if (message.type === "progress") {
        pendingProgress = normalizeRunProgress(message.progress, pendingProgress ?? current.progress);
        pendingProgressRunId = message.runId;
        if (pendingProgressFrame === null) {
          pendingProgressFrame = requestProgressFrame(() => {
            pendingProgressFrame = null;
            const progress = pendingProgress;
            const progressRunId = pendingProgressRunId;
            pendingProgress = null;
            pendingProgressRunId = null;

            if (!progress || progressRunId === null) {
              return;
            }

            set((latest) => {
              if (latest.currentRunId !== progressRunId || latest.status !== "running") {
                return {};
              }

              const normalized = normalizeRunProgress(progress, latest.progress);
              return normalized === latest.progress ? {} : { progress: normalized };
            });
          });
        }
        return;
      }

      if (message.type === "done") {
        const createdAt = new Date();
        cancelPendingProgress();
        set((latest) => ({
          result: message.result,
          progress: progressFromResult(message.result),
          status: "ready",
          currentRunId: null,
          history: [
            {
              id: runId,
              result: message.result,
              config: runConfig,
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
        cancelPendingProgress();
        set({ status: "idle", currentRunId: null, progress: null });
        worker.terminate();
        if (solverWorker === worker) {
          solverWorker = null;
        }
        return;
      }

      cancelPendingProgress();
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
      cancelPendingProgress();
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
        config: runConfig,
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
    cancelPendingProgress();
    set({ status: "idle", currentRunId: null, progress: null });
  }
}));

export function resolveRunConfig(config: GAConfig): GAConfig {
  return {
    ...config,
    seed: config.seed === -1 || config.seed === null ? createRandomSeed() : config.seed
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

function requestProgressFrame(callback: FrameRequestCallback): number {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(callback);
  }

  return globalThis.setTimeout(() => callback(globalThis.performance?.now() ?? Date.now()), 16) as unknown as number;
}

function cancelProgressFrame(frame: number): void {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(frame);
    return;
  }

  globalThis.clearTimeout(frame);
}

function cancelPendingProgress(): void {
  if (pendingProgressFrame !== null) {
    cancelProgressFrame(pendingProgressFrame);
  }
  pendingProgress = null;
  pendingProgressRunId = null;
  pendingProgressFrame = null;
}
