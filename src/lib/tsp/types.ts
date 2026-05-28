export type SelectionType = "roulette" | "tournament";

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
  populationSize: number;
  generations: number;
  crossoverCount: number;
  mutationRate: number;
  eliteCount: number;
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
  populationSize: 150,
  generations: 1000,
  crossoverCount: 100,
  mutationRate: 0.05,
  eliteCount: 4,
  tournamentSize: 5,
  seed: 42
};
