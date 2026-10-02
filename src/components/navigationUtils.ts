// navigationUtils.ts

export type Node = { x: number; y: number; name: string; isAssembly?: boolean };

export const CAMPUS_LIMITS = {
  north: 13.165857,
  south: 13.162422,
  west: 123.747844,
  east: 123.751555,
};

// 1. Define the exact corner-to-corner perimeter of your primary evacuation area
export const EVACUATION_POLYGON = [
  { x: 42.7, y: 72.1 }, // NODE_1
  { x: 30.3, y: 72.1 }, // NODE_2
  { x: 30.0, y: 58.1 }, // NODE_3
  { x: 33.2, y: 54.4 }, // NODE_4
  { x: 43.3, y: 54.4 }, // NODE_5
  { x: 42.8, y: 71.8 }, // NODE_6
];

// 2. Define the second evacuation area perimeter for Building 3 (non-overlapping unique keys)
export const EVACUATION_POLYGON_2 = [
  { x: 63.1, y: 65.5 }, // EVAC2_NODE_1
  { x: 49.5, y: 64.8 }, // EVAC2_NODE_2
  { x: 49.7, y: 60.8 }, // EVAC2_NODE_3
  { x: 63.1, y: 61.7 }, // EVAC2_NODE_4
  { x: 63.1, y: 65.2 }, // EVAC2_NODE_5
];

export const NODES: Record<string, Node> = {
  // Your original area routes
  NODE_0: { x: 46.7, y: 76, name: "DOME" },
  NODE_1: { x: 59.2, y: 79.8, name: "PAVILION" },
  NODE_2: { x: 42.6, y: 72.2, name: "ASSEMBLY POINT", isAssembly: true },
  NODE_3: { x: 42.9, y: 70.9, name: "ASSEMBLY POINT", isAssembly: true },

  // Your previously added separate route nodes
  NEW_NODE_1: { x: 34.1, y: 80.6, name: "NEW_AREA_NODE_1" },
  NEW_NODE_2: { x: 34.2, y: 72.4, name: "ASSEMBLY POINT", isAssembly: true },

  // Sequential nodes for Building 2
  BLDG2_NODE_1: { x: 59.7, y: 66.6, name: "BLDG2_NODE_1" },
  BLDG2_NODE_2: { x: 56.5, y: 66.6, name: "BLDG2_NODE_2" },
  BLDG2_NODE_3: { x: 53.5, y: 66.5, name: "BLDG2_NODE_3" },
  BLDG2_NODE_4: { x: 50.2, y: 66.4, name: "BLDG2_NODE_4" },
  BLDG2_NODE_5: { x: 47.1, y: 66.3, name: "BLDG2_NODE_5" },
  BLDG2_NODE_6: { x: 43.2, y: 66.1, name: "BLDG2_NODE_6", isAssembly: true },

  // Sequential nodes for Building 3
  BLDG3_NODE_1: { x: 75.5, y: 67.8, name: "BLDG3_NODE_1" },
  BLDG3_NODE_2: { x: 72.2, y: 67.6, name: "BLDG3_NODE_2" },
  BLDG3_NODE_3: { x: 69.1, y: 67.6, name: "BLDG3_NODE_3" },
  BLDG3_NODE_4: { x: 66, y: 67.4, name: "BLDG3_NODE_4" },
  BLDG3_NODE_5: { x: 63, y: 67.3, name: "BLDG3_NODE_5" },
  BLDG3_NODE_6: { x: 61.1, y: 65.4, name: "ASSEMBLY POINT", isAssembly: true },

};

export const RAW_EDGES = [
  // Original edgess
  { from: 'NODE_0', to: 'NODE_2' },
  { from: 'NODE_1', to: 'NODE_3' },

  // New edges for the separate route
  { from: 'NEW_NODE_1', to: 'NEW_NODE_2' },

  // Sequential edges for Building 2
  { from: 'BLDG2_NODE_1', to: 'BLDG2_NODE_2' },
  { from: 'BLDG2_NODE_2', to: 'BLDG2_NODE_3' },
  { from: 'BLDG2_NODE_3', to: 'BLDG2_NODE_4' },
  { from: 'BLDG2_NODE_4', to: 'BLDG2_NODE_5' },
  { from: 'BLDG2_NODE_5', to: 'BLDG2_NODE_6' },

  // Sequential edges for Building 3
  { from: 'BLDG3_NODE_1', to: 'BLDG3_NODE_2' },
  { from: 'BLDG3_NODE_2', to: 'BLDG3_NODE_3' },
  { from: 'BLDG3_NODE_3', to: 'BLDG3_NODE_4' },
  { from: 'BLDG3_NODE_4', to: 'BLDG3_NODE_5' },
  { from: 'BLDG3_NODE_5', to: 'BLDG3_NODE_6' },
];

export const getDistanceInMeters = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) => {
  const lat1 = CAMPUS_LIMITS.north - (p1.y / 100) * (CAMPUS_LIMITS.north - CAMPUS_LIMITS.south);
  const lng1 = CAMPUS_LIMITS.west + (p1.x / 100) * (CAMPUS_LIMITS.east - CAMPUS_LIMITS.west);
  const lat2 = CAMPUS_LIMITS.north - (p2.y / 100) * (CAMPUS_LIMITS.north - CAMPUS_LIMITS.south);
  const lng2 = CAMPUS_LIMITS.west + (p2.x / 100) * (CAMPUS_LIMITS.east - CAMPUS_LIMITS.west);

  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const EDGES = RAW_EDGES.map((e) => ({
  ...e,
  weight: getDistanceInMeters(NODES[e.from], NODES[e.to]),
}));

export interface StepInstruction {
  msg: string;
  dist: number;
  targetNode: Node;
}

// Ray-casting algorithm: checks if user is anywhere inside a given polygon boundary
function isPointInsidePolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  let x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].x, yi = polygon[i].y;
    let xj = polygon[j].x, yj = polygon[j].y;
    
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function calculateShortestPath(
  userPos: { x: number; y: number },
  blockedNodes: Set<string>
): {
  pathString: string | null;
  directions: StepInstruction[];
  warningMessage?: string;
} {
  // If the user steps anywhere inside either evacuation polygon boundary, instantly clear route & trigger arrival
  if (isPointInsidePolygon(userPos, EVACUATION_POLYGON) || isPointInsidePolygon(userPos, EVACUATION_POLYGON_2)) {
    return {
      pathString: null,
      directions: [
        {
          msg: `You have safely arrived at the evacuation zone.`,
          dist: 0,
          targetNode: NODES.NODE_2,
        },
      ],
    };
  }

  const activeAssemblies = Object.keys(NODES).filter((n) => NODES[n].isAssembly && !blockedNodes.has(n));

  if (activeAssemblies.length === 0) {
    return {
      pathString: null,
      directions: [],
      warningMessage: 'Warning! All assembly areas are currently blocked.',
    };
  }

  const startNodeId = Object.keys(NODES).reduce((prev, curr) => {
    const dP = Math.hypot(NODES[prev].x - userPos.x, NODES[prev].y - userPos.y);
    const dC = Math.hypot(NODES[curr].x - userPos.x, NODES[curr].y - userPos.y);
    return dC < dP ? curr : prev;
  });

  let distances: Record<string, number> = {};
  let prev: Record<string, string | null> = {};
  let pq = new Set(Object.keys(NODES));

  Object.keys(NODES).forEach((n) => {
    distances[n] = Infinity;
    prev[n] = null;
  });
  distances[startNodeId] = 0;

  while (pq.size > 0) {
    let curr = [...pq].reduce((min, n) => (distances[n] < distances[min] ? n : min));
    pq.delete(curr);

    if (distances[curr] === Infinity) break;
    if (blockedNodes.has(curr)) continue;

    EDGES.forEach((e) => {
      if (blockedNodes.has(e.from) || blockedNodes.has(e.to)) return;

      if (e.from === curr || e.to === curr) {
        let neighbor = e.from === curr ? e.to : e.from;
        if (pq.has(neighbor) && !blockedNodes.has(neighbor)) {
          let alt = distances[curr] + e.weight;
          if (alt < distances[neighbor]) {
            distances[neighbor] = alt;
            prev[neighbor] = curr;
          }
        }
      }
    });
  }

  const destinationId = activeAssemblies.reduce((best, assembly) => 
    (distances[assembly] < distances[best] ? assembly : best)
  );

  if (distances[destinationId] === Infinity) {
    return {
      pathString: null,
      directions: [],
      warningMessage: 'Warning! All routes to safe assembly zones are currently blocked by hazards.',
    };
  }

  let pathNodes: string[] = [];
  let currNode: string | null = destinationId;

  while (currNode) {
    pathNodes.unshift(currNode);
    currNode = prev[currNode];
  }

  let rawSteps: { msg: string; dist: number; type: 'STRAIGHT' | 'TURN' | 'ARRIVE'; targetNode: Node }[] = [];

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const nodeA = NODES[pathNodes[i]];
    const nodeB = NODES[pathNodes[i + 1]];
    const distMeters = Math.round(getDistanceInMeters(nodeA, nodeB));

    if (i === pathNodes.length - 2) {
      rawSteps.push({ msg: `Arrive safely at ${nodeB.name}`, dist: distMeters, type: 'ARRIVE', targetNode: nodeB });
      break;
    }

    rawSteps.push({ msg: 'Continue straight down the pathway', dist: distMeters, type: 'STRAIGHT', targetNode: nodeB });
  }

  return {
    pathString: pathNodes.map((n) => `${NODES[n].x},${NODES[n].y}`).join(' '),
    directions: rawSteps,
  };
}