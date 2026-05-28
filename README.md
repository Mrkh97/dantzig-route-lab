# Dantzig Route Lab

Client-side React, Vite, and TypeScript

The app keeps the solver as a framework-independent TypeScript library under
`src/lib/tsp`. The Vite UI loads the Dantzig dataset from `public/data` and runs
the solver entirely in the browser, so it can be deployed as static assets.

```bash
pnpm install
pnpm run dev
```

