# Dantzig Route Lab

Dantzig Route Lab is an interactive browser app for experimenting with genetic
algorithm approaches to the 42-city Dantzig traveling salesman problem dataset.
It visualizes the current route on a US context map while the solver runs, shows
generation progress, and keeps recent run metrics easy to compare.

Live version: https://drl.fastware.app/

## What it does

- Runs several genetic algorithm variants for the traveling salesman problem.
- Lets you tune algorithm, selection, mutation, population, generation, and seed
  settings from the control panel.
- Streams progress and route updates so the map changes during a run instead of
  only showing the final result.
- Compares run output against the known Dantzig reference tour length.

## Tech stack

The project uses React, Vite, TypeScript, Tailwind CSS, Zustand, and a Web
Worker-backed solver. The solver itself is kept as a framework-independent
TypeScript library under `src/lib/tsp`.

The Vite UI loads the Dantzig dataset from `public/data` and runs the solver
entirely in the browser, so the app can be deployed as static assets.

## Local development

```bash
pnpm install
pnpm run dev
```
