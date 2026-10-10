import { mockRoutes } from './mockData';
import SafetyEngine from './safetyEngine';

const safetyEngine = new SafetyEngine();

export const getAlternativeRoutes = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Route options and factor scores are sample data for the Jaipur demo.
  // Keep the weighted formula identical to the production scoring engine.
  return mockRoutes.map((route) => safetyEngine.evaluateRoute(route));
};
