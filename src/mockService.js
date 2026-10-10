import { jaipurCampusDemoRoute } from './mockData';

export const getAlternativeRoutes = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Show the campus demo in the home route panel. The map requests live route
  // geometry, distance and duration; safety scores remain unavailable.
  return [jaipurCampusDemoRoute];
};
