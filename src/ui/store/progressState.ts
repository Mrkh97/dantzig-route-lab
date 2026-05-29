import { calculateGenerationPercent } from "@/lib/tsp/progress";
import type { GAProgressSnapshot, GAResult } from "@/lib/tsp/types";

export function createInitialProgress(totalGenerations: number): GAProgressSnapshot {
  const normalizedTotal = Math.max(0, totalGenerations);

  return {
    generation: 0,
    totalGenerations: normalizedTotal,
    percent: 0,
    bestDistance: 0,
    currentGenerationDistance: 0,
    averageDistance: 0,
    currentGenerationRoute: [],
    bestRoute: [],
    routeIsValid: false
  };
}

export function progressFromResult(result: GAResult): GAProgressSnapshot {
  const latest = result.history[result.history.length - 1];

  return {
    generation: result.generations,
    totalGenerations: result.generations,
    percent: calculateGenerationPercent(result.generations, result.generations),
    bestDistance: latest?.bestDistance ?? result.bestSample.totalDistance,
    currentGenerationDistance: latest?.currentGenerationDistance ?? result.bestSample.totalDistance,
    averageDistance: latest?.averageDistance ?? result.bestSample.totalDistance,
    currentGenerationRoute: result.bestSample.route,
    bestRoute: result.bestSample.route,
    routeIsValid: result.routeIsValid
  };
}

export function normalizeRunProgress(
  progress: GAProgressSnapshot,
  previous: GAProgressSnapshot | null
): GAProgressSnapshot {
  const totalGenerations = Math.max(0, progress.totalGenerations);
  const generation = Math.min(Math.max(0, progress.generation), totalGenerations);
  const currentGenerationRoute =
    progress.currentGenerationRoute.length > 0 ? progress.currentGenerationRoute : progress.bestRoute;
  const bestRoute = progress.bestRoute.length > 0 ? progress.bestRoute : currentGenerationRoute;
  const normalized = {
    ...progress,
    generation,
    totalGenerations,
    percent: calculateGenerationPercent(generation, totalGenerations),
    currentGenerationRoute,
    bestRoute
  };

  if (!previous) {
    return normalized;
  }
  if (totalGenerations !== previous.totalGenerations) {
    return previous;
  }
  if (normalized.generation < previous.generation || normalized.percent < previous.percent) {
    return previous;
  }

  return normalized;
}
