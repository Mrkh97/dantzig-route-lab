import { Clipboard, Download } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RouteSequenceProps {
  route: number[];
}

export function RouteSequence({ route }: RouteSequenceProps): ReactElement {
  const routeText = route.length > 0 ? [...route, route[0]].join(" ") : "";
  const title =
    route.length > 0
      ? `Best route (${route[0]} → ${route[route.length - 1]} → ${route[0]})`
      : "Best route";

  async function copyRoute(): Promise<void> {
    if (routeText && navigator.clipboard) {
      await navigator.clipboard.writeText(routeText);
    }
  }

  return (
    <Card size="sm" className="rounded-lg shadow-none">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <CardAction className="flex gap-2">
          <Button type="button" variant="outline" size="icon-sm" disabled={!routeText} onClick={() => void copyRoute()} aria-label="Copy route">
            <Clipboard data-icon="inline-start" />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" disabled={!routeText} aria-label="Download route">
            <Download data-icon="inline-start" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4">
        {route.length === 0 ? (
          <p className="text-sm text-muted-foreground">Run the solver to stream the current best route.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[...route, route[0]].map((city, index) => (
              <span
                className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-background px-1.5 text-xs tabular-nums"
                key={`${city}-${index}`}
              >
                {city}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
