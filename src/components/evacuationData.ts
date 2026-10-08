export type MapPoint = {
  x: number;
  y: number;
};

export type EvacuationArea = {
  id: string;
  name: string;
  polygon: MapPoint[];
  center: MapPoint;
};

export const EVACUATION_AREAS: EvacuationArea[] = [
  {
    id: 'EVAC_AREA_1',
    name: 'Evacuation Area 1',

    polygon: [
      { x: 28.68, y: 56.21 },
      { x: 40.62, y: 55.99 },
      { x: 40.12, y: 73.82 },
      { x: 28.29, y: 73.55 },
    ],

    center: {
      x: 34.43,
      y: 64.89,
    },
  },
];

/**
 * Checks whether a point is inside a polygon.
 *
 * Used later for:
 * - detecting arrival at an evacuation area
 * - determining if the user is already safe
 */
export function isPointInsidePolygon(
  point: MapPoint,
  polygon: MapPoint[]
): boolean {
  let inside = false;

  const { x, y } = point;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;

    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects =
      yi > y !== yj > y &&
      x <
        ((xj - xi) * (y - yi)) /
          (yj - yi) +
          xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Returns the evacuation area containing the user.
 *
 * Returns null if the user is not currently inside
 * an evacuation area.
 */
export function getCurrentEvacuationArea(
  position: MapPoint
): EvacuationArea | null {
  for (const area of EVACUATION_AREAS) {
    if (
      isPointInsidePolygon(
        position,
        area.polygon
      )
    ) {
      return area;
    }
  }

  return null;
}