# Order Insights

A website for the marketing team. Import an order file, the site cleans it, then shows:

1. **Import & cleaning** – CSV or Excel import with a cleaning log (same steps as the analysis notebook)
2. **Dashboard** – all EDA charts with filters (service, outlet, weekday/weekend, date range)
3. **Basket analysis** – FP-Growth rules with sliders for minimum support, minimum confidence and the largest set (2 to 8 items)
4. **Bundle builder** – pick one or many items and get add-on and bundle suggestions

There is **no backend**. Everything runs in the browser (React, Tailwind CSS, a Web Worker for the heavy parts).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

Push to git as usual. `dist/` can be hosted anywhere that serves static files (GitHub Pages, Netlify, Vercel, a school server). The build uses relative paths, so no extra setting is needed.

## Add the logo

Replace `public/logo.svg` with your logo (keep the name, or put `logo.png` in `public/` and change `LOGO` in `src/config.js`). The app name is in the same file. The logo shows at the top of the sidebar.

## How the data works

- **Import**: choose a file, check the column choices (they are guessed from the headers), then *Clean and import*.
- **Cleaning steps**: keep rows where Modifier is "-" (optional) → Pax to number → merge start/end date and time → group by order and item (QTY summed). Negative durations, orders over 2 hours and Pax above 30 are counted in the log and left out of the duration and party-size charts only.
- **Add or replace**: when data is already loaded you can *add* a new file (orders already loaded are skipped, so the same file never counts twice) or *replace* everything. Each imported file can be removed on its own.
- **Saved in the browser**: cleaned data is stored in IndexedDB, so it stays after a refresh. It is not sent anywhere. Each person and each computer has its own copy, so every team member imports the file once. Sharing one dataset between people needs a backend or a database later.
- **Size**: tested with 230,000 item lines (54,000 orders). Use CSV for big files, Excel files are read all at once and use more memory.

## Expected columns

`Transaction_ID, Item_Name, QTY, Category, Start date + time, End date + time, Service_Type, Outlet_Code`, and optionally `Pax, Modifier`. Dates can be `2026-08-14`, `14/08/2026`, or Excel dates, with the time in the same or a separate column.

## Project layout

```
src/lib/clean.js       cleaning pipeline and column detection
src/lib/build.js       turns cleaned lines into compact tables
src/lib/fpgrowth.js    FP-Growth with a maximum set size
src/lib/mining.js      association rules (support, confidence, lift)
src/lib/analytics.js   filters and numbers for the dashboard
src/workers/           Web Worker (keeps the page responsive)
src/pages/             Import, Dashboard, Basket, Bundle
src/components/        charts and sidebar
public/sample_orders.csv   made-up data to test with (node tools/make_sample.mjs makes a new one)
```
