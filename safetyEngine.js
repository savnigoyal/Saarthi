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
        id: routeData.id,
        name: routeData.name,
        error: `Incomplete data. Cannot calculate reliable score. Missing: ${missing.join(', ')}`
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
      id: routeData.id,
      name: routeData.name,
      travelTime: routeData.travelTime,
      dataConfidence: routeData.dataConfidence || 'Unknown',
      parameters: {
        lighting: { ...p.lighting, weighted: lightingScore },
        pedestrian: { ...p.pedestrian, weighted: pedestrianScore },
        police: { ...p.police, weighted: policeScore },
        safeHavens: { ...p.safeHavens, weighted: safeHavensScore },
        historical: { ...p.historical, weighted: historicalScore },
      },
      weightedScore: Number(totalScore.toFixed(2)),
      keyAdvantages: routeData.keyAdvantages || [],
      knownConcerns: routeData.knownConcerns || [],
      missingOrOutdatedData: routeData.missingOrOutdatedData || []
    };
  }

  /**
   * Evaluates multiple routes and recommends the best one.
   * @param {Array} routes 
   */
  compareRoutes(routes) {
    const evaluated = routes.map(route => this.evaluateRoute(route));
    
    const validRoutes = evaluated.filter(r => !r.error);
    
    if (validRoutes.length === 0) {
      return {
        evaluatedRoutes: evaluated,
        recommendation: null,
        message: "No routes with sufficient data to evaluate reliably."
      };
    }

    // Highest score wins
    validRoutes.sort((a, b) => b.weightedScore - a.weightedScore);
    const bestRoute = validRoutes[0];

    return {
      evaluatedRoutes: evaluated,
      recommendation: bestRoute,
      reason: `Route '${bestRoute.name}' has the highest valid weighted score of ${bestRoute.weightedScore}/100 among the candidates evaluated.`,
      limitations: "Scores depend on data freshness and reliability. A numerical score is not a guarantee of absolute safety."
    };
  }

  /**
   * Returns a markdown-formatted string with the requested output format.
   * @param {Object} comparisonResult Result from compareRoutes()
   */
  formatOutput(comparisonResult) {
    let output = '';

    for (const route of comparisonResult.evaluatedRoutes) {
      if (route.error) {
        output += `**Route Name:** ${route.name || 'Unknown'}\n`;
        output += `**Error:** ${route.error}\n\n`;
        continue;
      }

      output += `**Route Name:** ${route.name}\n\n`;
      output += `**Parameter Breakdown**\n`;
      output += `- Street Lighting & Visibility: ${route.parameters.lighting.score}/100 — ${route.parameters.lighting.evidence}\n`;
      output += `- Pedestrian Activity: ${route.parameters.pedestrian.score}/100 — ${route.parameters.pedestrian.evidence}\n`;
      output += `- Police & CCTV Proximity: ${route.parameters.police.score}/100 — ${route.parameters.police.evidence}\n`;
      output += `- Safe Havens & Infrastructure: ${route.parameters.safeHavens.score}/100 — ${route.parameters.safeHavens.evidence}\n`;
      output += `- Historical Incident Safety: ${route.parameters.historical.score}/100 — ${route.parameters.historical.evidence}\n\n`;
      
      output += `**Weighted Safety Score:** ${route.weightedScore}/100\n\n`;
      output += `**Data Confidence:** ${route.dataConfidence}\n\n`;
      if (route.travelTime) {
        output += `**Travel Time:** ${route.travelTime}\n\n`;
      }

      output += `**Key Advantages:**\n${route.keyAdvantages.length > 0 ? route.keyAdvantages.map(adv => '- ' + adv).join('\n') : 'None specified.'}\n\n`;
      output += `**Known Concerns:**\n${route.knownConcerns.length > 0 ? route.knownConcerns.map(con => '- ' + con).join('\n') : 'None specified.'}\n\n`;
      output += `**Missing or Outdated Data:**\n${route.missingOrOutdatedData.length > 0 ? route.missingOrOutdatedData.map(d => '- ' + d).join('\n') : 'None'}\n\n`;
      output += `---\n\n`;
    }

    if (comparisonResult.recommendation) {
      output += `**Recommended Route:** ${comparisonResult.recommendation.name}\n\n`;
      output += `**Reason for Recommendation:** ${comparisonResult.reason}\n\n`;
      output += `**Important Limitations:** ${comparisonResult.limitations}\n`;
    } else if (comparisonResult.message) {
      output += `**System Message:** ${comparisonResult.message}\n`;
    }

    return output;
  }
}

// Export for Node/Browser compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafetyEngine;
}
