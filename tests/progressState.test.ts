import { describe, expect, it } from "vitest";

import type { GAProgressSnapshot, GAResult } from "../src/lib/tsp/index.js";
import { createInitialProgress, normalizeRunProgress, progressFromResult } from "../src/ui/store/progressState.js";

function progressSnapshot(overrides: Partial<GAProgressSnapshot> = {}): GAProgressSnapshot {
  return {
    generation: 0,
    totalGenerations: 100,
    percent: 0,
    bestDistance: 40,
    averageDistance: 50,
    currentGenerationRoute: [1, 2, 3, 4],
    bestRoute: [1, 2, 3, 4],
    routeIsValid: true,
    ...overrides
  };
}

describe("progress state normalization", () => {
  it("accepts increasing generation progress and recalculates percent from generation count", () => {
    const previous = progressSnapshot({ generation: 5, percent: 5 });
    const next = normalizeRunProgress(progressSnapshot({ generation: 12, percent: 1 }), previous);

    expect(next).not.toBe(previous);
    expect(next.generation).toBe(12);
    expect(next.percent).toBe(12);
  });

  it("preserves the previous progress when a lower generation arrives", () => {
    const previous = progressSnapshot({ generation: 45, percent: 45 });
    const next = normalizeRunProgress(progressSnapshot({ generation: 12, percent: 12 }), previous);

    expect(next).toBe(previous);
  });

  it("clamps invalid generation values and fills the current route from the best route", () => {
    const negative = normalizeRunProgress(progressSnapshot({ generation: -20, percent: 90 }), null);
    const overflow = normalizeRunProgress(
      progressSnapshot({
        generation: 140,
        percent: -5,
        currentGenerationRoute: [],
        bestRoute: [4, 3, 2, 1]
      }),
      null
    );

    expect(negative.generation).toBe(0);
    expect(negative.percent).toBe(0);
    expect(overflow.generation).toBe(100);
    expect(overflow.percent).toBe(100);
    expect(overflow.currentGenerationRoute).toEqual([4, 3, 2, 1]);
  });

  it("allows reset only through a fresh initial progress state", () => {
    const previous = progressSnapshot({ generation: 70, percent: 70 });
    const staleReset = normalizeRunProgress(progressSnapshot({ generation: 0, percent: 0 }), previous);
    const freshReset = createInitialProgress(100);

    expect(staleReset).toBe(previous);
    expect(freshReset.generation).toBe(0);
    expect(freshReset.percent).toBe(0);
    expect(freshReset.totalGenerations).toBe(100);
  });

  it("converts final results to exactly 100 percent progress", () => {
    const result: GAResult = {
      selection: "tournament",
      bestSample: {
        sampleId: 1,
        route: [1, 2, 3, 4],
        fitness: 1,
        normalizedFitness: 1,
        totalDistance: 40
      },
      generations: 100,
      referenceDistance: null,
      referenceDifference: null,
      history: [{ generation: 100, bestDistance: 40, averageDistance: 42 }],
      routeIsValid: true
    };

    const progress = progressFromResult(result);

    expect(progress.generation).toBe(100);
    expect(progress.totalGenerations).toBe(100);
    expect(progress.percent).toBe(100);
  });
});
