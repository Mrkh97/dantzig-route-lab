import type { TSPData } from "./types.js";

export interface DantzigDataText {
  cityData: string;
  intercityDistance: string;
  minimalTourLength?: string;
}

export function parseDantzigData(text: DantzigDataText): TSPData {
  const coordinates: Record<number, [number, number]> = {};
  for (const line of text.cityData.split(/\r?\n/)) {
    if (line.trim().length === 0) {
      continue;
    }
    const [city, xCoord, yCoord] = line.trim().split(/\s+/);
    coordinates[Number(city)] = [Number(xCoord), Number(yCoord)];
  }

  const distances = text.intercityDistance
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.trim().split(/\s+/).map(Number));

  let minimalTourLength: number | null = null;
  if (text.minimalTourLength) {
    const content = text.minimalTourLength.trim();
    if (content.length > 0) {
      minimalTourLength = Number(content);
    }
  }

  const cities = Object.keys(coordinates)
    .map(Number)
    .sort((left, right) => left - right);
  validateData(cities, distances);

  return {
    cities,
    coordinates,
    distances,
    minimalTourLength
  };
}

export async function loadDantzigData(basePath = "/data"): Promise<TSPData> {
  const [cityData, intercityDistance, minimalTourLength] = await Promise.all([
    fetchText(`${basePath}/cityData.txt`),
    fetchText(`${basePath}/intercityDistance.txt`),
    fetchText(`${basePath}/minimal-tour-length.txt`)
  ]);

  return parseDantzigData({
    cityData,
    intercityDistance,
    minimalTourLength
  });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.text();
}

export function validateData(cities: readonly number[], distances: readonly number[][]): void {
  const cityCount = cities.length;
  if (cityCount === 0) {
    throw new Error("No cities were loaded.");
  }

  const expectedCities = Array.from({ length: cityCount }, (_, index) => index + 1);
  if (!cities.every((city, index) => city === expectedCities[index])) {
    throw new Error("City ids must be consecutive and start from 1.");
  }

  if (distances.length !== cityCount) {
    throw new Error("Distance matrix row count does not match city count.");
  }

  if (distances.some((row) => row.length !== cityCount)) {
    throw new Error("Distance matrix must be square.");
  }
}
