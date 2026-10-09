# WAYSAFE Safe Route Finder

React + Vite application with a Leaflet/OpenStreetMap walking route panel embedded in the existing route safety detail screen.

## Run locally

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` to override the service URLs. No API key is required for the configured demo endpoints. The browser Geolocation API requires localhost or HTTPS and prompts only when the user selects **Use my location**.

## Map services

- Map tiles: OpenStreetMap standard tile service, with visible OpenStreetMap contributor attribution.
- Search suggestions: Photon (`https://photon.komoot.io/api/`), an OSM based geocoder. Suggestions are debounced and only requested after three characters.
- Walking directions: FOSSGIS OSRM foot profile (`https://routing.openstreetmap.de/routed-foot/route/v1/driving`). Returned GeoJSON route geometry, distance, duration and alternatives drive the map and route cards.
- `VITE_GEOCODER_URL` and `VITE_ROUTING_URL` can point to compatible self-hosted or contracted services. These are public browser endpoints, not secrets; do not place API credentials in `VITE_*` variables.

The public Photon demo has no availability guarantee and asks users to keep request volume reasonable. FOSSGIS routing has a one-request-per-second limit and is intended for light use. The standard OSM tile service has its own capacity and usage policy. These public services are suitable for development and low-volume demos, not a production traffic guarantee. For deployment, select providers or self-hosted services sized for your traffic and review their current policies. Attribution must remain visible.

## Implemented map behavior

- Search and select a start and destination from OSM geocoding suggestions; swap endpoints.
- Request current position on demand, show a marker, center the map, and report permission/timeout errors. No continuous location tracking is started.
- Calculate actual pedestrian routes, render selectable alternatives, fit map bounds, and display returned distance and duration.
- Preserve the existing WAYSAFE scoring view. Its demo safety scores are separate from routing results and are not presented as live safety analysis of the searched map route.

## Safety scoring integration

The existing safety panel continues to use fictional demo route records from `src/mockData.js`. It is not connected to the newly searched routes or a backend scoring service. To connect scoring later, have the backend accept route geometry/segments and return the official weighted score, factor scores, confidence, evidence, timestamps and missing-data flags. Do not infer lighting, crime, CCTV, or a safety score from map tiles.

## Build and deploy

Run `npm run build`, then serve the generated `dist/` directory on a static host. Configure the two `VITE_*` endpoints at build time if using other compatible services. Serve the app over HTTPS for geolocation. Check the selected tile, geocoding and routing provider's policies and operational limits before production deployment.
