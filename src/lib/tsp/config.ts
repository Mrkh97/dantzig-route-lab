import { z } from "zod";

import type { GAConfig, SelectionType } from "./types.js";

const algorithmTypes = ["simple", "elitist", "steady-state", "memetic"] as const;
const mutationMethods = ["swap", "inversion", "insertion", "scramble"] as const;
const selectionTypes = new Set<SelectionType>(["roulette", "tournament"]);

const configSchema = z.object({
  algorithmType: z.enum(algorithmTypes),
  populationSize: z.number().int().nonnegative(),
  generations: z.number().int().nonnegative(),
  crossoverCount: z.number().int().nonnegative(),
  mutationMethod: z.enum(mutationMethods),
  mutationRate: z.number().min(0).max(1),
  eliteCount: z.number().int().nonnegative(),
  localSearchCount: z.number().int().nonnegative(),
  tournamentSize: z.number().int().nonnegative(),
  seed: z.number().int().min(-1).nullable()
});

export function validateConfig(config: GAConfig, selection: SelectionType = "tournament"): void {
  if (!selectionTypes.has(selection)) {
    throw new Error("selection must be a supported selection method.");
  }

  const result = buildConfigSchema(selection).safeParse(config);
  if (!result.success) {
    throw new Error(formatConfigIssue(result.error.issues[0]));
  }
}

function buildConfigSchema(selection: SelectionType) {
  return configSchema
    .refine((config) => config.populationSize >= 2, {
      message: "populationSize must be at least 2.",
      path: ["populationSize"]
    })
    .refine((config) => config.generations >= 1, {
      message: "generations must be at least 1.",
      path: ["generations"]
    })
    .refine((config) => config.crossoverCount >= 1, {
      message: "crossoverCount must be at least 1.",
      path: ["crossoverCount"]
    })
    .refine(
      (config) =>
        (config.algorithmType !== "elitist" && config.algorithmType !== "memetic") ||
        config.eliteCount < config.populationSize,
      {
        message: "eliteCount must be smaller than populationSize.",
        path: ["eliteCount"]
      }
    )
    .refine(
      (config) => config.algorithmType !== "memetic" || config.localSearchCount <= config.populationSize,
      {
        message: "localSearchCount must be between 0 and populationSize.",
        path: ["localSearchCount"]
      }
    )
    .refine(
      (config) =>
        selection !== "tournament" ||
        (config.tournamentSize >= 1 && config.tournamentSize <= config.populationSize),
      {
        message: "tournamentSize must be between 1 and populationSize.",
        path: ["tournamentSize"]
      }
    );
}

function formatConfigIssue(issue: { message: string; path: PropertyKey[] } | undefined): string {
  if (!issue) {
    return "Invalid genetic algorithm config.";
  }

  const field = issue.path[0];
  return typeof field === "string" && !issue.message.includes(field)
    ? `${field}: ${issue.message}`
    : issue.message;
}
