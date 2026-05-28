import { BarChart3, Download, Eye, Trash2 } from "lucide-react";
import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { HistoryEntry } from "@/ui/store/solverStore";

interface RunHistoryProps {
  history: HistoryEntry[];
}

interface DisplayRow {
  id: string;
  timestamp: string;
  seed: string;
  generations: string;
  population: string;
  bestDistance: string;
  difference: string;
  differenceTone: "neutral" | "bad";
  status: string;
  routeValid: boolean;
}

const sampleRows: DisplayRow[] = [
  {
    id: "#20240524-153012",
    timestamp: "May 24, 2024 15:30:12",
    seed: "20240524",
    generations: "10000",
    population: "500",
    bestDistance: "699",
    difference: "0 (0.00%)",
    differenceTone: "neutral",
    status: "Completed",
    routeValid: true
  },
  {
    id: "#20240524-142259",
    timestamp: "May 24, 2024 14:22:59",
    seed: "987654",
    generations: "10000",
    population: "500",
    bestDistance: "701",
    difference: "2 (0.29%)",
    differenceTone: "bad",
    status: "Completed",
    routeValid: true
  },
  {
    id: "#20240524-131045",
    timestamp: "May 24, 2024 13:10:45",
    seed: "555123",
    generations: "10000",
    population: "500",
    bestDistance: "704",
    difference: "5 (0.72%)",
    differenceTone: "bad",
    status: "Completed",
    routeValid: true
  }
];

export function RunHistory({ history }: RunHistoryProps): ReactElement {
  const rows = history.length > 0 ? history.map(toDisplayRow) : sampleRows;

  return (
    <Card className="rounded-lg py-0 shadow-none">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="text-base font-semibold">Recent runs</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/45 hover:bg-muted/45">
              <TableHead className="w-[180px] pl-5 text-xs">Run ID</TableHead>
              <TableHead className="text-xs">Timestamp</TableHead>
              <TableHead className="text-xs">Seed</TableHead>
              <TableHead className="text-xs">Generations</TableHead>
              <TableHead className="text-xs">Population</TableHead>
              <TableHead className="text-xs">Best distance</TableHead>
              <TableHead className="text-xs">Difference</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Route valid</TableHead>
              <TableHead className="w-[150px] text-right text-xs"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-5 text-xs">{row.id}</TableCell>
                <TableCell className="text-xs">{row.timestamp}</TableCell>
                <TableCell className="text-xs">{row.seed}</TableCell>
                <TableCell className="text-xs">{row.generations}</TableCell>
                <TableCell className="text-xs">{row.population}</TableCell>
                <TableCell className="text-xs text-primary">{row.bestDistance}</TableCell>
                <TableCell className={row.differenceTone === "bad" ? "text-xs text-destructive" : "text-xs text-chart-2"}>
                  {row.difference}
                </TableCell>
                <TableCell className="text-xs">{row.status}</TableCell>
                <TableCell className="text-xs">
                  <Badge variant="secondary" className={row.routeValid ? "text-chart-2" : "text-muted-foreground"}>
                    {row.routeValid ? "Valid" : "Invalid"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-5">
                  <div className="flex justify-end gap-1.5">
                    <HistoryAction label="View run" icon={<Eye data-icon="inline-start" />} />
                    <HistoryAction label="Show chart" icon={<BarChart3 data-icon="inline-start" />} />
                    <HistoryAction label="Download run" icon={<Download data-icon="inline-start" />} />
                    <HistoryAction label="Delete run" icon={<Trash2 data-icon="inline-start" />} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function HistoryAction({ label, icon }: { label: string; icon: ReactElement }): ReactElement {
  return (
    <Button type="button" variant="outline" size="icon-xs" aria-label={label}>
      {icon}
    </Button>
  );
}

function toDisplayRow(entry: HistoryEntry): DisplayRow {
  const difference = entry.result.referenceDifference;
  const reference = entry.result.referenceDistance;
  const differencePercent = difference !== null && reference ? (difference / reference) * 100 : null;

  return {
    id: entry.id,
    timestamp: entry.createdAt,
    seed: String(entry.config.seed ?? "random"),
    generations: entry.config.generations.toLocaleString(),
    population: entry.config.populationSize.toLocaleString(),
    bestDistance: Math.round(entry.result.bestSample.totalDistance).toLocaleString(),
    difference:
      difference === null
        ? "n/a"
        : `${difference.toLocaleString()} (${differencePercent === null ? "0.00" : differencePercent.toFixed(2)}%)`,
    differenceTone: difference !== null && difference > 0 ? "bad" : "neutral",
    status: "Completed",
    routeValid: entry.result.routeIsValid
  };
}
