# Sonnenseite

A Swiss sun finder. It answers one question: **where is the sun, and how do I get there?**
Built for the days when high fog sits over the Mittelland and Lake Zürich while the hills above are in sunshine.

## What it does

- **Fog brief.** For your starting point: is there fog, how high does it reach, and what is the nearest place above it.
  A chart plots every reachable place by travel time and altitude against the fog layer.
- **Ranked list of 249 places** (summits, viewpoints, mountain villages, passes, towns) with hours of sun, hour-by-hour strips,
  travel time and "above the fog" markers. Sort by best trip, most sun, closest or highest.
- **Map** on swisstopo base maps (light, topo, winter, aerial) with:
  - places coloured by sunshine for the chosen hour,
  - a **sea-of-fog layer** that tints all terrain below the fog top (automatic, or set the height by hand),
  - **measured sunshine** from MeteoSwiss stations (last 10 minutes),
  - 145 webcams.
- **Place details:** sun today and on the coming days, the sun's path over the real skyline (so you see when mountains
  block the low winter sun), temperature, gusts, snow depth, webcams with live previews and an in-app viewer,
  measurements from the nearest station.
- **Getting there:** drive time to the valley station plus lift or walk, one-tap navigation in Google or Apple Maps,
  route preview on the map, next public-transport connections, SBB timetable link, swisstopo hiking map.
- **GPS:** use your position as the starting point; it is also shown on the map.
- **Settings:** longest trip, how much closeness matters, altitude range, kinds of place, winter-closed lifts,
  saved places, weather model, units, theme, and **replay of any past day** (try 13 December 2025 for a classic fog day).

## Run it

It is a static web app: no build step, no server code, no API keys.

- **Quickest:** open `dist/sonnenseite.html` in a browser. One self-contained file.
- **On your phone, installable, with GPS:** put this folder on any static web host that serves HTTPS
  (GitHub Pages, Netlify, Cloudflare Pages, your own server). Open it on the phone and choose
  "Add to Home Screen". Phones only allow GPS on HTTPS pages.
- **Local preview:** `node tools/test/serve.js 8765` and open http://localhost:8765/

## How the sunshine estimate works

1. **Cloud to sunshine.** Hourly low, mid and high cloud cover from the forecast are converted to a share of the hour
   with sun: `0.9 x (1 - 0.9 L) x (1 - 0.6 M^0.75) x (1 - 0.2 H^3)`. This was fitted to 26,000 station-hours of
   MeteoSwiss sunshine measurements from two winter periods. The weather model's own "sunshine duration" is not used:
   against the same measurements it overstated sunshine about twofold.
2. **Terrain.** Each place has a 360 degree skyline computed from an elevation model. The sun only counts while it is
   above that skyline. In 6,036 station-hours where this said "mountains in the way", the stations measured no sun.
3. **Fog top.** Model grid cells are about 2 km wide, so a hill that pokes out of the fog often sits in a cell still
   inside it. For every hour the app fits "low cloud versus altitude" across all places within 40 km and lifts a hill
   out of the fog only when ground at or below its height is already clear nearby.

Limits worth knowing: near the top of the fog, 100 m decides between grey and blue sky and no forecast is that exact.
The fog-top correction is deliberately cautious and helped only modestly in testing. Use the measured sunshine and
the webcams to confirm before you leave. Lift operating times are not checked; places whose lift usually closes in
winter are flagged from a hand-kept list.

## Data sources

| What | Source |
| --- | --- |
| Forecast | Open-Meteo (ICON-D2 / ICON-EU by default; MeteoSwiss ICON-CH1 and CH2 selectable), CC BY 4.0 |
| Measured sunshine, temperature, humidity | MeteoSwiss open government data |
| Base maps, place names | swisstopo |
| Map outside Switzerland | CARTO basemaps, OpenStreetMap data |
| Terrain | Mapzen Terrarium tiles on AWS Open Data |
| Road routing | OSRM demo server (OpenStreetMap data) |
| Timetable | transport.opendata.ch |
| Webcam locations | OpenStreetMap contributors (ODbL) plus hand-checked additions |

The public endpoints above are free for personal use and rate-limited. The app caches the forecast for an hour and
drive times for two weeks. Webcam images belong to their operators; the app links to their pages.

## Project layout

```
index.html, css/, js/        the app (plain scripts, no framework)
  js/sun.js                  solar position and terrain shading
  js/engine.js               data loading, sunshine estimate, fog profile, ranking, travel
  js/map.js, js/ui.js        map and interface
data/                        generated: places, webcams, stations
vendor/                      Leaflet 1.9.4
dist/sonnenseite.html        single-file build (python3 tools/build_single.py)
tools/                       data pipeline and tests
  places_src.py              the curated place list; edit this to add places
  build_places.py            verifies coordinates, finds stops and valley stations, computes skylines
  build_webcams.py           builds the webcam directory
  test/                      logic, browser and interaction tests
```

To add a place: add a line to `tools/places_src.py`, run `python3 tools/build_places.py`, then
`python3 tools/build_single.py`.
