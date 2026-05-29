export type SelectionType = "roulette" | "tournament";
export type AlgorithmType = "simple" | "elitist" | "steady-state" | "memetic";
export type MutationMethod = "swap" | "inversion" | "insertion" | "scramble";

export interface GeneModel {
  city: number;
}

export interface SampleSnapshot {
  sampleId: number;
  route: number[];
  fitness: number;
  normalizedFitness: number;
  totalDistance: number;
}

export interface GAConfig {
  algorithmType: AlgorithmType;
  populationSize: number;
  generations: number;
  crossoverCount: number;
  mutationMethod: MutationMethod;
  mutationRate: number;
  eliteCount: number;
  localSearchCount: number;
  tournamentSize: number;
  seed: number | null;
}

export interface TSPData {
  cities: number[];
  coordinates: Record<number, [number, number]>;
  distances: number[][];
  minimalTourLength: number | null;
}

export interface GenerationSnapshot {
  generation: number;
  bestDistance: number;
  averageDistance: number;
}

export interface GAResult {
  selection: SelectionType;
  bestSample: SampleSnapshot;
  generations: number;
  referenceDistance: number | null;
  referenceDifference: number | null;
  history: GenerationSnapshot[];
  routeIsValid: boolean;
}

export interface GAProgressSnapshot extends GenerationSnapshot {
  totalGenerations: number;
  percent: number;
  currentGenerationRoute: number[];
  bestRoute: number[];
  routeIsValid: boolean;
}

export const defaultConfig: GAConfig = {
  algorithmType: "elitist",
  populationSize: 150,
  generations: 1000,
  crossoverCount: 100,
  mutationMethod: "swap",
  mutationRate: 0.05,
  eliteCount: 4,
  localSearchCount: 2,
  tournamentSize: 5,
  seed: -1
};
