export function calculateGenerationPercent(generation: number, totalGenerations: number): number {
  if (totalGenerations <= 0) {
    return 100;
  }

  return clamp((generation / totalGenerations) * 100, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
