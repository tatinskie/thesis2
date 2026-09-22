import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Polyline } from 'react-native-svg';

// @ts-expect-error Expo SVG Transformer runtime module
import UstMapSvg from '../../assets/images/ust.svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_SIZE = 1200; 

const CAMPUS_LIMITS = {
  north: 13.165928, south: 13.162526, west: 123.747779, east: 123.751222,
};

// Calculate distance in meters between two canvas coordinate points (% values)
const getDistanceInMeters = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
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

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

type Node = { x: number; y: number; name: string; isExit?: boolean };

const NODES: Record<string, Node> = {
  NODE_1: { x: 87.7, y: 39.9, name: "Gate 4", isExit: true },
  NODE_2: { x: 88.1, y: 30.6, name: "NODE_2" },
  NODE_3: { x: 87.9, y: 30.6, name: "NODE_3" },
  NODE_4: { x: 64.4, y: 29.6, name: "NODE_4" },
  NODE_5: { x: 64.1, y: 29.9, name: "NODE_5" },
  NODE_6: { x: 46.3, y: 29.1, name: "NODE_6" },
  NODE_7: { x: 46.4, y: 28.9, name: "NODE_7" },
  NODE_8: { x: 45.0, y: 52.8, name: "NODE_8" },
  NODE_9: { x: 44.9, y: 53.3, name: "NODE_9" },
  NODE_10: { x: 44.0, y: 73.4, name: "NODE_10" },
  NODE_11: { x: 44.0, y: 73.3, name: "NODE_11" },
  NODE_12: { x: 58.1, y: 74.3, name: "NODE_12" },
  NODE_13: { x: 58.4, y: 74.0, name: "NODE_13" },
  NODE_14: { x: 86.1, y: 75.0, name: "NODE_14" },
  NODE_15: { x: 86.4, y: 74.5, name: "NODE_15" },
  NODE_16: { x: 86.6, y: 71.6, name: "Gate 3", isExit: true },
  NODE_17: { x: 45.1, y: 53.1, name: "NODE_17" },
  NODE_18: { x: 62.7, y: 53.1, name: "NODE_18" },
  NODE_19: { x: 62.9, y: 53.1, name: "NODE_19" },
  NODE_20: { x: 86.8, y: 52.9, name: "NODE_20" },
  NODE_21: { x: 86.9, y: 52.9, name: "NODE_21" },
  NODE_22: { x: 87.8, y: 43.2, name: "NODE_22" },
};

const RAW_EDGES = [
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
];

const EDGES = RAW_EDGES.map(e => ({
  ...e,
  weight: getDistanceInMeters(NODES[e.from], NODES[e.to])
}));

export default function HomeScreen() {
  // Navigation & User Position States
  const [userPos, setUserPos] = useState({ x: 45, y: 52.8 });
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [directions, setDirections] = useState<{ msg: string; dist: number; targetNode: Node }[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [heading, setHeading] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  const prevHeading = useRef(0);

  // Refs for access within location listener without causing listener re-subscription
  const directionsRef = useRef<{ msg: string; dist: number; targetNode: Node }[]>([]);
  const stepIdxRef = useRef<number>(0);
  const isMutedRef = useRef<boolean>(false);

  useEffect(() => { directionsRef.current = directions; }, [directions]);
  useEffect(() => { stepIdxRef.current = currentStepIndex; }, [currentStepIndex]);
  useEffect(() => { isMutedRef.current = isVoiceMuted; }, [isVoiceMuted]);

  // Voice speech helper
  const speakInstruction = (text: string) => {
    if (isMutedRef.current) return;
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.95,
    });
  };

  // 1. Continuous GPS Tracking & Dynamic Voice Step Triggers
  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 1 },
        (location) => {
          const { latitude, longitude } = location.coords;
          let x = ((longitude - CAMPUS_LIMITS.west) / (CAMPUS_LIMITS.east - CAMPUS_LIMITS.west)) * 100;
          let y = ((CAMPUS_LIMITS.north - latitude) / (CAMPUS_LIMITS.north - CAMPUS_LIMITS.south)) * 100;

          const newPos = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
          setUserPos(newPos);

          // LIVE VOICE GUIDANCE: Check proximity to the current target step node
          const activeDirections = directionsRef.current;
          const activeStepIdx = stepIdxRef.current;

          if (activeDirections.length > 0 && activeStepIdx < activeDirections.length) {
            const targetStep = activeDirections[activeStepIdx];
            const distToStepNode = getDistanceInMeters(newPos, targetStep.targetNode);

            // Trigger voice when user moves within 5 meters of the upcoming maneuver/node
            if (distToStepNode <= 5) {
              const nextIdx = activeStepIdx + 1;
              if (nextIdx < activeDirections.length) {
                const nextStep = activeDirections[nextIdx];
                speakInstruction(`In ${nextStep.dist} meters, ${nextStep.msg}`);
                setCurrentStepIndex(nextIdx);
              } else {
                speakInstruction("You have arrived at your destination.");
                setCurrentStepIndex(activeDirections.length);
              }
            }
          }
        }
      );
    })();

    // 2. Compass Magnetometer Heading Updates
    const magSub = Magnetometer.addListener(data => {
      let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      let target = Math.round(angle < 0 ? angle + 360 : angle);
      let smoothed = prevHeading.current + 0.2 * (target - prevHeading.current);
      prevHeading.current = smoothed;
      setHeading(Math.round(smoothed));
    });
    Magnetometer.setUpdateInterval(100);

    return () => {
      if (locationSub) locationSub.remove();
      magSub.remove();
      Speech.stop();
    };
  }, []);

  // 3. Route Calculation with Step Condensation
  const handleGenerateRoute = (targetNodeKey?: string) => {
    const startNodeId = Object.keys(NODES).reduce((prev, curr) => {
      const dP = Math.hypot(NODES[prev].x - userPos.x, NODES[prev].y - userPos.y);
      const dC = Math.hypot(NODES[curr].x - userPos.x, NODES[curr].y - userPos.y);
      return dC < dP ? curr : prev;
    });

    let distances: Record<string, number> = {}; 
    let prev: Record<string, string | null> = {}; 
    let pq = new Set(Object.keys(NODES));
    
    Object.keys(NODES).forEach(n => { distances[n] = Infinity; prev[n] = null; });
    distances[startNodeId] = 0;

    while (pq.size > 0) {
      let curr = [...pq].reduce((min, n) => distances[n] < distances[min] ? n : min);
      pq.delete(curr);

      if (distances[curr] === Infinity) break;

      EDGES.forEach(e => {
        if (e.from === curr || e.to === curr) {
          let neighbor = e.from === curr ? e.to : e.from;
          if (pq.has(neighbor)) {
            let alt = distances[curr] + e.weight;
            if (alt < distances[neighbor]) { 
              distances[neighbor] = alt; 
              prev[neighbor] = curr; 
            }
          }
        }
      });
    }

    let destinationId = targetNodeKey;
    if (!destinationId) {
      const activeGates = Object.keys(NODES).filter(n => NODES[n].isExit);
      destinationId = activeGates.reduce((best, gate) => 
        distances[gate] < distances[best] ? gate : best
      );
    }

    if (distances[destinationId] === Infinity) return;

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

      const isDestination = i === pathNodes.length - 2;
      const hasNamedLandmark = !nodeB.name.startsWith('NODE_');

      if (isDestination) {
        rawSteps.push({ msg: `Arrive at ${nodeB.name}`, dist: distMeters, type: 'ARRIVE', targetNode: nodeB });
        break;
      }

      let action = 'Continue straight';
      let stepType: 'STRAIGHT' | 'TURN' = 'STRAIGHT';

      if (i === 0) {
        action = hasNamedLandmark 
          ? `Head towards ${nodeB.name}` 
          : `Head straight down the walkway`;
      } else {
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

      if (hasNamedLandmark) {
        action += ` towards ${nodeB.name}`;
      }

      rawSteps.push({ msg: action, dist: distMeters, type: stepType, targetNode: nodeB });
    }

    let condensedSteps: { msg: string; dist: number; targetNode: Node }[] = [];

    for (const step of rawSteps) {
      if (condensedSteps.length === 0) {
        condensedSteps.push({ msg: step.msg, dist: step.dist, targetNode: step.targetNode });
        continue;
      }

      const prev = condensedSteps[condensedSteps.length - 1];

      if (step.dist < 3 && step.type !== 'ARRIVE') {
        prev.dist += step.dist;
        prev.targetNode = step.targetNode;
        continue;
      }

      const isPrevStraight = prev.msg.includes('straight') || prev.msg.includes('Head');
      const isCurrStraight = step.type === 'STRAIGHT';

      if (isPrevStraight && isCurrStraight) {
        prev.dist += step.dist;
        prev.targetNode = step.targetNode;
        if (step.msg.includes('towards') && !prev.msg.includes('towards')) {
          prev.msg = step.msg;
        }
      } else {
        condensedSteps.push({ msg: step.msg, dist: step.dist, targetNode: step.targetNode });
      }
    }

    setDirections(condensedSteps);
    setCurrentStepIndex(0);
    setActiveRoute(pathNodes.map(n => `${NODES[n].x},${NODES[n].y}`).join(' '));

    // Announce initial instruction out loud
    if (condensedSteps.length > 0) {
      const firstStep = condensedSteps[0];
      speakInstruction(`In ${firstStep.dist} meters, ${firstStep.msg.toLowerCase()}`);
    }
  };

  const handleSelectNode = (key: string) => {
    setSelectedNodeKey(key);
    handleGenerateRoute(key);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Interactive Zoomable SVG Map */}
        <View style={StyleSheet.absoluteFill}>
          <ReactNativeZoomableView
            maxZoom={4}
            minZoom={0.5}
            zoomStep={0.5}
            initialZoom={1}
            contentWidth={MAP_SIZE}
            contentHeight={MAP_SIZE}
            panEnabled={true}
            zoomEnabled={true}
            style={{ flex: 1 }}
          >
            <View style={styles.mapContainer}>
              <UstMapSvg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />

              <Svg height="100%" width="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={styles.svgLayer} pointerEvents="none">
                <G opacity="0.25" stroke="#EAB308" strokeWidth="0.4">
                  {EDGES.map((e, i) => (
                    <Polyline key={i} points={`${NODES[e.from].x},${NODES[e.from].y} ${NODES[e.to].x},${NODES[e.to].y}`} />
                  ))}
                </G>
                
                {activeRoute && (
                  <Polyline 
                    points={`${userPos.x},${userPos.y} ${activeRoute}`} 
                    fill="none" 
                    stroke="#FF3B30" 
                    strokeWidth="0.8" 
                    strokeLinejoin="round" 
                    strokeLinecap="round"
                    strokeDasharray="1.2,0.8" 
                  />
                )}

                {/* Real-time Moving User Location Icon */}
                <Circle cx={userPos.x} cy={userPos.y} r="1.2" fill="#007AFF" stroke="#fff" strokeWidth="0.3" />
              </Svg>

              {Object.entries(NODES).map(([key, node]) => {
                const isSelected = selectedNodeKey === key;
                const isExit = node.isExit;
                const dotColor = isExit ? "#4CD964" : isSelected ? "#EAB308" : "#FF9500";

                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.7}
                    onPress={() => handleSelectNode(key)}
                    style={[styles.markerTouchArea, { left: `${node.x}%`, top: `${node.y}%` }]}
                  >
                    <View style={[styles.markerDot, { backgroundColor: dotColor, transform: [{ scale: isSelected ? 1.3 : 1 }] }]} />
                    {isSelected && (
                      <View style={styles.labelBadge}>
                        <Text style={styles.labelBadgeText}>{node.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ReactNativeZoomableView>
        </View>

        {/* Top Header Controls */}
        <SafeAreaView style={styles.headerWrapper} pointerEvents="box-none">
          <View style={styles.headerCard}>
            <View>
              <Text style={styles.brand}>TOMA<Text style={{ color: '#EAB308' }}>SAFE</Text></Text>
              <Text style={styles.subText}>UST-LEGAZPI NAVIGATION</Text>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={() => {
                  const nextMuteState = !isVoiceMuted;
                  setIsVoiceMuted(nextMuteState);
                  if (nextMuteState) Speech.stop();
                  else speakInstruction("Voice navigation enabled");
                }}
              >
                <MaterialCommunityIcons 
                  name={isVoiceMuted ? "volume-off" : "volume-high"} 
                  size={20} 
                  color={isVoiceMuted ? "#8E8E93" : "#007AFF"} 
                />
              </TouchableOpacity>

              <View style={[styles.compass, { transform: [{ rotate: `${heading}deg` }] }]}>
                <MaterialCommunityIcons name="navigation" size={20} color="#FF3B30" />
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* Bottom Directions Panel */}
        <View style={styles.bottomPanel}>
          {selectedNodeKey && (
            <View style={styles.selectedBanner}>
              <Text style={styles.selectedTitle}>Selected: {NODES[selectedNodeKey].name}</Text>
              <TouchableOpacity onPress={() => setSelectedNodeKey(null)}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            style={styles.btn} 
            onPress={() => handleGenerateRoute(selectedNodeKey || undefined)}
          >
            <Text style={styles.btnText}>
              {selectedNodeKey ? `NAVIGATE TO ${NODES[selectedNodeKey].name.toUpperCase()}` : "CALCULATE NEAREST EXIT"}
            </Text>
          </TouchableOpacity>
          
          <ScrollView style={styles.stepScroller} showsVerticalScrollIndicator={false}>
            {directions.length > 0 ? (
              directions.map((step, i) => {
                const isActiveStep = i === currentStepIndex;
                return (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.stepItem, isActiveStep && styles.activeStepItem]}
                    onPress={() => {
                      setCurrentStepIndex(i);
                      speakInstruction(`In ${step.dist} meters, ${step.msg}`);
                    }}
                  >
                    <View style={[styles.stepNum, isActiveStep && styles.activeStepNum]}>
                      <Text style={[styles.stepNumText, isActiveStep && styles.activeStepNumText]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepMain, isActiveStep && styles.activeStepMain]}>{step.msg}</Text>
                      <Text style={styles.stepSub}>{step.dist}m away</Text>
                    </View>
                    {isActiveStep && (
                      <MaterialCommunityIcons name="volume-high" size={16} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {selectedNodeKey ? "Tap navigate to calculate path." : "Tap any walkway marker on the map to calculate a route."}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  mapContainer: { width: MAP_SIZE, height: MAP_SIZE, position: 'relative' },
  svgLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  markerTouchArea: { position: 'absolute', width: 32, height: 32, marginLeft: -16, marginTop: -16, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  markerDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFFFFF', elevation: 4 },
  labelBadge: { position: 'absolute', top: -20, backgroundColor: 'rgba(28, 28, 30, 0.9)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  labelBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },

  headerWrapper: { position: 'absolute', top: 10, left: 0, right: 0, zIndex: 10 },
  headerCard: {
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    elevation: 8,
  },
  brand: { fontSize: 20, fontWeight: '900', color: '#1C1C1E' },
  subText: { fontSize: 8, fontWeight: '700', color: '#8E8E93', letterSpacing: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 34, height: 34, backgroundColor: '#F2F2F7', borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  compass: { width: 34, height: 34, backgroundColor: '#F2F2F7', borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    zIndex: 10,
  },
  selectedBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 2 },
  selectedTitle: { fontSize: 12, fontWeight: '800', color: '#1C1C1E' },
  clearText: { fontSize: 11, fontWeight: '700', color: '#FF3B30' },
  btn: { backgroundColor: '#1C1C1E', paddingVertical: 12, borderRadius: 14, alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  stepScroller: { flex: 1 },
  stepItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 8, borderRadius: 10 },
  activeStepItem: { backgroundColor: '#F2F2F7' },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EAB308', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  activeStepNum: { backgroundColor: '#007AFF' },
  stepNumText: { fontSize: 10, fontWeight: '900', color: '#000' },
  activeStepNumText: { color: '#FFF' },
  stepMain: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  activeStepMain: { color: '#007AFF' },
  stepSub: { fontSize: 10, color: '#8E8E93' },
  emptyContainer: { alignItems: 'center', paddingVertical: 6 },
  emptyText: { color: '#8E8E93', fontSize: 11, fontStyle: 'italic', textAlign: 'center' }
});