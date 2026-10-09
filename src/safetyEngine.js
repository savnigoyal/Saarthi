/**
 * WAYSAFE Safety Scoring and Route Selection Engine
 * 
 * Weights:
 * - Street Lighting & Visibility: 25%
 * - Pedestrian Activity: 20%
 * - Police & CCTV Proximity: 15%
 * - Safe Havens & Infrastructure: 15%
 * - Historical Incident Safety: 25%
 */

class SafetyEngine {
  constructor() {
    this.WEIGHTS = {
      lighting: 0.25,
      pedestrian: 0.20,
      police: 0.15,
      safeHavens: 0.15,
      historical: 0.25
    };
  }

  /**
   * Evaluates a single candidate route.
   * @param {Object} routeData 
   */
  evaluateRoute(routeData) {
    // Check for missing data
    const requiredParams = ['lighting', 'pedestrian', 'police', 'safeHavens', 'historical'];
    const missing = [];
    
    for (const param of requiredParams) {
      if (!routeData.parameters || routeData.parameters[param] === undefined || routeData.parameters[param].score === null) {
        missing.push(param);
      }
    }

    if (missing.length > 0) {
      return {
        ...routeData,
        error: `Incomplete data. Cannot calculate reliable score. Missing: ${missing.join(', ')}`,
        weightedScore: 0
      };
    }

    // Unrounded calculations
    const p = routeData.parameters;
    const lightingScore = p.lighting.score * this.WEIGHTS.lighting;
    const pedestrianScore = p.pedestrian.score * this.WEIGHTS.pedestrian;
    const policeScore = p.police.score * this.WEIGHTS.police;
    const safeHavensScore = p.safeHavens.score * this.WEIGHTS.safeHavens;
    const historicalScore = p.historical.score * this.WEIGHTS.historical;

    const totalScore = lightingScore + pedestrianScore + policeScore + safeHavensScore + historicalScore;

    return {
      ...routeData,
      parameters: {
        lighting: { ...p.lighting, weighted: lightingScore },
        pedestrian: { ...p.pedestrian, weighted: pedestrianScore },
        police: { ...p.police, weighted: policeScore },
        safeHavens: { ...p.safeHavens, weighted: safeHavensScore },
        historical: { ...p.historical, weighted: historicalScore },
      },
      weightedScore: Number(totalScore.toFixed(2))
    };
  }
}

export default SafetyEngine;
