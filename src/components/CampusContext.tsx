
import UstContextSvg from '../../assets/images/ust-context-gps-light.svg';

type CampusContextProps = {
  mapSize: number;
};

export default function CampusContext({
  mapSize,
}: CampusContextProps) {
  const contextScale = 1200 / 800;

  const contextSize =
    mapSize * contextScale;

  const contextOffset =
    (contextSize - mapSize) / 2;

  return (
    <UstContextSvg
      width={contextSize}
      height={contextSize}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -contextOffset,
        top: -contextOffset,
      }}
    />
  );
}