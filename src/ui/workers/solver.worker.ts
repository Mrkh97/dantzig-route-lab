import { Algorithm } from "@/lib/tsp/algorithm";
import type { SolverWorkerRequest, SolverWorkerResponse, SolverStartPayload } from "./solverWorkerTypes";

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<SolverWorkerRequest>) => void) | null;
  postMessage: (message: SolverWorkerResponse) => void;
};

let activeRunId: string | null = null;
let cancelRequested = false;

ctx.onmessage = (event: MessageEvent<SolverWorkerRequest>) => {
  const message = event.data;

  if (message.type === "cancel") {
    if (message.runId === activeRunId) {
      cancelRequested = true;
    }
    return;
  }

  if (message.type === "start") {
    void runSolver(message.runId, message.payload);
  }
};

async function runSolver(runId: string, payload: SolverStartPayload): Promise<void> {
  activeRunId = runId;
  cancelRequested = false;

  try {
    const algorithm = new Algorithm(payload.cities, payload.distances, payload.config, payload.selection);
    const result = await algorithm.runProgressive(payload.referenceDistance, {
      yieldEvery: 20,
      shouldCancel: () => cancelRequested,
      onProgress: (progress) => {
        postWorkerMessage({
          type: "progress",
          runId,
          progress
        });
      }
    });

    if (result === null || cancelRequested) {
      postWorkerMessage({ type: "cancelled", runId });
      return;
    }

    postWorkerMessage({ type: "done", runId, result });
  } catch (caught) {
    postWorkerMessage({
      type: "error",
      runId,
      message: caught instanceof Error ? caught.message : "Solver failed."
    });
  } finally {
    if (activeRunId === runId) {
      activeRunId = null;
      cancelRequested = false;
    }
  }
}

function postWorkerMessage(message: SolverWorkerResponse): void {
  ctx.postMessage(message);
}
