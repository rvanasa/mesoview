# [Mesoview](https://mesoview.app)

A mobile-friendly viewer for weather analysis products from NOAA's Storm Prediction Center.

## Features

### SPC Mesoanalysis
Browse all surface and upper-air parameters from the official [SPC mesoanalysis website](https://www.spc.noaa.gov/exper/mesoanalysis/).

### Surface Analysis
Use one slider to view the surface pattern from the Weather Prediction Center synchronized with SPC mesoanalysis products.

### Sounding Viewer
Use the time slider to animate through Skew-T and hodograph plots for any available station, with parcel trajectories for convective analysis. Pick a forecast sounding anywhere in the US from an interactive map using the same data sources available in [SHARPpy](https://sharp.weather.ou.edu/dev/).

### Composable Views
Overlay multiple parameters at once. For example, combine the SPC mesoanalysis surface vorticity and 3CAPE parameters. Views are encoded in the URL for easy bookmarking and sharing.

### Other
- Date/time navigation with keyboard shortcuts (arrow keys; Ctrl for 6-hour steps)
- Optional overlays for counties, highways, radar, warnings, and SPC convective outlooks
- Dark mode
- Favorites for frequently used view combinations
- Responsive layout optimized for mobile

## Development

### Prerequisites
- [Node.js](https://nodejs.org/) 22+

### Getting started

```bash
npm install
npm start  # dev server at http://localhost:3000
```

### Available scripts

| Command | Description |
|---|---|
| `npm start` | Start the Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run generate` | Regenerate parameter JSON files from upstream sites |
| `npm run lint` | Run ESLint on `src/` |
| `npm test` | Run the Vitest test suite |

### Regenerating parameter lists

`src/generated/` contains scraped parameter catalogs. These files are committed to source control. Regenerate them whenever the upstream sites change:

```bash
npm run generate
```

## Contributing

### Project structure

```
src/
  components/   React components and views
  contexts/     React context providers
  generated/    Auto-generated parameter catalogs
  hooks/        Custom React hooks
  styles/       Global SCSS
  utils/        Pure utility functions
tests/          Vitest unit tests
scripts/        Code generation scripts
```

### Reporting issues
Open a GitHub issue with a description of the problem and steps to reproduce. Including the URL from your address bar is helpful, as it captures the active view state.

### Making changes

1. Fork the repository and create a branch from `main`.
2. Make your changes, keeping commits focused on one logical change.
3. Add or update tests in `tests/` if you are changing utility logic.
4. Run `npm test` and `npm run lint` and ensure both pass.
5. Open a pull request against `main` with a description of what changed and why.
