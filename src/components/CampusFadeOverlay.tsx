
import Svg, {
    Defs,
    LinearGradient,
    Rect,
    Stop,
} from 'react-native-svg';

type CampusFadeOverlayProps = {
  mapSize: number;
};

export default function CampusFadeOverlay({
  mapSize,
}: CampusFadeOverlayProps) {
  return (
    <Svg
      width={mapSize}
      height={mapSize}
      viewBox="0 0 100 100"
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      <Defs>
        <LinearGradient
          id="fadeLeft"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <Stop
            offset="0"
            stopColor="#F8FAFC"
            stopOpacity="0.4"
          />

          <Stop
            offset="1"
            stopColor="#F8FAFC"
            stopOpacity="0"
          />
        </LinearGradient>

        <LinearGradient
          id="fadeRight"
          x1="1"
          y1="0"
          x2="0"
          y2="0"
        >
          <Stop
            offset="0"
            stopColor="#F8FAFC"
            stopOpacity="0.4"
          />

          <Stop
            offset="1"
            stopColor="#F8FAFC"
            stopOpacity="0"
          />
        </LinearGradient>

        <LinearGradient
          id="fadeTop"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <Stop
            offset="0"
            stopColor="#F8FAFC"
            stopOpacity="0.7"
          />

          <Stop
            offset="1"
            stopColor="#F8FAFC"
            stopOpacity="0"
          />
        </LinearGradient>

        <LinearGradient
          id="fadeBottom"
          x1="0"
          y1="1"
          x2="0"
          y2="0"
        >
          <Stop
            offset="0"
            stopColor="#F8FAFC"
            stopOpacity="0.7"
          />

          <Stop
            offset="1"
            stopColor="#F8FAFC"
            stopOpacity="0"
          />
        </LinearGradient>
      </Defs>

      <Rect
        x="0"
        y="0"
        width="4"
        height="100"
        fill="url(#fadeLeft)"
      />

      <Rect
        x="94"
        y="0"
        width="6"
        height="100"
        fill="url(#fadeRight)"
      />

      <Rect
        x="0"
        y="0"
        width="100"
        height="6"
        fill="url(#fadeTop)"
      />

      <Rect
        x="0"
        y="94"
        width="100"
        height="6"
        fill="url(#fadeBottom)"
      />
    </Svg>
  );
}