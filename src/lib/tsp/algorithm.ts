import { validateConfig } from "./config.js";
import { FitnessCalculator } from "./fitness.js";
import { Population, Sample } from "./models.js";
import { calculateGenerationPercent } from "./progress.js";
import { SeededRandom } from "./random.js";
import type {
  GAConfig,
  GAProgressSnapshot,
  GAResult,
  GenerationSnapshot,
  MutationMethod,
  SelectionType
} from "./types.js";

interface ProgressiveRunOptions {
  onProgress?: (snapshot: GAProgressSnapshot) => void;
  shouldCancel?: () => boolean;
  yieldEvery?: number;
}

export class Algorithm {
  private readonly rng: SeededRandom;
  private readonly fitnessCalculator: FitnessCalculator;

  constructor(
    private readonly cities: number[],
    distances: number[][],
    private readonly config: GAConfig,
    private readonly selection: SelectionType
  ) {
    validateConfig(config, selection);
    this.rng = new SeededRandom(config.seed === -1 ? null : config.seed);
    this.fitnessCalculator = new FitnessCalculator(distances);
  }

  run(referenceDistance: number | null = null): GAResult {
    const population = createInitialPopulation(this.cities, this.config.populationSize, this.rng);
    const history: GenerationSnapshot[] = [];

    this.fitnessCalculator.evaluate(population.samples);
    population.sortByFitness();
    history.push(this.snapshotGeneration(0, population));

    for (let generation = 1; generation <= this.config.generations; generation += 1) {
      this.evolvePopulation(population);
      history.push(this.snapshotGeneration(generation, population));
    }

    return this.toResult(population, history, referenceDistance);
  }

  async runProgressive(
    referenceDistance: number | null = null,
    options: ProgressiveRunOptions = {}
  ): Promise<GAResult | null> {
    const population = createInitialPopulation(this.cities, this.config.populationSize, this.rng);
    const history: GenerationSnapshot[] = [];
    const yieldEvery = Math.max(1, options.yieldEvery ?? 25);

    this.fitnessCalculator.evaluate(population.samples);
    population.sortByFitness();
    history.push(this.snapshotGeneration(0, population));
    options.onProgress?.(this.snapshotProgress(0, population));

    for (let generation = 1; generation <= this.config.generations; generation += 1) {
      if (options.shouldCancel?.()) {
        return null;
      }

      this.evolvePopulation(population);
      history.push(this.snapshotGeneration(generation, population));
      options.onProgress?.(this.snapshotProgress(generation, population));

      if (generation % yieldEvery === 0) {
        await yieldToEventLoop();
      }
    }

    if (options.shouldCancel?.()) {
      return null;
    }

    return this.toResult(population, history, referenceDistance);
  }

  evolvePopulation(population: Population): void {
    this.fitnessCalculator.evaluate(population.samples);
    population.sortByFitness();

    if (this.config.algorithmType === "steady-state") {
      this.evolveSteadyState(population);
      return;
    }

    const eliteCount =
      this.config.algorithmType === "elitist" || this.config.algorithmType === "memetic"
        ? this.config.eliteCount
        : 0;
    this.evolveGenerational(population, eliteCount);

    if (this.config.algorithmType === "memetic") {
      this.applyLocalSearch(population);
    }
  }

  private evolveGenerational(population: Population, eliteCount: number): void {
    const nextGeneration = new Population();
    const elites = population.samples.slice(0, eliteCount).map((sample) => sample.copy());
    nextGeneration.extend(elites);

    let crossoverPairs = 0;
    while (
      nextGeneration.samples.length < this.config.populationSize &&
      crossoverPairs < this.config.crossoverCount
    ) {
      const [parent1, parent2] = this.selectParents(population);
      const [child1, child2] = Algorithm.pmxCrossover(parent1, parent2, this.rng);
      Algorithm.mutate(child1, this.rng, this.config.mutationRate, this.config.mutationMethod);
      Algorithm.mutate(child2, this.rng, this.config.mutationRate, this.config.mutationMethod);
      nextGeneration.addSample(child1);
      if (nextGeneration.samples.length < this.config.populationSize) {
        nextGeneration.addSample(child2);
      }
      crossoverPairs += 1;
    }

    while (nextGeneration.samples.length < this.config.populationSize) {
      const survivor = this.selectParents(population)[0].copy();
      Algorithm.mutate(survivor, this.rng, this.config.mutationRate, this.config.mutationMethod);
      nextGeneration.addSample(survivor);
    }

    this.fitnessCalculator.evaluate(nextGeneration.samples);
    nextGeneration.sortByFitness();
    population.samples = nextGeneration.samples;
    population.nextSampleId = nextGeneration.nextSampleId;
  }

  private evolveSteadyState(population: Population): void {
    const offspring: Sample[] = [];

    while (offspring.length < this.config.crossoverCount) {
      const [parent1, parent2] = this.selectParents(population);
      const [child1, child2] = Algorithm.pmxCrossover(parent1, parent2, this.rng);
      Algorithm.mutate(child1, this.rng, this.config.mutationRate, this.config.mutationMethod);
      Algorithm.mutate(child2, this.rng, this.config.mutationRate, this.config.mutationMethod);
      offspring.push(child1);
      if (offspring.length < this.config.crossoverCount) {
        offspring.push(child2);
      }
    }

    this.fitnessCalculator.evaluate(offspring);
    offspring.sort((left, right) => right.fitness - left.fitness);

    for (const child of offspring) {
      this.replaceWorstIfFitter(population, child);
    }
    this.fitnessCalculator.evaluate(population.samples);
    population.sortByFitness();
  }

  private replaceWorstIfFitter(population: Population, candidate: Sample): void {
    const worstIndex = population.samples.length - 1;
    const worst = population.samples[worstIndex];
    if (!worst || candidate.fitness <= worst.fitness) {
      return;
    }

    const replacement = candidate.copy();
    replacement.sampleId = population.nextSampleId;
    population.nextSampleId += 1;
    population.samples[worstIndex] = replacement;
    population.sortByFitness();
  }

  private applyLocalSearch(population: Population): void {
    const localSearchCount = Math.min(this.config.localSearchCount, population.samples.length);
    if (localSearchCount <= 0) {
      return;
    }

    for (let index = 0; index < localSearchCount; index += 1) {
      this.applyTwoOptPass(population.samples[index]);
    }

    this.fitnessCalculator.evaluate(population.samples);
    population.sortByFitness();
  }

  private applyTwoOptPass(sample: Sample): void {
    const improvedRoute = this.findBestTwoOptRoute(sample.route);
    if (!improvedRoute) {
      return;
    }

    sample.genes = improvedRoute.map((city) => ({ city }));
  }

  private findBestTwoOptRoute(route: number[]): number[] | null {
    if (route.length < 4) {
      return null;
    }

    let bestDistance = this.fitnessCalculator.calculateTotalDistance(Sample.fromRoute(route));
    let bestRoute: number[] | null = null;

    for (let start = 0; start < route.length - 1; start += 1) {
      for (let end = start + 1; end < route.length; end += 1) {
        const candidate = [
          ...route.slice(0, start),
          ...route.slice(start, end + 1).reverse(),
          ...route.slice(end + 1)
        ];
        const distance = this.fitnessCalculator.calculateTotalDistance(Sample.fromRoute(candidate));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestRoute = candidate;
        }
      }
    }

    return bestRoute;
  }

  selectParents(population: Population): [Sample, Sample] {
    if (this.selection === "roulette") {
      return [this.rouletteSelection(population), this.rouletteSelection(population)];
    }
    return [this.tournamentSelection(population), this.tournamentSelection(population)];
  }

  rouletteSelection(population: Population): Sample {
    const threshold = this.rng.random();
    let accumulated = 0;
    for (const sample of population.samples) {
      accumulated += sample.normalizedFitness;
      if (accumulated >= threshold) {
        return sample;
      }
    }
    return population.samples[population.samples.length - 1];
  }

  tournamentSelection(population: Population): Sample {
    const size = Math.min(this.config.tournamentSize, population.samples.length);
    const contestants = this.rng.sample(population.samples, size);
    return contestants.reduce((best, sample) => (sample.fitness > best.fitness ? sample : best));
  }

  static pmxCrossover(parent1: Sample, parent2: Sample, rng: SeededRandom): [Sample, Sample] {
    const route1 = parent1.route;
    const route2 = parent2.route;
    const size = route1.length;
    if (size !== route2.length) {
      throw new Error("Parents must have equal route lengths.");
    }
    if (size < 2) {
      return [parent1.copy(), parent2.copy()];
    }

    const [start, end] = rng.sample(
      Array.from({ length: size }, (_, index) => index),
      2
    ).sort((left, right) => left - right);

    const child1 = Algorithm.pmxChild(route1, route2, start, end);
    const child2 = Algorithm.pmxChild(route2, route1, start, end);
    return [Sample.fromRoute(child1), Sample.fromRoute(child2)];
  }

  static pmxChild(baseParent: number[], donorParent: number[], start: number, end: number): number[] {
    const child: Array<number | null> = Array.from({ length: baseParent.length }, () => null);
    for (let index = start; index <= end; index += 1) {
      child[index] = baseParent[index];
    }

    for (let index = start; index <= end; index += 1) {
      const donorCity = donorParent[index];
      if (child.includes(donorCity)) {
        continue;
      }

      let targetIndex = index;
      while (child[targetIndex] !== null) {
        const mappedCity = baseParent[targetIndex];
        targetIndex = donorParent.indexOf(mappedCity);
      }
      child[targetIndex] = donorCity;
    }

    for (let index = 0; index < child.length; index += 1) {
      if (child[index] === null) {
        child[index] = donorParent[index];
      }
    }

    if (child.some((city) => city === null)) {
      throw new Error("PMX crossover produced an incomplete child.");
    }

    return child as number[];
  }

  static mutate(
    sample: Sample,
    rng: SeededRandom,
    mutationRate: number,
    mutationMethod: MutationMethod = "swap"
  ): void {
    if (rng.random() >= mutationRate || sample.genes.length < 2) {
      return;
    }

    if (mutationMethod === "insertion") {
      Algorithm.insertMutation(sample, rng);
      return;
    }

    const [first, second] = Algorithm.sampleMutationRange(sample, rng);
    if (mutationMethod === "inversion") {
      sample.genes.splice(first, second - first + 1, ...sample.genes.slice(first, second + 1).reverse());
      return;
    }
    if (mutationMethod === "scramble") {
      const segment = sample.genes.slice(first, second + 1);
      rng.shuffle(segment);
      sample.genes.splice(first, second - first + 1, ...segment);
      return;
    }

    [sample.genes[first], sample.genes[second]] = [sample.genes[second], sample.genes[first]];
  }

  private static sampleMutationRange(sample: Sample, rng: SeededRandom): [number, number] {
    const [first, second] = rng
      .sample(
        Array.from({ length: sample.genes.length }, (_, index) => index),
        2
      )
      .sort((left, right) => left - right);
    return [first, second];
  }

  private static insertMutation(sample: Sample, rng: SeededRandom): void {
    const [from, to] = rng.sample(
      Array.from({ length: sample.genes.length }, (_, index) => index),
      2
    );
    const [gene] = sample.genes.splice(from, 1);
    sample.genes.splice(to, 0, gene);
  }

  private snapshotGeneration(generation: number, population: Population): GenerationSnapshot {
    const bestDistance = population.getFittest().totalDistance;
    const averageDistance =
      population.samples.reduce((sum, sample) => sum + sample.totalDistance, 0) /
      population.samples.length;

    return {
      generation,
      bestDistance,
      averageDistance
    };
  }

  private snapshotProgress(generation: number, population: Population): GAProgressSnapshot {
    const bestSample = population.getFittest();
    const snapshot = this.snapshotGeneration(generation, population);

    return {
      ...snapshot,
      totalGenerations: this.config.generations,
      percent: calculateGenerationPercent(generation, this.config.generations),
      currentGenerationRoute: bestSample.route,
      bestRoute: bestSample.route,
      routeIsValid: bestSample.isValidPermutation(this.cities)
    };
  }

  private toResult(
    population: Population,
    history: GenerationSnapshot[],
    referenceDistance: number | null
  ): GAResult {
    const bestSample = population.getFittest().copy();
    const referenceDifference =
      referenceDistance === null ? null : Math.round(bestSample.totalDistance - referenceDistance);

    return {
      selection: this.selection,
      bestSample: bestSample.toSnapshot(),
      generations: this.config.generations,
      referenceDistance,
      referenceDifference,
      history,
      routeIsValid: bestSample.isValidPermutation(this.cities)
    };
  }
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function createInitialPopulation(
  cities: readonly number[],
  populationSize: number,
  rng: SeededRandom
): Population {
  const population = new Population();
  for (let index = 0; index < populationSize; index += 1) {
    const route = [...cities];
    rng.shuffle(route);
    population.addSample(Sample.fromRoute(route));
  }
  return population;
}
