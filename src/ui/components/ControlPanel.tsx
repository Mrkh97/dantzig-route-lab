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
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GAConfig, SelectionType } from "@/lib/tsp/types";

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

const fields: Array<{
  key: keyof Omit<GAConfig, "mutationRate">;
  label: string;
  min: number;
  max: number;
  step: number;
  help: string;
}> = [
  {
    key: "seed",
    label: "Random seed",
    min: -1,
    max: 99999999,
    step: 1,
    help: "Use -1 for a random seed; use the same positive seed to reproduce a run."
  },
  { key: "generations", label: "Generations", min: 1, max: 50000, step: 100, help: "Total evolution passes." },
  { key: "populationSize", label: "Population size", min: 2, max: 2000, step: 10, help: "Candidate tours per generation." },
  {
    key: "crossoverCount",
    label: "Crossover (offspring count)",
    min: 1,
    max: 2000,
    step: 10,
    help: "Maximum parent pair crossover attempts."
  },
  { key: "eliteCount", label: "Elite count", min: 0, max: 100, step: 1, help: "Top routes copied into the next generation." },
  {
    key: "tournamentSize",
    label: "Tournament size",
    min: 1,
    max: 500,
    step: 1,
    help: "Number of contestants when tournament selection is used."
  }
];

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
  function updateField(key: keyof GAConfig, value: string): void {
    const parsed = key === "seed" ? parseSeedValue(value) : Number(value);
    onConfigChange({ [key]: parsed } as Partial<GAConfig>);
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
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

        {fields.map((field) => (
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
              value={field.key === "seed" ? formatSeedValue(config.seed) : config[field.key] ?? ""}
              disabled={disabled}
              onChange={(event) => updateField(field.key, event.target.value)}
              className="h-10"
            />
          </Field>
        ))}

        <Field className="grid grid-cols-[170px_1fr] items-start gap-4">
          <FieldLabel className="mt-1 flex items-center gap-1 text-sm font-normal text-foreground">
            Mutation rate <Info text="Probability that a child route receives a city swap mutation." />
          </FieldLabel>
          <div className="flex flex-col gap-2">
            <div className="text-right text-sm text-foreground">{config.mutationRate.toFixed(3)}</div>
            <Slider
              min={0}
              max={0.5}
              step={0.001}
              value={[config.mutationRate]}
              disabled={disabled}
              onValueChange={([value]) => onConfigChange({ mutationRate: value })}
            />
            <div className="grid grid-cols-5 text-xs text-muted-foreground">
              <span>0</span>
              <span>0.001</span>
              <span>0.01</span>
              <span>0.1</span>
              <span className="text-right">0.5</span>
            </div>
          </div>
        </Field>
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

function parseSeedValue(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return parsed === -1 ? null : parsed;
}

function formatSeedValue(seed: number | null): number {
  return seed ?? -1;
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
