import { Box, HelpCircle, Play, RotateCcw, Square } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_RANDOM_SEED } from "@/lib/tsp/random";
import type { AlgorithmType, GAConfig, MutationMethod, SelectionType } from "@/lib/tsp/types";

interface ControlPanelProps {
  config: GAConfig;
  selection: SelectionType;
  disabled: boolean;
  canRun: boolean;
  running: boolean;
  onConfigChange: (patch: Partial<GAConfig>) => void;
  onSelectionChange: (selection: SelectionType) => void;
  onRun: () => void;
  onCancel: () => void;
  onReset: () => void;
}

type NumberFieldKey =
  | "seed"
  | "generations"
  | "populationSize"
  | "crossoverCount"
  | "eliteCount"
  | "localSearchCount"
  | "tournamentSize"
  | "mutationRate";

interface NumberField {
  key: NumberFieldKey;
  label: string;
  min: number;
  max: number;
  step: number;
  help: string;
}

const algorithmLabels: Record<AlgorithmType, string> = {
  simple: "Simple",
  elitist: "Elitist",
  "steady-state": "Steady",
  memetic: "Memetic"
};

const mutationLabels: Record<MutationMethod, string> = {
  swap: "Swap",
  inversion: "Inversion",
  insertion: "Insertion",
  scramble: "Scramble"
};

export function ControlPanel({
  config,
  selection,
  disabled,
  canRun,
  running,
  onConfigChange,
  onSelectionChange,
  onRun,
  onCancel,
  onReset
}: ControlPanelProps): ReactElement {
  function updateField(key: NumberFieldKey, value: string): void {
    const parsed = key === "seed" ? parseSeedValue(value) : Number(value);
    onConfigChange({ [key]: parsed } as Partial<GAConfig>);
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Field className="flex flex-col gap-2">
          <FieldLabel className="flex items-center gap-1 text-sm font-normal text-foreground">
            Algorithm <Info text="The population replacement strategy used by the solver." />
          </FieldLabel>
          <Tabs
            value={config.algorithmType}
            onValueChange={(value) => onConfigChange({ algorithmType: value as AlgorithmType })}
          >
            <TabsList>
              {(Object.keys(algorithmLabels) as AlgorithmType[]).map((algorithmType) => (
                <TabsTrigger key={algorithmType} value={algorithmType} disabled={disabled}>
                  {algorithmLabels[algorithmType]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </Field>

        <Field className="grid grid-cols-[170px_1fr] items-center gap-4">
          <FieldLabel className="flex items-center gap-1 text-sm font-normal text-foreground">
            Selection method <Info text="The parent selection strategy used by the genetic algorithm." />
          </FieldLabel>
          <Select
            value={selection}
            disabled={disabled}
            onValueChange={(value) => onSelectionChange(value as SelectionType)}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="tournament">Tournament</SelectItem>
                <SelectItem value="roulette">Roulette</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field className="grid grid-cols-[170px_1fr] items-center gap-4">
          <FieldLabel className="flex items-center gap-1 text-sm font-normal text-foreground">
            Mutation method <Info text="The route mutation operator applied after crossover." />
          </FieldLabel>
          <Select
            value={config.mutationMethod}
            disabled={disabled}
            onValueChange={(value) => onConfigChange({ mutationMethod: value as MutationMethod })}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(Object.keys(mutationLabels) as MutationMethod[]).map((mutationMethod) => (
                  <SelectItem key={mutationMethod} value={mutationMethod}>
                    {mutationLabels[mutationMethod]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {getVisibleFields(config.algorithmType, selection).map((field) => (
          <Field className="grid grid-cols-[170px_1fr] items-center gap-4" key={field.key}>
            <FieldLabel htmlFor={field.key} className="flex items-center gap-1 text-sm font-normal text-foreground">
              {field.label} <Info text={field.help} />
            </FieldLabel>
            <Input
              id={field.key}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={formatFieldValue(config, field.key)}
              disabled={disabled}
              onChange={(event) => updateField(field.key, event.target.value)}
              className="h-10"
            />
          </Field>
        ))}
      </FieldGroup>

      <div className="mt-1 grid grid-cols-[1fr_52px] gap-3">
        <Button type="button" size="lg" disabled={!canRun} onClick={onRun}>
          <Play data-icon="inline-start" />
          Run solver
        </Button>
        <Button type="button" variant="outline" size="icon-lg" disabled={!running} onClick={onCancel} aria-label="Cancel run">
          {running ? <Square data-icon="inline-start" /> : <Box data-icon="inline-start" />}
        </Button>
      </div>

      <Button type="button" variant="outline" size="lg" disabled={disabled} onClick={onReset}>
        <RotateCcw data-icon="inline-start" />
        Reset to defaults
      </Button>
    </div>
  );
}

function getVisibleFields(algorithmType: AlgorithmType, selection: SelectionType): NumberField[] {
  const fields: NumberField[] = [
    {
      key: "seed",
      label: "Random seed",
      min: -1,
      max: MAX_RANDOM_SEED,
      step: 1,
      help: "Use -1 to generate and save a random seed; copy a recent-run seed to reproduce it."
    },
    { key: "generations", label: "Generations", min: 1, max: 50000, step: 100, help: "Total evolution passes." },
    {
      key: "populationSize",
      label: "Population size",
      min: 2,
      max: 2000,
      step: 10,
      help: "Candidate tours per generation."
    },
    {
      key: "crossoverCount",
      label: algorithmType === "steady-state" ? "Replacements / generation" : "Crossover pairs",
      min: 1,
      max: 2000,
      step: 10,
      help:
        algorithmType === "steady-state"
          ? "Maximum offspring considered for replacing the weakest routes each generation."
          : "Maximum parent pair crossover attempts."
    },
    {
      key: "mutationRate",
      label: "Mutation rate",
      min: 0,
      max: 1,
      step: 0.001,
      help: "Probability that a child route receives the selected mutation."
    }
  ];

  if (algorithmType === "elitist" || algorithmType === "memetic") {
    fields.push({
      key: "eliteCount",
      label: "Elite count",
      min: 0,
      max: 100,
      step: 1,
      help: "Top routes copied into the next generation."
    });
  }

  if (algorithmType === "memetic") {
    fields.push({
      key: "localSearchCount",
      label: "2-opt refined tours",
      min: 0,
      max: 100,
      step: 1,
      help: "Best routes that receive one bounded 2-opt improvement pass each generation."
    });
  }

  if (selection === "tournament") {
    fields.push({
      key: "tournamentSize",
      label: "Tournament size",
      min: 1,
      max: 500,
      step: 1,
      help: "Number of contestants when tournament selection is used."
    });
  }

  return fields;
}

function parseSeedValue(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

function formatFieldValue(config: GAConfig, key: NumberFieldKey): number | string {
  return config[key] ?? "";
}

function Info({ text }: { text: string }): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="size-3.5 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
