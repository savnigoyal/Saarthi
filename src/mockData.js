/**
 * ============================================================
 * DEMO DATA — NOT LIVE OR VERIFIED
 * Source: Fictional Jaipur route scenarios for development.
 * All scores are internally consistent with the weighted formula.
 * OpenStreetMap-derived values are labelled as map data only.
 *
 * WEIGHTS (fixed — do not change):
 *   Street Lighting & Visibility      25%
 *   Estimated Pedestrian Activity     20%
 *   Police & CCTV Proximity           15%
 *   Safe Havens & Infrastructure      15%
 *   Historical Incident Safety        25%
 *
 * Formula:
 *   Score = lighting*0.25 + pedestrian*0.20 + police*0.15
 *           + safeHavens*0.15 + historical*0.25
 *
 * DATA HONESTY:
 *   - Pedestrian activity is ESTIMATED from nearby map points,
 *     NOT from real-time footfall sensors.
 *   - Police proximity uses OSM police station locations only.
 *     No verified real-time CCTV data is included.
 *   - Historical Incident Safety is NOT populated from real
 *     crime data. Score uses a provisional placeholder (75)
 *     until an official dataset is connected.
 *   - Street lighting is derived from OSM highway=street_lamp
 *     records, NOT from live sensor readings.
 * ============================================================
 */

export const mockRoutes = [
  // ──────────────────────────────────────────────────────────
  // ROUTE A — Well-documented, high-safety corridor
  // Score calculation:
  //   92*0.25 + 78*0.20 + 65*0.15 + 80*0.15 + 88*0.25
  //   = 23.00 + 15.60 + 9.75 + 12.00 + 22.00 = 82.35
  // ──────────────────────────────────────────────────────────
  {
    id: "r1",
    name: "Via MI Road & Sansar Chandra Marg",
    distance: "3.1 km",
    travelTime: "24 min walk",
    dataConfidence: "High",
    isDemoData: true,

    parameters: {
      lighting: {
        score: 92,
        evidence:
          "OSM map data shows high density of street_lamp nodes along MI Road corridor. Municipal lighting reported as functional on primary roads. (OpenStreetMap-derived geographic data — not a live sensor reading.)",
      },

      pedestrian: {
        score: 78,
        evidence:
          "Estimated Pedestrian Activity based on nearby mapped activity points: 12 restaurants, 34 shops, 3 bus stops within 200m. Active commercial zone expected to have moderate foot traffic at night. (Not real-time footfall data.)",
      },

      police: {
        score: 65,
        evidence:
          "One OSM-mapped police station within 1.4 km (Ashok Nagar Thana). No verified CCTV coverage data available. Proximity score only — operational status unverified. (OpenStreetMap-derived data.)",
      },

      safeHavens: {
        score: 80,
        evidence:
          "OSM map data shows: 1 hospital within 900m (Sawai Man Singh Hospital), 4 pharmacies within 600m, 3 bus stops with shelters. (Map data only — opening hours not verified.)",
      },

      historical: {
        score: 88,
        evidence:
          "PROVISIONAL — No official crime dataset connected yet. This score (88) is a placeholder pending integration of verified incident data. Do not treat as a safety guarantee. Historical Incident Safety factor (25%) is not active.",
      },
    },

    segments: [
      {
        id: "r1_s1",
        name: "Ajmeri Gate to MI Road Junction",
        distance: "900m",
        description: "Broad road, high pedestrian density, multiple shops open late",
        tags: [
          { text: "Well Lit (OSM)", type: "primary" },
          { text: "Active Zone", type: "secondary" },
        ],
      },
      {
        id: "r1_s2",
        name: "MI Road Commercial Stretch",
        distance: "1.4km",
        description: "Dense commercial corridor, bus stops at 600m intervals",
        tags: [
          { text: "Bus Stops Nearby", type: "primary" },
          { text: "High Activity (Est.)", type: "secondary" },
        ],
      },
      {
        id: "r1_s3",
        name: "Sansar Chandra Marg to Destination",
        distance: "800m",
        description: "Residential stretch, moderate lighting per OSM data",
        tags: [
          { text: "Residential", type: "secondary" },
          { text: "SMS Hospital 900m", type: "primary" },
        ],
      },
    ],

    review: {
      user: "Priya R.",
      timeAgo: "Demo entry",
      text: "MI Road is well-lit and always has people around. Felt safe walking back after 10 PM.",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDt5dGCz-yhSsIAtL0gMYhkomRvcg1I7kweTTKMM4K24MgomvEp-SAF8rEKBB4WiwbNkGsexPxd4rFeLKMmgUsiwIE6LwfolFgK5RrcorhqyZWB5PBGUcadFjeY141JicN8ERPocs6rt-wgmbAxozjO4pck-o9i_JarA6EOX9kU394Vs9qyugNTDITNFEI8GwbHX-zxRjVf1IjMxCwPRQvW1BCNVTry93UFdA-yHRBhbthYZrL-Zvuc",
    },

    missingData: [
      "Real-time street light sensor status",
      "Verified CCTV camera locations",
      "Actual pedestrian footfall counts",
      "Official crime/incident dataset (Historical factor inactive)",
    ],
  },

  // ──────────────────────────────────────────────────────────
  // ROUTE B — Shorter route, incomplete lighting & activity data
  // Score calculation:
  //   60*0.25 + 45*0.20 + 35*0.15 + 55*0.15 + 75*0.25
  //   = 15.00 + 9.00 + 5.25 + 8.25 + 18.75 = 56.25
  // ──────────────────────────────────────────────────────────
  {
    id: "r2",
    name: "Short Cut via Ramganj Bazar Lane",
    distance: "1.8 km",
    travelTime: "14 min walk",
    dataConfidence: "Medium",
    isDemoData: true,

    parameters: {
      lighting: {
        score: 60,
        evidence:
          "OSM street_lamp data is sparse for this area — fewer than 4 nodes mapped on this corridor. Lighting coverage cannot be reliably estimated. Data may be incomplete due to limited OSM contributions in this zone. (OpenStreetMap-derived data — stale or incomplete.)",
      },

      pedestrian: {
        score: 45,
        evidence:
          "Estimated Pedestrian Activity based on nearby mapped activity points: 3 restaurants, 8 shops within 200m. Narrow lane with limited commercial presence. Activity expected to drop significantly post-sunset. (Not real-time footfall data.)",
      },

      police: {
        score: 35,
        evidence:
          "No OSM-mapped police station within 1 km. Nearest is Ramganj Thana at approximately 1.7 km. No CCTV data available. (OpenStreetMap-derived data — operational status unknown.)",
      },

      safeHavens: {
        score: 55,
        evidence:
          "OSM map data shows: 1 pharmacy within 500m, 2 bus stops in the broader area. No hospital within 1 km. Limited safe haven infrastructure mapped in this zone. (Map data only.)",
      },

      historical: {
        score: 75,
        evidence:
          "PROVISIONAL — No official crime dataset connected yet. This score (75) is a placeholder. Historical Incident Safety factor (25%) is not active. Do not treat as verified.",
      },
    },

    segments: [
      {
        id: "r2_s1",
        name: "Badi Chaupar Entry",
        distance: "600m",
        description: "Busy during day, lighting data incomplete in OSM",
        tags: [
          { text: "Lighting Data Sparse", type: "error" },
          { text: "Daytime Busy", type: "secondary" },
        ],
      },
      {
        id: "r2_s2",
        name: "Ramganj Inner Lane",
        distance: "700m",
        description: "Narrow lane — no mapped police or safe havens",
        tags: [
          { text: "No Police Nearby", type: "error" },
          { text: "Caution: Isolated", type: "error" },
        ],
      },
      {
        id: "r2_s3",
        name: "Exit to Tonk Road",
        distance: "500m",
        description: "Opens to wider road with bus stop",
        tags: [{ text: "Bus Stop", type: "primary" }],
      },
    ],

    review: {
      user: "Aryan K.",
      timeAgo: "Demo entry",
      text: "Quickest route but the inner lane gets very dark at night. I'd avoid it after 9 PM.",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCBMTr__9XPcOSiGWSjhF0eCBPTKbG2BgYe5Y8GCR01njOkmi2j-0rLepsEngTbl2g7mc0T5CVNVJXKKuDlN6YGB2M-2058JA4XP2lNaL4Rx6tS13dQHVdXeZ_abGNw36VNIG7kJ_851_JxKt34_sjC8k04wwajcxKuHqrNyEEoT5MCEu-WPf9f6mKVnvg9HHPWBAtp4mni3sPu4aG2MtCQg4KztoYq-OZHlRPnbakzsXecgtBz6CPE",
    },

    missingData: [
      "Street lighting data is sparse — OSM coverage incomplete for this lane",
      "No verified CCTV data",
      "Real-time pedestrian counts unavailable",
      "Official crime/incident dataset (Historical factor inactive)",
      "Safe haven opening hours unverified",
    ],
  },

  // ──────────────────────────────────────────────────────────
  // ROUTE C — Longer alternative, good police coverage, low safe havens
  // Score calculation:
  //   82*0.25 + 58*0.20 + 88*0.15 + 25*0.15 + 85*0.25
  //   = 20.50 + 11.60 + 13.20 + 3.75 + 21.25 = 70.30
  // ──────────────────────────────────────────────────────────
  {
    id: "r3",
    name: "Outer Ring via Vidhan Sabha Marg",
    distance: "4.6 km",
    travelTime: "36 min walk",
    dataConfidence: "High",
    isDemoData: true,

    parameters: {
      lighting: {
        score: 82,
        evidence:
          "OSM data shows consistent street_lamp coverage along Vidhan Sabha Marg. State road, likely better maintained than inner lanes. (OpenStreetMap-derived geographic data — not a live sensor reading.)",
      },

      pedestrian: {
        score: 58,
        evidence:
          "Estimated Pedestrian Activity based on nearby mapped activity points: 2 universities, 6 schools, 7 restaurants, 12 shops within 400m corridor. Government/institutional zone — activity concentrated during daytime hours. Lower estimated night activity. (Not real-time footfall data.)",
      },

      police: {
        score: 88,
        evidence:
          "Two OSM-mapped police stations within 1 km (Vidhan Sabha Chowki and Civil Lines Thana). Higher proximity score. No verified CCTV data available. (OpenStreetMap-derived data — operational status unverified.)",
      },

      safeHavens: {
        score: 25,
        evidence:
          "OSM map data shows: 0 hospitals within 1.5 km, 1 pharmacy at 1.2 km, 2 bus stops along route. Low safe haven density — institutional zone with limited 24/7 commercial presence. (Map data only — opening hours not verified.)",
      },

      historical: {
        score: 85,
        evidence:
          "PROVISIONAL — No official crime dataset connected yet. This score (85) is a placeholder. Historical Incident Safety factor (25%) is not active. Do not treat as verified.",
      },
    },

    segments: [
      {
        id: "r3_s1",
        name: "Sindhi Camp to Civil Lines",
        distance: "1.2km",
        description: "Wide state road, OSM lighting data consistent",
        tags: [
          { text: "State Road", type: "primary" },
          { text: "Patrolled Area", type: "primary" },
        ],
      },
      {
        id: "r3_s2",
        name: "Vidhan Sabha Marg Stretch",
        distance: "2.8km",
        description: "Institutional zone, open road, limited shops",
        tags: [
          { text: "Police Post 800m", type: "primary" },
          { text: "Low Commercial Activity", type: "secondary" },
        ],
      },
      {
        id: "r3_s3",
        name: "Final Approach — C-Scheme",
        distance: "600m",
        description: "Residential colony, decent lighting per OSM",
        tags: [
          { text: "Residential", type: "secondary" },
          { text: "No Hospital Nearby", type: "error" },
        ],
      },
    ],

    review: {
      user: "Sneha M.",
      timeAgo: "Demo entry",
      text: "Long route but feels safer — the road is wide and there are police checkposts. Very few shops though.",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCBMTr__9XPcOSiGWSjhF0eCBPTKbG2BgYe5Y8GCR01njOkmi2j-0rLepsEngTbl2g7mc0T5CVNVJXKKuDlN6YGB2M-2058JA4XP2lNaL4Rx6tS13dQHVdXeZ_abGNw36VNIG7kJ_851_JxKt34_sjC8k04wwajcxKuHqrNyEEoT5MCEu-WPf9f6mKVnvg9HHPWBAtp4mni3sPu4aG2MtCQg4KztoYq-OZHlRPnbakzsXecgtBz6CPE",
    },

    missingData: [
      "No hospitals within 1.5 km — Safe Havens score is low",
      "Real-time street light sensor status not available",
      "No verified CCTV data",
      "Official crime/incident dataset (Historical factor inactive — score is provisional)",
    ],
  },
];

// Demo-only route scenario. Distance, duration and geometry are loaded from
// the walking router; no safety score or street-condition claims are attached.
export const jaipurCampusDemoRoute = {
  id: 'jaipur-muj-demo',
  name: 'Jaipur Junction → Manipal University Jaipur',
  origin: 'Jaipur Junction (demo start)',
  destination: 'Manipal University Jaipur campus, Dehmi Kalan',
  distance: 'Load route on map',
  travelTime: 'Load route on map',
  dataConfidence: 'Routing demo',
  isCampusDemo: true,
  weightedScore: null,
  parameters: null,
  segments: [],
  review: null,
};
