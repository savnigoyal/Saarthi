# WAYSAFE - Safety Scoring & Route Selection Engine

This project implements the WAYSAFE safety evaluation logic to score night-travel candidate routes based on fixed telemetry weights and provide rigorous safety indexing.

## Components
- `index.html`: The UI mockup for the Haven Detail / Deep Route Inspection page.
- `safetyEngine.js`: The core scoring engine class that strictly follows the weighted calculation rules.

## Using the Engine

The engine calculates a route's safety score using a fixed, 5-parameter formula:
- Street Lighting & Visibility (25%)
- Pedestrian Activity (20%)
- Police & CCTV Proximity (15%)
- Safe Havens & Infrastructure (15%)
- Historical Incident Safety (25%)

### Example Usage (Node.js or Browser)

```javascript
// If in Node: const SafetyEngine = require('./safetyEngine');

const engine = new SafetyEngine();

// Candidate data set
const sampleRoutes = [
  {
    id: "r1",
    name: "Via Grand Boulevard & Park Ave Safe Corridor",
    travelTime: "18 min walk",
    dataConfidence: "High",
    parameters: {
      lighting: { score: 98, evidence: "Verified high-lux municipal LEDs throughout corridor." },
      pedestrian: { score: 88, evidence: "Estimated active late-night cafes & transit interchange crowd." },
      police: { score: 94, evidence: "Verified patrol checkpoint at 800m & 1.6km markers." },
      safeHavens: { score: 90, evidence: "Verified Apollo Pharmacy, Cafe Coffee Day, Metro Outpost." },
      historical: { score: 96, evidence: "Verified zero incidents reported within past 90 days." }
    },
    keyAdvantages: [
      "Exceptional street lighting coverage (98%) ensuring high visibility.",
      "Perfect historical safety record with no incidents in the past 90 days."
    ],
    knownConcerns: [
      "Pedestrian activity (88%) is the lowest score, though still robust."
    ],
    missingOrOutdatedData: []
  }
];

const result = engine.compareRoutes(sampleRoutes);
console.log(engine.formatOutput(result));
```

When you have the full dataset available, simply format it into objects following the structure above and pass it into the `engine.compareRoutes()` method.
