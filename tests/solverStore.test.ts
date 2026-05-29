import { describe, expect, it } from "vitest";

import { MAX_RANDOM_SEED } from "../src/lib/tsp/index.js";
import { dashboardDefaultConfig, resolveRunConfig } from "../src/ui/store/solverStore.js";

describe("solver run config", () => {
  it("resolves the random seed sentinel to a concrete reproducible seed", () => {
    const runConfig = resolveRunConfig({ ...dashboardDefaultConfig, seed: -1 });
    const seed = runConfig.seed as number;

    expect(typeof seed).toBe("number");
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(1);
    expect(seed).toBeLessThanOrEqual(MAX_RANDOM_SEED);
  });

  it("preserves an explicit seed", () => {
    const runConfig = resolveRunConfig({ ...dashboardDefaultConfig, seed: 12345 });

    expect(runConfig.seed).toBe(12345);
  });
});
