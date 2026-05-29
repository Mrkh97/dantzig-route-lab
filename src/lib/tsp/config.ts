import type { AlgorithmType, GAConfig, MutationMethod, SelectionType } from "./types.js";

const algorithmTypes = new Set<AlgorithmType>(["simple", "elitist", "steady-state", "memetic"]);
const mutationMethods = new Set<MutationMethod>(["swap", "inversion", "insertion", "scramble"]);

export function validateConfig(config: GAConfig, selection: SelectionType = "tournament"): void {
  const integerFields: Array<[keyof GAConfig, number]> = [
    ["populationSize", config.populationSize],
    ["generations", config.generations],
    ["crossoverCount", config.crossoverCount]
  ];

  if (config.algorithmType === "elitist" || config.algorithmType === "memetic") {
    integerFields.push(["eliteCount", config.eliteCount]);
  }

  if (config.algorithmType === "memetic") {
    integerFields.push(["localSearchCount", config.localSearchCount]);
  }

  if (selection === "tournament") {
    integerFields.push(["tournamentSize", config.tournamentSize]);
  }

  for (const [field, value] of integerFields) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${field} must be a non-negative integer.`);
    }
  }

  if (!algorithmTypes.has(config.algorithmType)) {
    throw new Error("algorithmType must be a supported algorithm.");
  }
  if (!mutationMethods.has(config.mutationMethod)) {
    throw new Error("mutationMethod must be a supported mutation method.");
  }
  if (config.populationSize < 2) {
    throw new Error("populationSize must be at least 2.");
  }
  if (config.generations < 1) {
    throw new Error("generations must be at least 1.");
  }
  if (config.crossoverCount < 1) {
    throw new Error("crossoverCount must be at least 1.");
  }
  if (
    (config.algorithmType === "elitist" || config.algorithmType === "memetic") &&
    config.eliteCount >= config.populationSize
  ) {
    throw new Error("eliteCount must be smaller than populationSize.");
  }
  if (config.algorithmType === "memetic" && config.localSearchCount > config.populationSize) {
    throw new Error("localSearchCount must be between 0 and populationSize.");
  }
  if (selection === "tournament" && (config.tournamentSize < 1 || config.tournamentSize > config.populationSize)) {
    throw new Error("tournamentSize must be between 1 and populationSize.");
  }
  if (!Number.isFinite(config.mutationRate) || config.mutationRate < 0 || config.mutationRate > 1) {
    throw new Error("mutationRate must be between 0 and 1.");
  }
  if (config.seed !== null && (!Number.isInteger(config.seed) || config.seed < -1)) {
    throw new Error("seed must be an integer, -1, or null.");
  }
}
