// navigationUtils.ts

export type Node = { x: number; y: number; name: string; isExit?: boolean };

export const CAMPUS_LIMITS = {
  north: 13.165928,
  south: 13.162526,
  west: 123.747779,
  east: 123.751222,
};

export const NODES: Record<string, Node> = {
  NODE_1: { x: 87.7, y: 39.9, name: 'Gate 4', isExit: true },
  NODE_2: { x: 88.1, y: 30.6, name: 'Node 2' },
  NODE_3: { x: 87.9, y: 30.6, name: 'Node 3' },
  NODE_4: { x: 64.4, y: 29.6, name: 'Node 4' },
  NODE_5: { x: 64.1, y: 29.9, name: 'Node 5' },
  NODE_6: { x: 46.3, y: 29.1, name: 'Node 6' },
  NODE_7: { x: 46.4, y: 28.9, name: 'Node 7' },
  NODE_8: { x: 45.0, y: 52.8, name: 'Node 8' },
  NODE_9: { x: 44.9, y: 53.3, name: 'Node 9' },
  NODE_10: { x: 44.0, y: 73.4, name: 'Node 10' },
  NODE_11: { x: 44.0, y: 73.3, name: 'Node 11' },
  NODE_12: { x: 58.1, y: 74.3, name: 'Node 12' },
  NODE_13: { x: 58.4, y: 74.0, name: 'Node 13' },
  NODE_14: { x: 86.1, y: 75.0, name: 'Node 14' },
  NODE_15: { x: 86.4, y: 74.5, name: 'Node 15' },
  NODE_16: { x: 86.6, y: 71.6, name: 'Gate 3', isExit: true },
  NODE_17: { x: 45.1, y: 53.1, name: 'Node 17' },
  NODE_18: { x: 62.7, y: 53.1, name: 'Node 18' },
  NODE_19: { x: 62.9, y: 53.1, name: 'Node 19' },
  NODE_20: { x: 86.8, y: 52.9, name: 'Node 20' },
  NODE_21: { x: 86.9, y: 52.9, name: 'Node 21' },
  NODE_22: { x: 87.8, y: 43.2, name: 'Node 22' },
  NODE_23: { x: 28.6, y: 73.2, name: 'NODE_23' },
  NODE_24: { x: 43.9, y: 73.3, name: 'NODE_24' },
  // Newly added indoor / building nodes
  NODE_25: { x: 43.6, y: 73.7, name: 'Indoor Entrance' },
  NODE_26: { x: 39.9, y: 76.2, name: 'Indoor Hallway 1' },
  NODE_27: { x: 39.9, y: 76.3, name: 'Indoor Hallway 2' },
  NODE_28: { x: 38.4, y: 78.7, name: 'Indoor Room A' },
  NODE_29: { x: 38.4, y: 78.6, name: 'Indoor Room B' },
  NODE_30: { x: 38.2, y: 81.2, name: 'Deep Indoor Room / Lab' },
};

export const RAW_EDGES = [
  { from: 'NODE_1', to: 'NODE_2' },
  { from: 'NODE_2', to: 'NODE_3' },
  { from: 'NODE_3', to: 'NODE_4' },
  { from: 'NODE_4', to: 'NODE_5' },
  { from: 'NODE_5', to: 'NODE_6' },
  { from: 'NODE_6', to: 'NODE_7' },
  { from: 'NODE_7', to: 'NODE_8' },
  { from: 'NODE_8', to: 'NODE_9' },
  { from: 'NODE_9', to: 'NODE_10' },
  { from: 'NODE_10', to: 'NODE_11' },
  { from: 'NODE_11', to: 'NODE_12' },
  { from: 'NODE_12', to: 'NODE_13' },
  { from: 'NODE_13', to: 'NODE_14' },
  { from: 'NODE_14', to: 'NODE_15' },
  { from: 'NODE_15', to: 'NODE_16' },
  { from: 'NODE_17', to: 'NODE_18' },
  { from: 'NODE_18', to: 'NODE_19' },
  { from: 'NODE_19', to: 'NODE_20' },
  { from: 'NODE_20', to: 'NODE_21' },
  { from: 'NODE_21', to: 'NODE_22' },
  { from: 'NODE_9', to: 'NODE_17' },
  { from: 'NODE_22', to: 'NODE_1' },
  { from: 'NODE_23', to: 'NODE_24' },
  { from: 'NODE_24', to: 'NODE_10' },
  // Indoor pathway connections
  { from: 'NODE_25', to: 'NODE_26' },
  { from: 'NODE_26', to: 'NODE_27' },
  { from: 'NODE_27', to: 'NODE_28' },
  { from: 'NODE_28', to: 'NODE_29' },
  { from: 'NODE_29', to: 'NODE_30' },
  // Bridge connecting indoor network to the outdoor campus network (at NODE_10)
  { from: 'NODE_25', to: 'NODE_10' },
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

export function calculateShortestPath(
  userPos: { x: number; y: number },
  blockedNodes: Set<string>
): {
  pathString: string | null;
  directions: StepInstruction[];
  warningMessage?: string;
} {
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

  const activeGates = Object.keys(NODES).filter((n) => NODES[n].isExit && !blockedNodes.has(n));

  if (activeGates.length === 0) {
    return {
      pathString: null,
      directions: [],
      warningMessage: 'Warning! All exit gates are currently blocked.',
    };
  }

  const destinationId = activeGates.reduce((best, gate) => (distances[gate] < distances[best] ? gate : best));

  if (distances[destinationId] === Infinity) {
    return {
      pathString: null,
      directions: [],
      warningMessage: 'Warning! All routes to exits are currently blocked by fire hazards.',
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
      rawSteps.push({ msg: `Arrive at ${nodeB.name}`, dist: distMeters, type: 'ARRIVE', targetNode: nodeB });
      break;
    }

    let action = 'Continue straight down the walkway';
    let stepType: 'STRAIGHT' | 'TURN' = 'STRAIGHT';

    if (i > 0) {
      const nodePrev = NODES[pathNodes[i - 1]];
      const angle1 = Math.atan2(nodeA.y - nodePrev.y, nodeA.x - nodePrev.x) * (180 / Math.PI);
      const angle2 = Math.atan2(nodeB.y - nodeA.y, nodeB.x - nodeA.x) * (180 / Math.PI);

      let turnAngle = angle2 - angle1;
      while (turnAngle > 180) turnAngle -= 360;
      while (turnAngle < -180) turnAngle += 360;

      if (turnAngle > 25 && turnAngle <= 135) {
        action = 'Turn right';
        stepType = 'TURN';
      } else if (turnAngle < -25 && turnAngle >= -135) {
        action = 'Turn left';
        stepType = 'TURN';
      } else if (turnAngle > 135 || turnAngle < -135) {
        action = 'Make a U-turn';
        stepType = 'TURN';
      }
    }

    rawSteps.push({ msg: action, dist: distMeters, type: stepType, targetNode: nodeB });
  }

  let condensedSteps: StepInstruction[] = [];

  for (const step of rawSteps) {
    if (condensedSteps.length === 0) {
      condensedSteps.push({ msg: step.msg, dist: step.dist, targetNode: step.targetNode });
      continue;
    }

    const prevStep = condensedSteps[condensedSteps.length - 1];

    if (step.dist < 3 && step.type !== 'ARRIVE') {
      prevStep.dist += step.dist;
      prevStep.targetNode = step.targetNode;
      continue;
    }

    const isPrevStraight = prevStep.msg.includes('straight') || prevStep.msg.includes('Head');
    const isCurrStraight = step.type === 'STRAIGHT';

    if (isPrevStraight && isCurrStraight) {
      prevStep.dist += step.dist;
      prevStep.targetNode = step.targetNode;
    } else {
      condensedSteps.push({ msg: step.msg, dist: step.dist, targetNode: step.targetNode });
    }
  }

  return {
    pathString: pathNodes.map((n) => `${NODES[n].x},${NODES[n].y}`).join(' '),
    directions: condensedSteps,
  };
}