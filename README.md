# Mesoview

This repository contains source code for a mobile-friendly adaptation of the official [SPC Mesoanalysis](https://www.spc.noaa.gov/exper/mesoanalysis/new/viewsector.php?sector=19) website.

## Development

### Generating Parameter Lists

The application uses automatically generated parameter lists for SPC Mesoanalysis and Pivotal Weather. To update these lists:

```bash
npm run generate
```

This will scrape the official websites and update:
- `src/generated/spcMesoanalysis.json` - SPC Mesoanalysis parameters organized by category
- `src/generated/pivotalWeather.json` - Pivotal Weather parameters organized by category

The generate script uses Playwright to visit the websites and extract all available parameters and their categories. Run this periodically to keep the parameter lists up to date with any changes on the source websites.
