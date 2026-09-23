// HomeScreen.tsx

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_SIZE = 1200;

export default function HomeScreen() {
  const [userPos, setUserPos] = useState({ x: 38.2, y: 81.2 });
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [directions, setDirections] = useState<StepInstruction[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [heading, setHeading] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  const [blockedNodes, setBlockedNodes] = useState<Set<string>>(new Set());
  const [isGuardMode, setIsGuardMode] = useState(false);
  const [isGuardModalVisible, setIsGuardModalVisible] = useState(false);
  const [isHazardManagerVisible, setIsHazardManagerVisible] = useState(false);

  const prevHeading = useRef(0);
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
            if (getDistanceInMeters(newPos, targetStep.targetNode) <= 5) {
              const nextIdx = activeStepIdx + 1;
              if (nextIdx < activeDirections.length) {
                const nextStep = activeDirections[nextIdx];
                speakInstruction(`In ${nextStep.dist} meters, ${nextStep.msg}`);
                setCurrentStepIndex(nextIdx);
              } else {
                speakInstruction('You have arrived at your destination.');
                setCurrentStepIndex(activeDirections.length);
              }
            }
          }
        }
      );
    })();

    const magSub = Magnetometer.addListener((data) => {
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
      return;
    }

    setDirections(result.directions);
    setCurrentStepIndex(0);
    setActiveRoute(result.pathString);

    if (result.directions.length > 0) {
      const firstStep = result.directions[0];
      const prefix = isHazardRecalculation ? 'Fire alert! Route recalculated. ' : '';
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

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

              <Svg
                height="100%"
                width="100%"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                style={styles.svgLayer}
                pointerEvents="none"
              >
                <G opacity="0.25" stroke="#EAB308" strokeWidth="0.4">
                  {EDGES.map((e, i) => (
                    <Polyline
                      key={i}
                      points={`${NODES[e.from].x},${NODES[e.from].y} ${NODES[e.to].x},${NODES[e.to].y}`}
                    />
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

                {Object.entries(NODES).map(([key, node]) => {
                  if (!blockedNodes.has(key)) return null;
                  return (
                    <Circle
                      key={key}
                      cx={node.x}
                      cy={node.y}
                      r="1.4"
                      fill="#FF3B30"
                      stroke="#FFF"
                      strokeWidth="0.3"
                    />
                  );
                })}

                <Circle
                  cx={userPos.x}
                  cy={userPos.y}
                  r="1.2"
                  fill="#007AFF"
                  stroke="#fff"
                  strokeWidth="0.3"
                />
              </Svg>
            </View>
          </ReactNativeZoomableView>
        </View>

        <SafeAreaView style={styles.headerWrapper} pointerEvents="box-none">
          <View style={styles.headerCard}>
            <View>
              <Text style={styles.brand}>
                TOMA<Text style={{ color: '#EAB308' }}>SAFE</Text>
              </Text>
              <Text style={styles.subText}>UST-LEGAZPI DISASTER NAV</Text>
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

              <View style={[styles.compass, { transform: [{ rotate: `${heading}deg` }] }]}>
                <MaterialCommunityIcons name="navigation" size={20} color="#FF3B30" />
              </View>
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
                GUARD MODE: MANAGE BLOCKED PATHS ({blockedNodes.size} ACTIVE)
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.btn, blockedNodes.size > 0 && styles.emergencyBtn]}
            onPress={() => handleGenerateRoute()}
          >
            <Text style={styles.btnText}>
              {blockedNodes.size > 0
                ? 'CALCULATE SAFE EMERGENCY EXIT'
                : 'CALCULATE NEAREST EXIT'}
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
                  {blockedNodes.size > 0
                    ? '⚠️ Fire alert on campus! Tap button to compute safest exit.'
                    : 'Tap the button above to navigate to the nearest exit gate.'}
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
            speakInstruction('Guard mode active. Open hazard manager to block paths.');
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
                  <Text style={styles.sheetTitle}>Manage Blocked Campus Paths</Text>
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
                Toggle any path node below to declare or clear a fire hazard. Student routes will automatically update to avoid blocked areas.
              </Text>

              <ScrollView style={{ maxHeight: 350 }}>
                {Object.entries(NODES).map(([key, node]) => {
                  const isBlocked = blockedNodes.has(key);
                  return (
                    <View key={key} style={styles.hazardRow}>
                      <View>
                        <Text style={styles.nodeTitle}>{node.name}</Text>
                        <Text style={styles.nodePosSub}>
                          {node.isExit ? 'Exit Gate' : 'Campus Walkway Node'}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  mapContainer: { width: MAP_SIZE, height: MAP_SIZE, position: 'relative' },
  svgLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    backgroundColor: '#F2F2F7',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compass: {
    width: 34,
    height: 34,
    backgroundColor: '#F2F2F7',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.25,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    zIndex: 10,
  },

  guardBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  guardBannerText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  btn: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  emergencyBtn: { backgroundColor: '#FF3B30' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  stepScroller: { flex: 1 },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    borderRadius: 10,
  },
  activeStepItem: { backgroundColor: '#F2F2F7' },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EAB308',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activeStepNum: { backgroundColor: '#007AFF' },
  stepNumText: { fontSize: 10, fontWeight: '900', color: '#000' },
  activeStepNumText: { color: '#FFF' },
  stepMain: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  activeStepMain: { color: '#007AFF' },
  stepSub: { fontSize: 10, color: '#8E8E93' },
  emptyContainer: { alignItems: 'center', paddingVertical: 10 },
  emptyText: {
    color: '#8E8E93',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  hazardSheet: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#1C1C1E' },
  sheetSub: { fontSize: 11, color: '#8E8E93', marginBottom: 14 },
  closeBtnText: { fontSize: 14, fontWeight: '800', color: '#007AFF' },
  hazardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  nodeTitle: { fontSize: 13, fontWeight: '800', color: '#1C1C1E' },
  nodePosSub: { fontSize: 10, color: '#8E8E93' },
});