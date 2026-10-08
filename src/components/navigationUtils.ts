// navigationUtils.ts
//
// Outdoor-only navigation version.
// Indoor room, door, hallway, and Angelico test nodes are temporarily removed.

export type MapPoint = {
  x: number;
  y: number;
};

export type Node = {
  x: number;
  y: number;
  name: string;
  isExit?: boolean;
};

export type Edge = {
  from: string;
  to: string;
};

export type RouteResult =
  | {
      success: true;
      startNodeId: string;
      exitNodeId: string;
      exitName: string;
      distance: number;
      path: string[];
      points: MapPoint[];
      pathString: string;
    }
  | {
      success: false;
      message: string;
    };

export const CAMPUS_LIMITS = {
  north: 13.165857,
  south: 13.162422,
  west: 123.747844,
  east: 123.751555,
};

// Add only OUTDOOR path nodes here later.
export const NODES: Record<string, Node> = {};

// Add only OUTDOOR path edges here later.
export const EDGES: Edge[] = [];

export function gpsToMapPosition(
  latitude: number,
  longitude: number
) {
  const x =
    ((longitude - CAMPUS_LIMITS.west) /
      (CAMPUS_LIMITS.east - CAMPUS_LIMITS.west)) *
    100;

  const y =
    ((CAMPUS_LIMITS.north - latitude) /
      (CAMPUS_LIMITS.north - CAMPUS_LIMITS.south)) *
    100;

  const isInsideCampus =
    x >= 0 &&
    x <= 100 &&
    y >= 0 &&
    y <= 100;

  return {
    x,
    y,
    isInsideCampus,
  };
}

export function getMapDistance(
  a: MapPoint,
  b: MapPoint
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function mapPositionToGps(point: MapPoint) {
  const longitude =
    CAMPUS_LIMITS.west +
    (point.x / 100) *
      (CAMPUS_LIMITS.east - CAMPUS_LIMITS.west);

  const latitude =
    CAMPUS_LIMITS.north -
    (point.y / 100) *
      (CAMPUS_LIMITS.north - CAMPUS_LIMITS.south);

  return {
    latitude,
    longitude,
  };
}

export function getDistanceInMeters(
  a: MapPoint,
  b: MapPoint
) {
  const gpsA = mapPositionToGps(a);
  const gpsB = mapPositionToGps(b);

  const earthRadius = 6371000;
  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const lat1 = toRadians(gpsA.latitude);
  const lat2 = toRadians(gpsB.latitude);

  const deltaLat = toRadians(
    gpsB.latitude - gpsA.latitude
  );

  const deltaLon = toRadians(
    gpsB.longitude - gpsA.longitude
  );

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine)
    );

  return earthRadius * angularDistance;
}

export function findNearestNode(
  point: MapPoint
) {
  let nearestNodeId: string | null = null;
  let nearestDistance = Infinity;

  for (const [nodeId, node] of Object.entries(NODES)) {
    const distance = getMapDistance(point, node);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestNodeId = nodeId;
    }
  }

  return nearestNodeId;
}

function getNeighbors(nodeId: string) {
  const currentNode = NODES[nodeId];

  if (!currentNode) {
    return [];
  }

  const neighbors: {
    id: string;
    distance: number;
  }[] = [];

  for (const edge of EDGES) {
    let neighborId: string | null = null;

    if (edge.from === nodeId) {
      neighborId = edge.to;
    } else if (edge.to === nodeId) {
      neighborId = edge.from;
    }

    if (!neighborId) {
      continue;
    }

    const neighborNode = NODES[neighborId];

    if (!neighborNode) {
      continue;
    }

    neighbors.push({
      id: neighborId,
      distance: getDistanceInMeters(
        currentNode,
        neighborNode
      ),
    });
  }

  return neighbors;
}

function dijkstra(
  startNodeId: string,
  endNodeId: string
) {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set(Object.keys(NODES));

  for (const nodeId of Object.keys(NODES)) {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
  }

  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    let currentNodeId: string | null = null;
    let smallestDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < smallestDistance) {
        smallestDistance = distances[nodeId];
        currentNodeId = nodeId;
      }
    }

    if (
      currentNodeId === null ||
      smallestDistance === Infinity
    ) {
      break;
    }

    if (currentNodeId === endNodeId) {
      break;
    }

    unvisited.delete(currentNodeId);

    for (const neighbor of getNeighbors(currentNodeId)) {
      if (!unvisited.has(neighbor.id)) {
        continue;
      }

      const candidateDistance =
        distances[currentNodeId] +
        neighbor.distance;

      if (
        candidateDistance <
        distances[neighbor.id]
      ) {
        distances[neighbor.id] =
          candidateDistance;

        previous[neighbor.id] =
          currentNodeId;
      }
    }
  }

  if (distances[endNodeId] === Infinity) {
    return null;
  }

  const path: string[] = [];
  let current: string | null = endNodeId;

  while (current) {
    path.unshift(current);
    current = previous[current];
  }

  return {
    path,
    distance: distances[endNodeId],
  };
}

export function calculateNearestExit(
  userPosition: MapPoint
): RouteResult {
  if (
    Object.keys(NODES).length === 0 ||
    EDGES.length === 0
  ) {
    return {
      success: false,
      message:
        'Outdoor navigation nodes have not been added yet.',
    };
  }

  const startNodeId =
    findNearestNode(userPosition);

  if (!startNodeId) {
    return {
      success: false,
      message:
        'Could not find a nearby outdoor navigation node.',
    };
  }

  const exitIds = Object.entries(NODES)
    .filter(([, node]) => node.isExit)
    .map(([nodeId]) => nodeId);

  if (exitIds.length === 0) {
    return {
      success: false,
      message:
        'No outdoor exit nodes have been defined yet.',
    };
  }

  let bestRoute:
    | {
        exitNodeId: string;
        distance: number;
        path: string[];
      }
    | null = null;

  for (const exitNodeId of exitIds) {
    const result = dijkstra(
      startNodeId,
      exitNodeId
    );

    if (!result) {
      continue;
    }

    if (
      !bestRoute ||
      result.distance < bestRoute.distance
    ) {
      bestRoute = {
        exitNodeId,
        distance: result.distance,
        path: result.path,
      };
    }
  }

  if (!bestRoute) {
    return {
      success: false,
      message:
        'No reachable outdoor exit was found.',
    };
  }

  const points: MapPoint[] = [
    userPosition,
    ...bestRoute.path.map(nodeId => ({
      x: NODES[nodeId].x,
      y: NODES[nodeId].y,
    })),
  ];

  return {
    success: true,
    startNodeId,
    exitNodeId: bestRoute.exitNodeId,
    exitName: NODES[bestRoute.exitNodeId].name,
    distance: bestRoute.distance,
    path: bestRoute.path,
    points,
    pathString: points
      .map(point => `${point.x},${point.y}`)
      .join(' '),
  };
}

export function calculateShortestPath(
  userPosition: MapPoint
): RouteResult {
  return calculateNearestExit(userPosition);
}
