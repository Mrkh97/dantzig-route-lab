import type { GAConfig, GAProgressSnapshot, GAResult, SelectionType } from "@/lib/tsp/types";

export interface SolverStartPayload {
  cities: number[];
  distances: number[][];
  config: GAConfig;
  selection: SelectionType;
  referenceDistance: number | null;
}

export type SolverWorkerRequest =
  | {
      type: "start";
      runId: string;
      payload: SolverStartPayload;
    }
  | {
      type: "cancel";
      runId: string;
    };

export type SolverWorkerResponse =
  | {
      type: "progress";
      runId: string;
      progress: GAProgressSnapshot;
    }
  | {
      type: "done";
      runId: string;
      result: GAResult;
    }
  | {
      type: "cancelled";
      runId: string;
    }
  | {
      type: "error";
      runId: string;
      message: string;
    };
