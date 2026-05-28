import type { Sample } from "./models.js";

export class FitnessCalculator {
  constructor(private readonly distanceMatrix: number[][]) {}

  calculateTotalDistance(sample: Sample): number {
    const route = sample.route;
    if (route.length < 2) {
      return 0;
    }

    let total = 0;
    for (let index = 0; index < route.length - 1; index += 1) {
      total += this.distanceMatrix[route[index] - 1][route[index + 1] - 1];
    }
    total += this.distanceMatrix[route[route.length - 1] - 1][route[0] - 1];
    return total;
  }

  calculateFitness(sample: Sample): void {
    const totalDistance = this.calculateTotalDistance(sample);
    sample.totalDistance = totalDistance;
    sample.fitness = totalDistance > 0 ? 1 / totalDistance : 0;
  }

  evaluate(samples: readonly Sample[]): void {
    for (const sample of samples) {
      this.calculateFitness(sample);
    }

    const fitnessSum = samples.reduce((sum, sample) => sum + sample.fitness, 0);
    if (fitnessSum === 0) {
      const normalizedFitness = samples.length === 0 ? 0 : 1 / samples.length;
      for (const sample of samples) {
        sample.normalizedFitness = normalizedFitness;
      }
      return;
    }

    for (const sample of samples) {
      sample.normalizedFitness = sample.fitness / fitnessSum;
    }
  }
}
