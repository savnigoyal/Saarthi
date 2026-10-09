import { mockRoutes } from './mockData';
import SafetyEngine from './safetyEngine';

const engine = new SafetyEngine();

export const getAlternativeRoutes = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Return scored routes
  return mockRoutes.map(route => engine.evaluateRoute(route));
};
