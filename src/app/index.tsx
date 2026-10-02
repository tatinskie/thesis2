// HomeScreen.tsx

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Polyline } from 'react-native-svg';

// @ts-expect-error Expo SVG Transformer runtime module
import UstMapSvg from '../../assets/images/ust.svg';
import GuardAuthModal from '../components/GuardAuthModal';
import {
  CAMPUS_LIMITS,
  EDGES,
  NODES,
  StepInstruction,
  calculateShortestPath,
  getDistanceInMeters,
} from '../components/navigationUtils';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_SIZE = 1200; 

export default function HomeScreen() {
  const [userPos, setUserPos] = useState({ x: 50, y: 50 });
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [directions, setDirections] = useState<StepInstruction[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  const [blockedNodes, setBlockedNodes] = useState<Set<string>>(new Set());
  const [isGuardMode, setIsGuardMode] = useState(false);
  const [isGuardModalVisible, setIsGuardModalVisible] = useState(false);
  const [isHazardManagerVisible, setIsHazardManagerVisible] = useState(false);

  // Shared values for panning offsets and tracking touch state
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  // Pan gesture: allows dragging to look around, then springs back to (0,0) when released
  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    })
    .onEnd(() => {
      // Snap back to normal centered position with smooth spring physics
      translateX.value = withSpring(0, { damping: 20, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
    });

  const directionsRef = useRef(directions);
  const stepIdxRef = useRef(currentStepIndex);
  const isMutedRef = useRef(isVoiceMuted);

  useEffect(() => { directionsRef.current = directions; }, [directions]);
  useEffect(() => { stepIdxRef.current = currentStepIndex; }, [currentStepIndex]);
  useEffect(() => { isMutedRef.current = isVoiceMuted; }, [isVoiceMuted]);

  const speakInstruction = (text: string) => {
    if (isMutedRef.current) return;
    Speech.stop();
    Speech.speak(text, { language: 'en-US', pitch: 1.0, rate: 0.95 });
  };

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

          const newPos = {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
          };
          setUserPos(newPos);

          const activeDirections = directionsRef.current;
          const activeStepIdx = stepIdxRef.current;

          if (activeDirections.length > 0 && activeStepIdx < activeDirections.length) {
            const targetStep = activeDirections[activeStepIdx];
            const targetCoords = NODES[targetStep.targetNode as any] || targetStep.targetNode;

            if (targetCoords && getDistanceInMeters(newPos, targetCoords) <= 3) {
              const nextIdx = activeStepIdx + 1;
              if (nextIdx < activeDirections.length) {
                const nextStep = activeDirections[nextIdx];
                speakInstruction(`In ${nextStep.dist} meters, ${nextStep.msg}`);
                setCurrentStepIndex(nextIdx);
              } else {
                speakInstruction('You have arrived at the building exit.');
                setCurrentStepIndex(activeDirections.length);
              }
            }
          }
        }
      );
    })();

    return () => {
      if (locationSub) locationSub.remove();
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (activeRoute) {
      handleGenerateRoute(true);
    }
  }, [blockedNodes]);

  const handleGenerateRoute = (isHazardRecalculation = false) => {
    const result = calculateShortestPath(userPos, blockedNodes);

    if (result.warningMessage) {
      speakInstruction(result.warningMessage);
      setActiveRoute(null);
      setDirections([]);
      setIsRouteActive(false);
      return;
    }

    setDirections(result.directions);
    setCurrentStepIndex(0);
    setActiveRoute(result.pathString);
    setIsRouteActive(true);

    if (result.directions.length > 0) {
      const firstStep = result.directions[0];
      const prefix = isHazardRecalculation ? 'Hazard alert! Indoor route recalculated. ' : '';
      speakInstruction(`${prefix}In ${firstStep.dist} meters, ${firstStep.msg.toLowerCase()}`);
    }
  };

  const handleToggleFireHazard = (key: string) => {
    setBlockedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Animated map style handles centering the user and adding the smooth spring-back pan offset
  const animatedMapStyle = useAnimatedStyle(() => {
    const userPixelX = (userPos.x / 100) * MAP_SIZE;
    const userPixelY = (userPos.y / 100) * MAP_SIZE;

    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT * 0.40;

    return {
      transform: [
        { translateX: centerX + translateX.value },
        { translateY: centerY + translateY.value },
        { translateX: -userPixelX },
        { translateY: -userPixelY },
      ],
    };
  }, [userPos]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Pan Gesture Enabled Map View */}
        <View style={styles.mapPerspectiveContainer}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.mapContainer, animatedMapStyle]}>
              <UstMapSvg width={MAP_SIZE} height={MAP_SIZE} preserveAspectRatio="xMidYMid meet" />

              <Svg
                height={MAP_SIZE}
                width={MAP_SIZE}
                viewBox="0 0 100 100"
                style={styles.svgLayer}
                pointerEvents="none"
              >
                <G opacity="0.2" stroke="#EAB308" strokeWidth="0.1">
                  {EDGES.map((e, i) => (
                    <Polyline
                      key={i}
                      points={`${NODES[e.from]?.x || 0},${NODES[e.from]?.y || 0} ${NODES[e.to]?.x || 0},${NODES[e.to]?.y || 0}`}
                    />
                  ))}
                </G>

                {activeRoute && (
                  <Polyline
                    points={`${userPos.x},${userPos.y} ${activeRoute}`}
                    fill="none"
                    stroke="#FF3B30"
                    strokeWidth="0.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray="0.6,0.6"
                  />
                )}

                {Object.entries(NODES).map(([key, node]) => {
                  if (!blockedNodes.has(key)) return null;
                  return (
                    <Circle
                      key={key}
                      cx={node.x}
                      cy={node.y}
                      r="1.2"
                      fill="#FF3B30"
                      stroke="#FFF"
                      strokeWidth="0.2"
                    />
                  );
                })}
              </Svg>

              <View 
                style={[
                  styles.userPointerWrapper, 
                  { 
                    left: (userPos.x / 100) * MAP_SIZE, 
                    top: (userPos.y / 100) * MAP_SIZE,
                  }
                ]}
              >
                <View style={styles.userDotCore} />
                <View style={styles.userConeGlow} />
              </View>
            </Animated.View>
          </GestureDetector>
        </View>

        <SafeAreaView style={styles.headerWrapper} pointerEvents="box-none">
          <View style={styles.headerCard}>
            <View>
              <Text style={styles.brand}>
                TOMA<Text style={{ color: '#EAB308' }}>SAFE</Text>
              </Text>
              <Text style={styles.subText}>INDOOR EXIT GUIDANCE</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.iconBtn, isGuardMode && { backgroundColor: '#FF3B30' }]}
                onPress={() => {
                  if (isGuardMode) {
                    setIsHazardManagerVisible(true);
                  } else {
                    setIsGuardModalVisible(true);
                  }
                }}
              >
                <MaterialCommunityIcons
                  name={isGuardMode ? 'shield-check' : 'shield-outline'}
                  size={20}
                  color={isGuardMode ? '#FFFFFF' : '#007AFF'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  const nextMuteState = !isVoiceMuted;
                  setIsVoiceMuted(nextMuteState);
                  if (nextMuteState) Speech.stop();
                  else speakInstruction('Voice navigation enabled');
                }}
              >
                <MaterialCommunityIcons
                  name={isVoiceMuted ? 'volume-off' : 'volume-high'}
                  size={20}
                  color={isVoiceMuted ? '#8E8E93' : '#007AFF'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.bottomPanel}>
          {isGuardMode && (
            <TouchableOpacity
              style={styles.guardBannerBtn}
              onPress={() => setIsHazardManagerVisible(true)}
            >
              <MaterialCommunityIcons name="fire" size={16} color="#FFF" />
              <Text style={styles.guardBannerText}>
                GUARD MODE: BLOCKED CORRIDORS ({blockedNodes.size} ACTIVE)
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.btn, blockedNodes.size > 0 && styles.emergencyBtn]}
            onPress={() => handleGenerateRoute()}
          >
            <Text style={styles.btnText}>
              {blockedNodes.size > 0
                ? 'CALCULATE SAFE INDOOR EXIT'
                : 'FIND NEAREST BUILDING EXIT'}
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
                      <Text style={[styles.stepNumText, isActiveStep && styles.activeStepNumText]}>
                        {i + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepMain, isActiveStep && styles.activeStepMain]}>
                        {step.msg}
                      </Text>
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
                  {Object.keys(NODES).length === 0
                    ? '⚠️ Please update navigationUtils.ts with your building map nodes.'
                    : 'Tap the button above to view your indoor exit route.'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        <GuardAuthModal
          visible={isGuardModalVisible}
          isGuardMode={isGuardMode}
          onClose={() => setIsGuardModalVisible(false)}
          onAuthenticateSuccess={() => {
            setIsGuardMode(true);
            setIsHazardManagerVisible(true);
            speakInstruction('Guard mode active. Open hazard manager to block corridors.');
          }}
          onDeactivateGuardMode={() => {
            setIsGuardMode(false);
            setIsHazardManagerVisible(false);
            speakInstruction('Guard mode locked.');
          }}
        />

        <Modal
          visible={isHazardManagerVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsHazardManagerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.hazardSheet}>
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="fire" size={20} color="#FF3B30" />
                  <Text style={styles.sheetTitle}>Manage Indoor Corridor Hazards</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsGuardMode(false);
                      setIsHazardManagerVisible(false);
                      speakInstruction('Returned to student mode.');
                    }}
                  >
                    <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: '700' }}>
                      Exit Guard Mode
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setIsHazardManagerVisible(false)}>
                    <Text style={styles.closeBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.sheetSub}>
                Toggle indoor nodes below to mark hallway blockages. Emergency exit routes will automatically reroute around blocked paths.
              </Text>

              <ScrollView style={{ maxHeight: 350 }}>
                {Object.entries(NODES).map(([key, node]) => {
                  const isBlocked = blockedNodes.has(key);
                  return (
                    <View key={key} style={styles.hazardRow}>
                      <View>
                        <Text style={styles.nodeTitle}>{node.name}</Text>
                        <Text style={styles.nodePosSub}>
                          {node.isAssembly ? 'Building Exit / Assembly' : 'Indoor Hallway Node'}
                        </Text>
                      </View>
                      <Switch
                        value={isBlocked}
                        onValueChange={() => handleToggleFireHazard(key)}
                        trackColor={{ false: '#D1D1D6', true: '#FF3B30' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  mapPerspectiveContainer: { flex: 1, overflow: 'hidden', backgroundColor: '#0f172a' },
  mapContainer: { width: MAP_SIZE, height: MAP_SIZE, position: 'absolute', top: 0, left: 0 },
  svgLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  userPointerWrapper: { position: 'absolute', width: 28, height: 28, marginLeft: -14, marginTop: -14, justifyContent: 'center', alignItems: 'center', zIndex: 99 },
  userDotCore: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#007AFF', borderWidth: 2.5, borderColor: '#FFFFFF', elevation: 6 },
  userConeGlow: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0, 122, 255, 0.35)' },
  headerWrapper: { position: 'absolute', top: 10, left: 0, right: 0, zIndex: 10 },
  headerCard: { marginHorizontal: 16, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.90)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', elevation: 8 },
  brand: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  subText: { fontSize: 8, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 34, height: 34, backgroundColor: '#1E293B', borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.25, backgroundColor: '#1E293B', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 20, zIndex: 10, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  guardBannerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF3B30', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, gap: 6 },
  guardBannerText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  btn: { backgroundColor: '#0F172A', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  emergencyBtn: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  stepScroller: { flex: 1 },
  stepItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 8, borderRadius: 10 },
  activeStepItem: { backgroundColor: '#0F172A' },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EAB308', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  activeStepNum: { backgroundColor: '#007AFF' },
  stepNumText: { fontSize: 10, fontWeight: '900', color: '#000' },
  activeStepNumText: { color: '#FFF' },
  stepMain: { fontSize: 12, fontWeight: '700', color: '#F1F5F9' },
  activeStepMain: { color: '#38BDF8' },
  stepSub: { fontSize: 10, color: '#94A3B8' },
  emptyContainer: { alignItems: 'center', paddingVertical: 10 },
  emptyText: { color: '#94A3B8', fontSize: 11, fontStyle: 'italic', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  hazardSheet: { backgroundColor: '#1E293B', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  sheetSub: { fontSize: 11, color: '#94A3B8', marginBottom: 14 },
  closeBtnText: { fontSize: 14, fontWeight: '800', color: '#38BDF8' },
  hazardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  nodeTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  nodePosSub: { fontSize: 10, color: '#94A3B8' },
});