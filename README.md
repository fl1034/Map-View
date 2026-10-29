# Internet Pulse

An interactive globe and world map for exploring public RIPE Atlas internet measurements. Globe.GL powers the globe; MapLibre GL JS and deck.gl power the map. Country boundaries are bundled, so neither view needs map tiles, map keys, or a paid mapping service.

## Develop

Node.js 22+ and npm are required (validated with Node 24).

```sh
cd /workspace/Map-View
npm ci
npm run dev -- --port 5173
```

This task already has an isolated checkout. Use it directly; do not create a Git worktree unless explicitly requested.

```sh
npm test                 # normalization, loss, timestamp validation, retention and summaries
npm run test:browser     # Chromium integration tests, including a mocked RIPE stream
npm run build            # static output in dist/
npm run preview -- --port 4173
```

Browser tests default to `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installation. They use software WebGL in headless Chromium. The app requires WebGL2. The rendering libraries make the initial JavaScript payload substantial (about 1 MB compressed); it is not intended as a lightweight text dashboard.

## Source modes

**Live mode is the default. Simulation is an explicit optional design preview.** Measurements are generated locally in clusters around authored city coordinates and continuously labelled as synthetic. They are neither recordings nor real RIPE observations. The simulation has selectable rates of 2, 10 (default), or 20 results per second. Jets persist for 14 seconds and pulses repeat briefly for each received result; these effects do not increment measurement counts. Real public RIPE Atlas ping results have now been received and rendered in the browser.

The viewer connects automatically on startup; **Connect live stream** retries the connection. It will:

1. Discover public RIPE Atlas anchors with explicit geographic coordinates.
2. Find running public ping measurements targeting a spread of those anchors.
3. Subscribe to up to 12 discovered measurements over the public WebSocket stream.
4. Resolve source probe metadata and normalize fresh ping results.

No account key is requested. Existing public results are consumed; this application does not create measurements. Required network destinations:

- `https://atlas.ripe.net` — public anchor, measurement and probe metadata.
- `wss://atlas-stream.ripe.net/stream/` — measurement results.

Live access is **verified in this cloud instance**: direct browser metadata requests and the public WebSocket delivered real ping results, which were geographically resolved and rendered. The anchor IPv4 field is `ip_v4`. Chromium required trust in the supplied environment proxy CA; TLS verification remained enabled. This is a limited selected-stream test, not an uptime guarantee or complete global coverage assessment. A successful socket connection alone does not enable the LIVE badge: a fresh, located ping result must arrive. Quiet streams become WAITING after 45 seconds, and failures become DISCONNECTED. Reconnection is explicit via Retry.

Switching source clears previous observations. A live failure never silently substitutes simulated data. Both views share filters, selection and one retained event set. Data is capped at 720 observations and expires after 60 seconds, so counts describe the retained, filtered sample rather than all worldwide Atlas activity. Location metadata is cached in memory and concurrent lookups are bounded; bursts can omit results while metadata requests are saturated.

## Visual meaning

- **Independent jets:** a newly received result; height scales with latency, capped at 300 ms visually. Heights are exaggerated visual scales, not geographic altitude. The detail panel preserves the uncapped value. Timeouts use a fixed-height marker.
- **Arcs:** a probe connected to an explicitly located target anchor. Globe dashes illustrate direction; animation speed is decorative, not measured packet travel time. These are endpoint connections, not submarine cables or traced physical routes.
- **Surface pulses:** recent arrivals at the probe location, not national internet usage.
- **Colour:** mint below 80 ms, blue below 180 ms, amber above; coral indicates packet loss. Missing latency remains missing.
- **Statistics:** counts, distinct probes/countries, and median measured latency in the filtered retained window. Country is the probe's country. Comparing unrelated destinations does not rank national connection quality.

The overview map uses Mercator projection and therefore omits polar extremes. Map and globe use independent cameras but preserve data filters and the selected measurement. Region filters are coarse longitude/latitude ranges for exploration, not political boundary classification. The simulation pause button pauses new synthetic arrivals; time-based expiry and camera/arc animation continue.

## Static hosting

`npm run build` writes `dist/`, which can be hosted on GitHub Pages or another static host. Vite uses relative asset paths for repository subpath hosting. No application server, database, secret, AI account, or external basemap is required. A browser must still be able to reach RIPE Atlas for live mode. Never publish private API credentials in static assets.

The GitHub repository was empty when implementation began. `.github/workflows/pages.yml` tests and builds the application on pushes to `main`, then deploys `dist/` using GitHub Pages Actions. The repository Pages source must be GitHub Actions. The project URL is https://fl1034.github.io/Map-View/. No server-side application is deployed.

## Attribution and sources

- [RIPE Atlas](https://atlas.ripe.net/) — intended live source. Respect its data/service terms and fair-use limits.
- [RIPE NCC official streaming implementation](https://github.com/RIPE-NCC/ripe-atlas-cousteau/blob/master/ripe/atlas/cousteau/stream.py) — protocol reference.
- [Natural Earth](https://www.naturalearthdata.com/) — public-domain 1:110m country geometry. `public/countries.geojson` is derived from `nvkelso/natural-earth-vector`, `geojson/ne_110m_admin_0_countries.geojson`, retaining only name and ISO properties. Boundaries are cartographic context and do not express a political position.
- [Globe.GL](https://github.com/vasturiano/globe.gl) / Three.js and [deck.gl](https://github.com/visgl/deck.gl) — MIT-licensed visualization libraries.
- [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) — BSD-3-Clause map renderer.

Current validation covers the production build, unit tests, and Chromium rendering/integration tests. Mock-provider tests demonstrate the ingestion contract, not the health or fidelity of the live provider. A live browser test also received real results from 12 public ping measurements. Longer-term cadence and coverage need further assessment.
