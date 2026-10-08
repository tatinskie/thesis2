import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Svg, {
  Polygon,
} from 'react-native-svg';

import {
  EVACUATION_AREAS,
} from './evacuationData';

type EvacuationAreasProps = {
  mapSize: number;
  activeAreaId?: string | null;
};

export default function EvacuationAreas({
  mapSize,
  activeAreaId = null,
}: EvacuationAreasProps) {
  // Hide evacuation areas completely
  // until navigation selects one.
  if (!activeAreaId) {
    return null;
  }

  // Find only the evacuation area
  // selected by the routing algorithm.
  const activeArea =
    EVACUATION_AREAS.find(
      (area) =>
        area.id === activeAreaId
    );

  // Safety check in case an invalid ID is passed.
  if (!activeArea) {
    return null;
  }

  const points =
    activeArea.polygon
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(' ');

  return (
    <>
      {/* ================================= */}
      {/* EVACUATION AREA POLYGON */}
      {/* ================================= */}

      <Svg
        width={mapSize}
        height={mapSize}
        viewBox="0 0 100 100"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* Soft white outline */}
        <Polygon
          points={points}
          fill="none"
          stroke="rgba(255,255,255,0.90)"
          strokeWidth={0.9}
          strokeLinejoin="round"
        />

        {/* Active evacuation area */}
        <Polygon
          points={points}
          fill="rgba(34,197,94,0.30)"
          stroke="#15803D"
          strokeWidth={0.45}
          strokeLinejoin="round"
        />
      </Svg>

      {/* ================================= */}
      {/* EVACUATION AREA MARKER */}
      {/* ================================= */}

      <View
        pointerEvents="none"
        style={[
          styles.markerPosition,
          {
            left:
              (activeArea.center.x /
                100) *
              mapSize,

            top:
              (activeArea.center.y /
                100) *
              mapSize,
          },
        ]}
      >
        <View
          style={styles.activeMarker}
        >
          <Text
            style={styles.activeCheck}
          >
            ✓
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  markerPosition: {
    position: 'absolute',

    transform: [
      {
        translateX: -14,
      },
      {
        translateY: -14,
      },
    ],

    zIndex: 25,
  },

  activeMarker: {
    width: 28,
    height: 28,

    borderRadius: 14,

    backgroundColor: '#16A34A',

    borderWidth: 2,
    borderColor: '#FFFFFF',

    alignItems: 'center',
    justifyContent: 'center',

    elevation: 4,

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.18,
    shadowRadius: 2,
  },

  activeCheck: {
    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '900',
  },
});