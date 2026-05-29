import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  Algorithm,
  FitnessCalculator,
  Sample,
  SeededRandom,
  calculateGenerationPercent,
  defaultConfig,
  parseDantzigData,
  validateConfig
} from "../src/lib/tsp/index.js";
import type { AlgorithmType, GAConfig, GAProgressSnapshot, MutationMethod } from "../src/lib/tsp/index.js";

const algorithmTypes: AlgorithmType[] = ["simple", "elitist", "steady-state", "memetic"];
const mutationMethods: MutationMethod[] = ["swap", "inversion", "insertion", "scramble"];

const smallTspData = {
  cities: [1, 2, 3, 4],
  distances: [
    [0, 10, 14, 10],
    [10, 0, 10, 14],
    [14, 10, 0, 10],
    [10, 14, 10, 0]
  ],
  minimalTourLength: 40
};

function loadFixtureData() {
  const root = resolve(import.meta.dirname, "..", "..");
  return parseDantzigData({
    cityData: readFileSync(resolve(root, "cityData.txt"), "utf8"),
    intercityDistance: readFileSync(resolve(root, "intercityDistance.txt"), "utf8"),
    minimalTourLength: readFileSync(resolve(root, "minimal tour length.txt"), "utf8")
  });
}

describe("Dantzig dataset", () => {
  it("loads the dataset and reference tour length", () => {
    const data = loadFixtureData();

    expect(data.cities).toHaveLength(42);
    expect(data.distances).toHaveLength(42);
    expect(data.distances.every((row) => row.length === 42)).toBe(true);
    expect(data.minimalTourLength).toBe(699);
  });
});

describe("PMX crossover", () => {
  it("produces valid permutations", () => {
    const parent1 = Sample.fromRoute([1, 2, 3, 4, 5, 6, 7, 8]);
    const parent2 = Sample.fromRoute([4, 1, 2, 8, 7, 6, 5, 3]);

    const [child1, child2] = Algorithm.pmxCrossover(parent1, parent2, new SeededRandom(7));

    expect(child1.isValidPermutation(parent1.route)).toBe(true);
    expect(child2.isValidPermutation(parent1.route)).toBe(true);
  });
});

describe("mutation", () => {
  it("keeps valid permutations", () => {
    const sample = Sample.fromRoute([1, 2, 3, 4, 5, 6]);

    Algorithm.mutate(sample, new SeededRandom(3), 1);

    expect(sample.isValidPermutation([1, 2, 3, 4, 5, 6])).toBe(true);
  });

  it.each(mutationMethods)("keeps valid permutations with %s mutation", (mutationMethod) => {
    const sample = Sample.fromRoute([1, 2, 3, 4, 5, 6]);

    Algorithm.mutate(sample, new SeededRandom(3), 1, mutationMethod);

    expect(sample.isValidPermutation([1, 2, 3, 4, 5, 6])).toBe(true);
  });
});

describe("fitness", () => {
  it("includes the return edge to the starting city", () => {
    const distances = [
      [0, 10, 20],
      [10, 0, 30],
      [20, 30, 0]
    ];
    const sample = Sample.fromRoute([1, 2, 3]);
    const calculator = new FitnessCalculator(distances);

    expect(calculator.calculateTotalDistance(sample)).toBe(60);
  });
});

describe("config validation", () => {
  it("defaults to the random seed sentinel", () => {
    expect(defaultConfig.seed).toBe(-1);
  });

  it("rejects invalid values", () => {
    const invalid: GAConfig = {
      ...defaultConfig,
      populationSize: 4,
      eliteCount: 4
    };

    expect(() => validateConfig(invalid)).toThrow("eliteCount");
  });

  it("allows -1 as the random seed sentinel", () => {
    expect(() => validateConfig({ ...defaultConfig, seed: -1 })).not.toThrow();
  });

  it("validates tournament size only when tournament selection is used", () => {
    const rouletteConfig: GAConfig = {
      ...defaultConfig,
      tournamentSize: 0
    };

    expect(() => validateConfig(rouletteConfig, "roulette")).not.toThrow();
    expect(() => validateConfig(rouletteConfig, "tournament")).toThrow("tournamentSize");
  });

  it("rejects mutation rates outside the 0 to 1 range", () => {
    expect(() => validateConfig({ ...defaultConfig, mutationRate: 1.1 })).toThrow("mutationRate");
  });
});

describe("solver", () => {
  it("returns a valid roulette route", () => {
    const data = loadFixtureData();
    const result = new Algorithm(
      data.cities,
      data.distances,
      { ...defaultConfig, generations: 20, populationSize: 50, crossoverCount: 30, seed: 42 },
      "roulette"
    ).run(data.minimalTourLength);

    expect(result.routeIsValid).toBe(true);
    expect(result.bestSample.route).toHaveLength(42);
    expect(result.bestSample.totalDistance).toBeGreaterThan(0);
  });

  it("returns a valid tournament route", () => {
    const data = loadFixtureData();
    const result = new Algorithm(
      data.cities,
      data.distances,
      { ...defaultConfig, generations: 20, populationSize: 50, crossoverCount: 30, seed: 43 },
      "tournament"
    ).run(data.minimalTourLength);

    expect(result.routeIsValid).toBe(true);
    expect(result.bestSample.route).toHaveLength(42);
    expect(result.bestSample.totalDistance).toBeGreaterThan(0);
  });

  it.each(algorithmTypes)("returns a valid small route with the %s algorithm", (algorithmType) => {
    const result = new Algorithm(
      smallTspData.cities,
      smallTspData.distances,
      {
        ...defaultConfig,
        algorithmType,
        generations: 8,
        populationSize: 10,
        crossoverCount: 6,
        eliteCount: 1,
        localSearchCount: 1,
        tournamentSize: 2,
        mutationRate: 0.35,
        seed: 31
      },
      "tournament"
    ).run(smallTspData.minimalTourLength);

    expect(result.routeIsValid).toBe(true);
    expect(result.bestSample.route).toHaveLength(smallTspData.cities.length);
    expect(result.bestSample.totalDistance).toBeGreaterThan(0);
  });

  it.each(algorithmTypes)("returns a valid Dantzig route with the %s algorithm", (algorithmType) => {
    const data = loadFixtureData();
    const result = new Algorithm(
      data.cities,
      data.distances,
      {
        ...defaultConfig,
        algorithmType,
        generations: 5,
        populationSize: 30,
        crossoverCount: 12,
        eliteCount: 2,
        localSearchCount: 1,
        tournamentSize: 3,
        mutationRate: 0.2,
        seed: 37
      },
      "tournament"
    ).run(data.minimalTourLength);

    expect(result.routeIsValid).toBe(true);
    expect(result.bestSample.route).toHaveLength(42);
    expect(result.bestSample.totalDistance).toBeGreaterThan(0);
  });

  it("reports progressive percent from generation count", async () => {
    const snapshots: GAProgressSnapshot[] = [];

    await new Algorithm(
      smallTspData.cities,
      smallTspData.distances,
      {
        ...defaultConfig,
        generations: 1000,
        populationSize: 8,
        crossoverCount: 4,
        eliteCount: 1,
        tournamentSize: 2,
        mutationRate: 0.15,
        seed: 17
      },
      "tournament"
    ).runProgressive(smallTspData.minimalTourLength, {
      yieldEvery: 1001,
      onProgress: (snapshot) => {
        snapshots.push(snapshot);
      }
    });

    expect(snapshots).toHaveLength(1001);
    expect(calculateGenerationPercent(10, 1000)).toBe(1);
    expect(snapshots[10].generation).toBe(10);
    expect(snapshots[10].percent).toBe(1);
    expect(snapshots.at(-1)?.percent).toBe(100);
    expect(snapshots.every((snapshot, index) => index === 0 || snapshot.percent >= snapshots[index - 1].percent)).toBe(
      true
    );
  });

  it("emits a valid generation route for every progressive snapshot", async () => {
    const snapshots: GAProgressSnapshot[] = [];

    await new Algorithm(
      smallTspData.cities,
      smallTspData.distances,
      {
        ...defaultConfig,
        generations: 12,
        populationSize: 8,
        crossoverCount: 4,
        eliteCount: 1,
        tournamentSize: 2,
        mutationRate: 0.35,
        seed: 23
      },
      "tournament"
    ).runProgressive(smallTspData.minimalTourLength, {
      yieldEvery: 20,
      onProgress: (snapshot) => {
        snapshots.push(snapshot);
      }
    });

    expect(snapshots).toHaveLength(13);
    expect(
      snapshots.every(
        (snapshot) =>
          snapshot.routeIsValid &&
          snapshot.currentGenerationRoute.length === smallTspData.cities.length &&
          snapshot.bestRoute.length === smallTspData.cities.length &&
          snapshot.bestDistance <= snapshot.currentGenerationDistance &&
          [...snapshot.currentGenerationRoute].sort((left, right) => left - right).join(",") ===
            smallTspData.cities.join(",") &&
          [...snapshot.bestRoute].sort((left, right) => left - right).join(",") === smallTspData.cities.join(",")
      )
    ).toBe(true);
    expect(
      snapshots.every((snapshot, index) => index === 0 || snapshot.bestDistance <= snapshots[index - 1].bestDistance)
    ).toBe(true);
  });

  it("keeps the overall best route separate from the current generation route", async () => {
    const data = loadFixtureData();
    let foundRun: { resultDistance: number; finalSnapshot: GAProgressSnapshot } | null = null;

    for (let seed = 1; seed <= 80 && foundRun === null; seed += 1) {
      const snapshots: GAProgressSnapshot[] = [];
      const result = await new Algorithm(
        data.cities,
        data.distances,
        {
          ...defaultConfig,
          algorithmType: "simple",
          generations: 30,
          populationSize: 18,
          crossoverCount: 8,
          eliteCount: 0,
          localSearchCount: 0,
          tournamentSize: 3,
          mutationRate: 0.75,
          seed
        },
        "tournament"
      ).runProgressive(data.minimalTourLength, {
        yieldEvery: 1000,
        onProgress: (snapshot) => {
          snapshots.push(snapshot);
        }
      });
      const finalSnapshot = snapshots.at(-1);

      if (
        result &&
        finalSnapshot &&
        finalSnapshot.bestDistance < finalSnapshot.currentGenerationDistance &&
        finalSnapshot.bestRoute.join(",") !== finalSnapshot.currentGenerationRoute.join(",")
      ) {
        foundRun = {
          resultDistance: result.bestSample.totalDistance,
          finalSnapshot
        };
      }
    }

    expect(foundRun).not.toBeNull();
    if (!foundRun) {
      throw new Error("Expected to find a run where the final generation was worse than the best-so-far route.");
    }
    expect(foundRun.finalSnapshot.bestDistance).toBeLessThan(foundRun.finalSnapshot.currentGenerationDistance);
    expect(foundRun.finalSnapshot.bestRoute).not.toEqual(foundRun.finalSnapshot.currentGenerationRoute);
    expect(foundRun.resultDistance).toBe(foundRun.finalSnapshot.bestDistance);
  });
});
