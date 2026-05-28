import type { SampleSnapshot } from "./types.js";

export class Sample {
  public sampleId = -1;
  public fitness = 0;
  public normalizedFitness = 0;
  public totalDistance = Number.POSITIVE_INFINITY;

  constructor(public genes: { city: number }[]) {}

  get route(): number[] {
    return this.genes.map((gene) => gene.city);
  }

  static fromRoute(route: readonly number[]): Sample {
    return new Sample(route.map((city) => ({ city })));
  }

  copy(): Sample {
    const copied = Sample.fromRoute(this.route);
    copied.sampleId = this.sampleId;
    copied.fitness = this.fitness;
    copied.normalizedFitness = this.normalizedFitness;
    copied.totalDistance = this.totalDistance;
    return copied;
  }

  isValidPermutation(expectedCities: readonly number[]): boolean {
    const route = [...this.route].sort((left, right) => left - right);
    const expected = [...expectedCities].sort((left, right) => left - right);
    return route.length === expected.length && route.every((city, index) => city === expected[index]);
  }

  toSnapshot(): SampleSnapshot {
    return {
      sampleId: this.sampleId,
      route: this.route,
      fitness: this.fitness,
      normalizedFitness: this.normalizedFitness,
      totalDistance: this.totalDistance
    };
  }
}

export class Population {
  public samples: Sample[] = [];
  public nextSampleId = 0;

  addSample(sample: Sample): void {
    const added = sample.copy();
    added.sampleId = this.nextSampleId;
    this.nextSampleId += 1;
    this.samples.push(added);
  }

  extend(samples: readonly Sample[]): void {
    for (const sample of samples) {
      this.addSample(sample);
    }
  }

  sortByFitness(): void {
    this.samples.sort((left, right) => right.fitness - left.fitness);
  }

  getFittest(): Sample {
    if (this.samples.length === 0) {
      throw new Error("Population is empty.");
    }
    this.sortByFitness();
    return this.samples[0];
  }

  trim(maxSize: number): void {
    this.sortByFitness();
    this.samples.splice(maxSize);
  }
}
