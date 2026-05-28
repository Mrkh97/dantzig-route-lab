import type { GAConfig } from "./types.js";

export function validateConfig(config: GAConfig): void {
  const integerFields: Array<[keyof GAConfig, number]> = [
    ["populationSize", config.populationSize],
    ["generations", config.generations],
    ["crossoverCount", config.crossoverCount],
    ["eliteCount", config.eliteCount],
    ["tournamentSize", config.tournamentSize]
  ];

  for (const [field, value] of integerFields) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${field} must be a non-negative integer.`);
    }
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
  if (config.eliteCount >= config.populationSize) {
    throw new Error("eliteCount must be smaller than populationSize.");
  }
  if (config.tournamentSize < 1 || config.tournamentSize > config.populationSize) {
    throw new Error("tournamentSize must be between 1 and populationSize.");
  }
  if (!Number.isFinite(config.mutationRate) || config.mutationRate < 0 || config.mutationRate > 1) {
    throw new Error("mutationRate must be between 0 and 1.");
  }
  if (config.seed !== null && (!Number.isInteger(config.seed) || config.seed < -1)) {
    throw new Error("seed must be an integer, -1, or null.");
  }
}
