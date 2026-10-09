/**
 * DEMO DATA — NOT LIVE OR VERIFIED
 * Candidate routes for the SafeRoute application development phase.
 */

export const mockRoutes = [
  {
    id: "route-1",
    name: "Saathi Safe Route",
    destination: "Oakridge Girls Hostel",
    eta: "12:04 AM",
    travelTime: "14 min",
    distance: "1.2 km",
    dataConfidence: "98%",
    review: {
      user: "Priya S.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      timeAgo: "2 hours ago",
      text: "Felt very secure walking home! Bright street lamps all the way to the hostel gate and active campus security personnel at the corner."
    },
    segments: [
      {
        id: "seg-1",
        name: "Main Campus Boulevard",
        distance: "400m",
        description: "Well-lit avenue with 24/7 CCTV surveillance and active student footfall.",
        tags: [
          { text: "High Illumination", type: "primary" },
          { text: "CCTV Covered", type: "secondary" }
        ]
      },
      {
        id: "seg-2",
        name: "North Gate Corridor",
        distance: "500m",
        description: "Commercial stretch with open convenience stores and police security booth.",
        tags: [
          { text: "Police Kiosk", type: "primary" },
          { text: "Safe Haven", type: "secondary" }
        ]
      },
      {
        id: "seg-3",
        name: "Oakridge Residence Lane",
        distance: "300m",
        description: "Residential approach to girls hostel with dedicated security guard.",
        tags: [
          { text: "Hostel Security", type: "primary" }
        ]
      }
    ],
    parameters: {
      lighting: {
        score: 95,
        evidence: "100% LED street lamp coverage, minimal shadows along main pedestrian path."
      },
      pedestrian: {
        score: 90,
        evidence: "Consistent footfall near night canteens and student housing hubs."
      },
      police: {
        score: 88,
        evidence: "Police patrol vehicle stationed at North Gate intersection + 4 CCTV nodes."
      },
      safeHavens: {
        score: 94,
        evidence: "3 verified safe havens: 24/7 Pharmacy, Campus Security Booth, All-Night Store."
      },
      historical: {
        score: 92,
        evidence: "Zero safety incidents recorded in campus safety logs over past 180 days."
      }
    }
  },
  {
    id: "route-2",
    name: "Express Campus Bypass",
    destination: "Oakridge Girls Hostel",
    eta: "11:58 PM",
    travelTime: "9 min",
    distance: "0.9 km",
    dataConfidence: "85%",
    review: {
      user: "Ananya M.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      timeAgo: "Yesterday",
      text: "Shorter path but slightly dimmer past the library gardens late at night."
    },
    segments: [
      {
        id: "seg-1",
        name: "Library East Path",
        distance: "450m",
        description: "Quiet walkway behind academic blocks.",
        tags: [
          { text: "Moderate Light", type: "secondary" },
          { text: "Low Footfall", type: "warning" }
        ]
      },
      {
        id: "seg-2",
        name: "Hostel Back Gate",
        distance: "450m",
        description: "Direct entry to hostel rear perimeter.",
        tags: [
          { text: "Fastest Path", type: "primary" }
        ]
      }
    ],
    parameters: {
      lighting: {
        score: 72,
        evidence: "Partial lighting near library stretch; some unlit tree canopy sections."
      },
      pedestrian: {
        score: 65,
        evidence: "Low student movement after 11:30 PM."
      },
      police: {
        score: 75,
        evidence: "1 CCTV camera near library exit; patrol every 45 mins."
      },
      safeHavens: {
        score: 70,
        evidence: "1 safe haven available: Library emergency phone box."
      },
      historical: {
        score: 85,
        evidence: "No major incidents, but isolated reports of poor lighting."
      }
    }
  }
];
