import { MaterialCommunityIcons } from '@expo/vector-icons';

import * as Location from 'expo-location';

import { useEffect, useState } from 'react';

import {
  Alert,

  Dimensions,

  StatusBar,

  StyleSheet,

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
  runOnJS,

  useAnimatedStyle,

  useSharedValue,

  withSpring,

  withTiming,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import Svg, { Polyline } from 'react-native-svg';

import UstMapSvg from '../../assets/images/ust.svg';

import BuildingLabels from '../components/BuildingLabels';

import CampusContext from '../components/CampusContext';

import CampusFadeOverlay from '../components/CampusFadeOverlay';

import EvacuationAreas from '../components/evacuationAreas';

import {
  calculateShortestPath,

  gpsToMapPosition,

  RouteResult,
} from '../components/navigationUtils';

// =========================================================

// CONSTANTS

// =========================================================

const {

  height: SCREEN_HEIGHT,

  width: SCREEN_WIDTH,

} = Dimensions.get('window');

const MAP_SIZE = 1200;

// The outside context is 1200x1200 while the real UST map is 800x800.
// That makes the visual context 1.5x larger than the navigation map.
const CONTEXT_SCALE = 1200 / 800;
const CONTEXT_SIZE = MAP_SIZE * CONTEXT_SCALE;

const MIN_ZOOM = 0.22;

const MAX_ZOOM = 4;

const DEFAULT_VIEWPORT_WIDTH = SCREEN_WIDTH;

const DEFAULT_VIEWPORT_HEIGHT = SCREEN_HEIGHT;

// =========================================================

// HOME SCREEN

// =========================================================

export default function HomeScreen() {

  // Use the actual visible map area so centering behaves consistently

  // across phones with different screen sizes/aspect ratios.

  const [viewportSize, setViewportSize] = useState({

    width: DEFAULT_VIEWPORT_WIDTH,

    height: DEFAULT_VIEWPORT_HEIGHT,

  });

  // =======================================================

  // GPS POSITION

  // =======================================================

  const [

    userPos,

    setUserPos,

  ] = useState({

    x: 50,

    y: 50,

  });

  const [

    locationGranted,

    setLocationGranted,

  ] = useState(false);

  const [

    isInsideCampus,

    setIsInsideCampus,

  ] = useState(false);

  const [

    locationAccuracy,

    setLocationAccuracy,

  ] = useState<

    number | null

  >(null);

  const [

    isWaitingForLocation,

    setIsWaitingForLocation,

  ] = useState(true);

  // =======================================================

  // NAVIGATION

  // =======================================================

  const [

    activeRoute,

    setActiveRoute,

  ] = useState<

    RouteResult | null

  >(null);

  const [

  selectedEvacuationAreaId,

  setSelectedEvacuationAreaId,

] = useState<string | null>(null);

  // =======================================================

  // MAP PAN

  // =======================================================

  const translateX =

    useSharedValue(0);

  const translateY =

    useSharedValue(0);

  const savedTranslateX =

    useSharedValue(0);

  const savedTranslateY =

    useSharedValue(0);

  // =======================================================

  // MAP ZOOM

  // =======================================================

  const scale =

    useSharedValue(1);

  const savedScale =

    useSharedValue(1);

  const pinchStartX =

    useSharedValue(0);

  const pinchStartY =

    useSharedValue(0);

  const pinchStartTranslateX =

    useSharedValue(0);

  const pinchStartTranslateY =

    useSharedValue(0);

  const [

    zoomDisplay,

    setZoomDisplay,

  ] = useState(1);

  // =======================================================

  // SMOOTH MARKER

  // =======================================================

  const markerX =

    useSharedValue(50);

  const markerY =

    useSharedValue(50);

  // =======================================================

  // GPS TRACKING

  // =======================================================

  useEffect(() => {

    let subscription:

      Location.LocationSubscription

      | null = null;

    const startLocation =

      async () => {

        try {

          const permission =

            await Location

              .requestForegroundPermissionsAsync();

          if (

            permission.status !==

            'granted'

          ) {

            setLocationGranted(

              false

            );

            setIsWaitingForLocation(

              false

            );

            return;

          }

          setLocationGranted(

            true

          );

          subscription =

            await Location

              .watchPositionAsync(

                {

                  accuracy:

                    Location

                      .Accuracy

                      .High,

                  distanceInterval:

                    1,

                  timeInterval:

                    1000,

                },

                (location) => {

                  const {

                    latitude,

                    longitude,

                    accuracy,

                  } =

                    location.coords;

                  setLocationAccuracy(

                    accuracy ??

                    null

                  );

                  setIsWaitingForLocation(

                    false

                  );

                  // -------------------------------

                  // GPS -> SVG

                  // -------------------------------

                  const position =

                    gpsToMapPosition(

                      latitude,

                      longitude

                    );

                  setIsInsideCampus(

                    position

                      .isInsideCampus

                  );

                  if (

                    !position

                      .isInsideCampus

                  ) {

                    return;

                  }

                  const newPosition =

                    {

                      x:

                        position.x,

                      y:

                        position.y,

                    };

                  setUserPos(

                    newPosition

                  );

                  // -------------------------------

                  // Smooth marker

                  // -------------------------------

                  markerX.value =

                    withTiming(

                      newPosition.x,

                      {

                        duration:

                          600,

                      }

                    );

                  markerY.value =

                    withTiming(

                      newPosition.y,

                      {

                        duration:

                          600,

                      }

                    );

                }

              );

        } catch (error) {

          console.log(

            'Location error:',

            error

          );

          setLocationGranted(

            false

          );

          setIsWaitingForLocation(

            false

          );

        }

      };

    startLocation();

    return () => {

      subscription?.remove();

    };

  }, []);

  // =======================================================

  // CALCULATE NEAREST EXIT

  // =======================================================

const handleCalculateRoute = () => {

  if (!locationGranted) {

    setSelectedEvacuationAreaId(null);

    Alert.alert(

      'Location Required',

      'Please allow location access first.'

    );

    return;

  }

  if (!isInsideCampus) {

    setSelectedEvacuationAreaId(null);

    Alert.alert(

      'Outside Campus',

      'You must be inside the mapped campus area to calculate an evacuation route.'

    );

    return;

  }

  const result =

    calculateShortestPath(userPos);

  if (!result.success) {

    setActiveRoute(null);

    // Hide evacuation area if no route exists.

    setSelectedEvacuationAreaId(null);

    Alert.alert(

      'Route unavailable',

      result.message

    );

    return;

  }

  setActiveRoute(result);

  // Show the evacuation site ONLY after

  // a successful calculation.

  setSelectedEvacuationAreaId(

    'EVAC_AREA_1'

  );

  translateX.value =

    withSpring(0);

  translateY.value =

    withSpring(0);

  savedTranslateX.value = 0;

  savedTranslateY.value = 0;

};

  // =======================================================

  // STOP NAVIGATION

  // =======================================================

  const handleStopRoute = () => {
    setActiveRoute(null);

    // Hide evacuation site again.
    setSelectedEvacuationAreaId(null);
  };

const clampMapTranslation = (
    proposedX: number,
    proposedY: number,
    currentScale: number
  ) => {
    'worklet';

    const userPixelX =
      (userPos.x / 100) * MAP_SIZE;

    const userPixelY =
      (userPos.y / 100) * MAP_SIZE;

    /*
     * IMPORTANT:
     * Navigation still uses MAP_SIZE (1200).
     *
     * Panning limits use CONTEXT_SIZE (1800),
     * so the user can swipe all the way to the
     * light outside-map border.
     */
    const scaledContextSize =
      CONTEXT_SIZE * currentScale;

    const halfScaledContext =
      scaledContextSize / 2;

    let clampedX = proposedX;
    let clampedY = proposedY;

    // =========================================
    // HORIZONTAL LIMIT
    // =========================================

    if (
      scaledContextSize <=
      viewportSize.width
    ) {
      // Entire outside context fits horizontally.
      // Keep it centered.
      clampedX =
        userPixelX -
        MAP_SIZE / 2;
    } else {
      /*
       * mapCenterScreenX is:
       *
       * viewportWidth / 2
       * - userPixelX
       * + translateX
       * + MAP_SIZE / 2
       *
       * The outside context is centered on the
       * same point as the UST map, but extends
       * farther on every side.
       */
      const minX =
        userPixelX -
        MAP_SIZE / 2 +
        viewportSize.width / 2 -
        halfScaledContext;

      const maxX =
        userPixelX -
        MAP_SIZE / 2 -
        viewportSize.width / 2 +
        halfScaledContext;

      clampedX = Math.max(
        minX,
        Math.min(maxX, proposedX)
      );
    }

    // =========================================
    // VERTICAL LIMIT
    // =========================================

    if (
      scaledContextSize <=
      viewportSize.height
    ) {
      // Entire outside context fits vertically.
      // Keep it centered.
      clampedY =
        userPixelY -
        MAP_SIZE / 2;
    } else {
      const minY =
        userPixelY -
        MAP_SIZE / 2 +
        viewportSize.height / 2 -
        halfScaledContext;

      const maxY =
        userPixelY -
        MAP_SIZE / 2 -
        viewportSize.height / 2 +
        halfScaledContext;

      clampedY = Math.max(
        minY,
        Math.min(maxY, proposedY)
      );
    }

    return {
      x: clampedX,
      y: clampedY,
    };
  };

  // =======================================================

  // PAN

  // =======================================================

  const panGesture = Gesture.Pan()
    .minDistance(8)
    .averageTouches(true)

    .onStart(() => {
      savedTranslateX.value =
        translateX.value;

      savedTranslateY.value =
        translateY.value;
    })

    .onUpdate((event) => {
      const proposedX =
        savedTranslateX.value +
        event.translationX;

      const proposedY =
        savedTranslateY.value +
        event.translationY;

      const clamped =
        clampMapTranslation(
          proposedX,
          proposedY,
          scale.value
        );

      translateX.value =
        clamped.x;

      translateY.value =
        clamped.y;
    })

    .onEnd(() => {
      savedTranslateX.value =
        translateX.value;

      savedTranslateY.value =
        translateY.value;
    });

  // =======================================================

  // PINCH

  // =======================================================

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      savedScale.value = scale.value;

      pinchStartTranslateX.value =
        translateX.value;

      pinchStartTranslateY.value =
        translateY.value;

      const userPixelX =
        (userPos.x / 100) * MAP_SIZE;

      const userPixelY =
        (userPos.y / 100) * MAP_SIZE;

      const mapCenterScreenX =
        viewportSize.width / 2 -
        userPixelX +
        translateX.value +
        MAP_SIZE / 2;

      const mapCenterScreenY =
        viewportSize.height / 2 -
        userPixelY +
        translateY.value +
        MAP_SIZE / 2;

      pinchStartX.value =
        (event.focalX - mapCenterScreenX) /
        scale.value;

      pinchStartY.value =
        (event.focalY - mapCenterScreenY) /
        scale.value;
    })

    .onUpdate((event) => {
      const ZOOM_SENSITIVITY = 0.78;

      const softenedScale =
        1 +
        (event.scale - 1) *
          ZOOM_SENSITIVITY;

      let newScale =
        savedScale.value *
        softenedScale;

      newScale = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, newScale)
      );

      const userPixelX =
        (userPos.x / 100) * MAP_SIZE;

      const userPixelY =
        (userPos.y / 100) * MAP_SIZE;

      const proposedX =
        event.focalX -
        (
          viewportSize.width / 2 -
          userPixelX +
          MAP_SIZE / 2
        ) -
        pinchStartX.value *
          newScale;

      const proposedY =
        event.focalY -
        (
          viewportSize.height / 2 -
          userPixelY +
          MAP_SIZE / 2
        ) -
        pinchStartY.value *
          newScale;

      const clamped =
        clampMapTranslation(
          proposedX,
          proposedY,
          newScale
        );

      translateX.value =
        clamped.x;

      translateY.value =
        clamped.y;

      scale.value =
        newScale;
    })

    .onEnd(() => {
      savedScale.value =
        scale.value;

      savedTranslateX.value =
        translateX.value;

      savedTranslateY.value =
        translateY.value;

      runOnJS(setZoomDisplay)(
        Math.round(
          scale.value * 100
        ) / 100
      );
    });

  // =======================================================

  // DOUBLE TAP

  // =======================================================

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)

    .onEnd((event) => {
      const targetScale =
        scale.value >= 1.8
          ? 1
          : Math.min(
              scale.value * 1.8,
              MAX_ZOOM
            );

      const userPixelX =
        (userPos.x / 100) * MAP_SIZE;

      const userPixelY =
        (userPos.y / 100) * MAP_SIZE;

      const mapCenterScreenX =
        viewportSize.width / 2 -
        userPixelX +
        translateX.value +
        MAP_SIZE / 2;

      const mapCenterScreenY =
        viewportSize.height / 2 -
        userPixelY +
        translateY.value +
        MAP_SIZE / 2;

      const localX =
        (event.x - mapCenterScreenX) /
        scale.value;

      const localY =
        (event.y - mapCenterScreenY) /
        scale.value;

      const proposedX =
        event.x -
        (
          viewportSize.width / 2 -
          userPixelX +
          MAP_SIZE / 2
        ) -
        localX * targetScale;

      const proposedY =
        event.y -
        (
          viewportSize.height / 2 -
          userPixelY +
          MAP_SIZE / 2
        ) -
        localY * targetScale;

      const clamped =
        clampMapTranslation(
          proposedX,
          proposedY,
          targetScale
        );

      translateX.value =
        withSpring(clamped.x);

      translateY.value =
        withSpring(clamped.y);

      scale.value =
        withSpring(targetScale);

      savedTranslateX.value =
        clamped.x;

      savedTranslateY.value =
        clamped.y;

      savedScale.value =
        targetScale;

      runOnJS(setZoomDisplay)(
        Math.round(
          targetScale * 100
        ) / 100
      );
    });

  const mapGesture = Gesture.Simultaneous(

    panGesture,

    pinchGesture,

    doubleTapGesture

  );

  // =======================================================

  // RECENTER / NORTH-UP

  // =======================================================

  const handleRecenter = () => {

    translateX.value = withSpring(0);

    translateY.value = withSpring(0);

    savedTranslateX.value = 0;

    savedTranslateY.value = 0;

    scale.value = withSpring(1);

    savedScale.value = 1;

    setZoomDisplay(1);

  };

  const handleFitCampus = () => {

    const horizontalScale =

      viewportSize.width / MAP_SIZE;

    const verticalScale =

      viewportSize.height / MAP_SIZE;

    const fitScale =

      Math.min(

        horizontalScale,

        verticalScale

      ) * 0.9;

    const targetScale =

      Math.max(

        MIN_ZOOM,

        Math.min(

          MAX_ZOOM,

          fitScale

        )

      );

    const userPixelX =

      (userPos.x / 100) *

      MAP_SIZE;

    const userPixelY =

      (userPos.y / 100) *

      MAP_SIZE;

    const targetTranslateX =

      userPixelX -

      MAP_SIZE / 2;

    const targetTranslateY =

      userPixelY -

      MAP_SIZE / 2;

    translateX.value =

      withSpring(targetTranslateX);

    translateY.value =

      withSpring(targetTranslateY);

    scale.value =

      withSpring(targetScale);

    savedTranslateX.value =

      targetTranslateX;

    savedTranslateY.value =

      targetTranslateY;

    savedScale.value =

      targetScale;

    setZoomDisplay(

      Math.round(

        targetScale * 100

      ) / 100

    );

  };

  // =======================================================

  // ZOOM BUTTON HELPER

  // =======================================================

  const zoomAroundViewportCenter = (
    targetScale: number
  ) => {
    const clampedScale =
      Math.max(
        MIN_ZOOM,
        Math.min(
          MAX_ZOOM,
          targetScale
        )
      );

    const userPixelX =
      (userPos.x / 100) *
      MAP_SIZE;

    const userPixelY =
      (userPos.y / 100) *
      MAP_SIZE;

    const anchorX =
      viewportSize.width / 2;

    const anchorY =
      viewportSize.height / 2;

    const mapCenterScreenX =
      anchorX -
      userPixelX +
      translateX.value +
      MAP_SIZE / 2;

    const mapCenterScreenY =
      anchorY -
      userPixelY +
      translateY.value +
      MAP_SIZE / 2;

    const localX =
      (anchorX - mapCenterScreenX) /
      scale.value;

    const localY =
      (anchorY - mapCenterScreenY) /
      scale.value;

    const proposedX =
      anchorX -
      (
        anchorX -
        userPixelX +
        MAP_SIZE / 2
      ) -
      localX *
        clampedScale;

    const proposedY =
      anchorY -
      (
        anchorY -
        userPixelY +
        MAP_SIZE / 2
      ) -
      localY *
        clampedScale;

    const clamped =
      clampMapTranslation(
        proposedX,
        proposedY,
        clampedScale
      );

    translateX.value =
      withSpring(clamped.x);

    translateY.value =
      withSpring(clamped.y);

    scale.value =
      withSpring(clampedScale);

    savedTranslateX.value =
      clamped.x;

    savedTranslateY.value =
      clamped.y;

    savedScale.value =
      clampedScale;

    setZoomDisplay(
      Math.round(
        clampedScale * 100
      ) / 100
    );
  };

  // =======================================================

  // ZOOM +

  // =======================================================

  const handleZoomIn = () => {

    // Multiplicative steps feel more natural than fixed +0.5 jumps.

    zoomAroundViewportCenter(

      scale.value * 1.28

    );

  };

  // =======================================================

  // ZOOM -

  // =======================================================

  const handleZoomOut = () => {

    zoomAroundViewportCenter(

      scale.value / 1.28

    );

  };

  // =======================================================

  // MAP PAN STYLE

  // =======================================================

  const animatedPanStyle =

    useAnimatedStyle(

      () => {

        const userPixelX =

          (

            userPos.x /

            100

          ) *

          MAP_SIZE;

        const userPixelY =

          (

            userPos.y /

            100

          ) *

          MAP_SIZE;

        return {

          transform: [

            {

              translateX:

                viewportSize.width / 2 -

                userPixelX +

                translateX.value,

            },

            {

              translateY:

                viewportSize.height / 2 -

                userPixelY +

                translateY.value,

            },

          ],

        };

      },

      [userPos, viewportSize]

    );

  // =======================================================

  // MAP ZOOM STYLE

  // =======================================================

  const animatedZoomStyle =

    useAnimatedStyle(() => ({

      transform: [

        {

          scale: scale.value,

        },

      ],

    }));

  // =======================================================

  // MARKER STYLE

  // =======================================================

  const animatedMarkerStyle =

    useAnimatedStyle(

      () => ({

        left:

          (

            markerX.value /

            100

          ) *

          MAP_SIZE,

        top:

          (

            markerY.value /

            100

          ) *

          MAP_SIZE,

      })

    );

  // =======================================================

  // STATUS

  // =======================================================

  const getStatus = () => {

    if (

      isWaitingForLocation

    ) {

      return {

        text:

          'Getting location...',

        color:

          '#F59E0B',

      };

    }

    if (

      !locationGranted

    ) {

      return {

        text:

          'Location required',

        color:

          '#EF4444',

      };

    }

    if (

      !isInsideCampus

    ) {

      return {

        text:

          'Outside campus',

        color:

          '#F59E0B',

      };

    }

    return {

      text:

        'Live location',

      color:

        '#22C55E',

    };

  };

  const status =

    getStatus();

  // =======================================================

  // UI

  // =======================================================

  return (

    <GestureHandlerRootView

      style={styles.root}

    >

      <View

        style={

          styles.container

        }

      >

        <StatusBar

          barStyle="dark-content"

          backgroundColor="#FFFFFF"

        />

        {/* ============================================= */}

        {/* MAP                                           */}

        {/* ============================================= */}

        <View

          style={styles.mapViewport}

          onLayout={(event) => {

            const { width, height } =

              event.nativeEvent.layout;

            setViewportSize({

              width,

              height,

            });

          }}

        >

          <GestureDetector

            gesture={

              mapGesture

            }

          >

            <View

              style={

                styles.gestureArea

              }

            >

              <Animated.View

                style={[

                  styles.mapPanLayer,

                  animatedPanStyle,

                ]}

              >

                <Animated.View

                  style={[

                    styles.mapZoomLayer,

                    animatedZoomStyle,

                  ]}

                >

                  {/* =================================== */}

                  {/* CAMPUS SVG                          */}

                  {/* =================================== */}

                  <CampusContext

  mapSize={MAP_SIZE}

/>

                  <UstMapSvg

  width={MAP_SIZE}

  height={MAP_SIZE}

/>

<CampusFadeOverlay

  mapSize={MAP_SIZE}

/>

<EvacuationAreas

  mapSize={MAP_SIZE}

  activeAreaId={

    selectedEvacuationAreaId

  }

/>

<BuildingLabels

  mapSize={MAP_SIZE}

  zoomLevel={zoomDisplay}

/>

                  {/* =================================== */}

                  {/* ROUTE                               */}

                  {/* =================================== */}

                  {activeRoute &&

                    activeRoute.success && (

                      <Svg

                        width={

                          MAP_SIZE

                        }

                        height={

                          MAP_SIZE

                        }

                        viewBox="0 0 100 100"

                        style={

                          styles.routeOverlay

                        }

                        pointerEvents="none"

                      >

                        {/* ================================= */}

{/* White outline */}

                        <Polyline

                          points={

                            activeRoute

                              .pathString

                          }

                          fill="none"

                          stroke="#FFFFFF"

                          strokeWidth="1.4"

                          strokeLinecap="round"

                          strokeLinejoin="round"

                        />

                        {/* Blue route */}

                        <Polyline

                          points={

                            activeRoute

                              .pathString

                          }

                          fill="none"

                          stroke="#2563EB"

                          strokeWidth="0.75"

                          strokeLinecap="round"

                          strokeLinejoin="round"

                        />

                      </Svg>

                    )}

                  {/* =================================== */}

                  {/* USER LOCATION                       */}

                  {/* =================================== */}

                  {isInsideCampus && (

                    <Animated.View

                      pointerEvents="none"

                      style={[

                        styles.userMarker,

                        animatedMarkerStyle,

                      ]}

                    >

                      <View

                        style={

                          styles.accuracyGlow

                        }

                      />

                      <View

                        style={

                          styles.userDotOuter

                        }

                      >

                        <View

                          style={

                            styles.userDot

                          }

                        />

                      </View>

                    </Animated.View>

                  )}

                </Animated.View>

              </Animated.View>

            </View>

          </GestureDetector>

        </View>

        {/* ============================================= */}

        {/* HEADER                                        */}

        {/* ============================================= */}

        <SafeAreaView

          style={

            styles.headerWrapper

          }

          pointerEvents="box-none"

        >

          <View

            style={

              styles.headerCard

            }

          >

            <View

              style={

                styles.brandContainer

              }

            >

              <View

                style={

                  styles.logoContainer

                }

              >

                <MaterialCommunityIcons

                  name="shield-check"

                  size={20}

                  color="#FFFFFF"

                />

              </View>

              <View>

                <Text

                  style={

                    styles.brand

                  }

                >

                  Toma

                  <Text

                    style={

                      styles.brandAccent

                    }

                  >

                    Safe

                  </Text>

                </Text>

                <Text

                  style={

                    styles.subText

                  }

                >

                  CAMPUS EVACUATION

                </Text>

              </View>

            </View>

            <View

              style={

                styles.mapBadge

              }

            >

              <MaterialCommunityIcons

                name="map-outline"

                size={14}

                color="#2563EB"

              />

              <Text

                style={

                  styles.mapBadgeText

                }

              >

                MAP

              </Text>

            </View>

          </View>

        </SafeAreaView>

        {/* ============================================= */}

        {/* GPS STATUS                                    */}

        {/* ============================================= */}

        <View

          style={

            styles.locationStatus

          }

        >

          <View

            style={[

              styles.statusDot,

              {

                backgroundColor:

                  status.color,

              },

            ]}

          />

          <Text

            style={

              styles.locationStatusText

            }

          >

            {status.text}

          </Text>

        </View>

        {/* ============================================= */}

        {/* ZOOM CONTROLS                                 */}

        {/* ============================================= */}

        <View

          style={

            styles.mapControls

          }

        >

          <TouchableOpacity

            style={

              styles.controlButton

            }

            onPress={

              handleZoomIn

            }

          hitSlop={8}

          >

            <MaterialCommunityIcons

              name="plus"

              size={21}

              color="#334155"

            />

          </TouchableOpacity>

          <View

            style={

              styles.controlDivider

            }

          />

          <View

            style={

              styles.zoomIndicator

            }

          >

            <Text

              style={

                styles.zoomIndicatorText

              }

            >

              {zoomDisplay.toFixed(

                1

              )}

              ×

            </Text>

          </View>

          <View

            style={

              styles.controlDivider

            }

          />

          <TouchableOpacity

            style={

              styles.controlButton

            }

            onPress={

              handleZoomOut

            }

          hitSlop={8}

          >

            <MaterialCommunityIcons

              name="minus"

              size={21}

              color="#334155"

            />

          </TouchableOpacity>

        </View>

        {/* ============================================= */}

        {/* RECENTER                                      */}

        {/* ============================================= */}

        <TouchableOpacity

          style={

            styles.recenterButton

          }

          onPress={

            handleRecenter

          }

          hitSlop={8}

        >

          <MaterialCommunityIcons

            name="crosshairs-gps"

            size={22}

            color="#2563EB"

          />

        </TouchableOpacity>

        <TouchableOpacity

          style={styles.fitCampusButton}

          onPress={handleFitCampus}

          hitSlop={8}

        >

          <MaterialCommunityIcons

            name="fit-to-screen-outline"

            size={22}

            color="#334155"

          />

        </TouchableOpacity>

        {/* ============================================= */}

        {/* COMPACT NAVIGATION CARD                       */}

        {/* ============================================= */}

        <View

          style={

            styles.bottomPanel

          }

        >

          {/* Route active */}

          {activeRoute &&

          activeRoute.success ? (

            <>

              <View

                style={

                  styles.routeInfoRow

                }

              >

                <View

                  style={

                    styles.routeIcon

                  }

                >

                  <MaterialCommunityIcons

                    name="navigation-variant"

                    size={21}

                    color="#2563EB"

                  />

                </View>

                <View

                  style={

                    styles.routeTextContainer

                  }

                >

                  <Text

                    style={

                      styles.routeLabel

                    }

                  >

                    NEAREST EXIT

                  </Text>

                  <Text

                    style={

                      styles.routeTitle

                    }

                    numberOfLines={1}

                  >

                    {

                      activeRoute

                        .exitName

                    }

                  </Text>

                  <Text

                    style={

                      styles.routeDistance

                    }

                  >

                    Approx.{' '}

                    {Math.round(activeRoute.distance)}{' '}

                    m route

                  </Text>

                </View>

                <TouchableOpacity

                  style={

                    styles.stopButton

                  }

                  onPress={

                    handleStopRoute

                  }

                >

                  <MaterialCommunityIcons

                    name="close"

                    size={18}

                    color="#EF4444"

                  />

                </TouchableOpacity>

              </View>

            </>

          ) : (

            <>

              {/* Location */}

              <View

                style={

                  styles.compactLocationRow

                }

              >

                <View

                  style={

                    styles.compactLocationIcon

                  }

                >

                  <MaterialCommunityIcons

                    name="crosshairs-gps"

                    size={20}

                    color="#2563EB"

                  />

                </View>

                <View

                  style={

                    styles.compactLocationInfo

                  }

                >

                  <Text

                    style={

                      styles.compactLocationTitle

                    }

                  >

                    {isInsideCampus

                      ? 'Live Location'

                      : 'Location unavailable'}

                  </Text>

                  <Text

  style={

    styles.compactLocationSubtext

  }

>

  {locationAccuracy !== null

  ? `GPS accuracy ±${Math.round(locationAccuracy)} m`

  : 'Waiting for GPS...'}

</Text>

                </View>

                <View

                  style={[

                    styles.liveIndicator,

                    {

                      backgroundColor:

                        status.color,

                    },

                  ]}

                />

              </View>

              {/* ======================================= */}

              {/* CALCULATE ROUTE BUTTON                  */}

              {/* ======================================= */}

              <TouchableOpacity

                style={[

                  styles.routeButton,

                  (!locationGranted || !isInsideCampus) &&

                    styles.routeButtonDisabled,

                ]}

                disabled={!locationGranted || !isInsideCampus}

                activeOpacity={

                  0.85

                }

                onPress={

                  handleCalculateRoute

                }

              >

                <MaterialCommunityIcons

                  name="directions-fork"

                  size={19}

                  color="#FFFFFF"

                />

                <Text

                  style={

                    styles.routeButtonText

                  }

                >

                  FIND NEAREST EXIT

                </Text>

              </TouchableOpacity>

            </>

          )}

        </View>

      </View>

    </GestureHandlerRootView>

  );

}

// =========================================================

// STYLES

// =========================================================

const styles =

  StyleSheet.create({

    root: {

      flex: 1,

    },

    container: {

      flex: 1,

      backgroundColor:

        '#F8FAFC',

    },

    // =====================================================

    // MAP

    // =====================================================

    mapViewport: {

  flex: 1,

  overflow: 'hidden',

  backgroundColor: '#FFFFFF',

},

    gestureArea: {

      flex: 1,

      width: '100%',

      height: '100%',

    },

    mapPanLayer: {

      position: 'absolute',

      width: MAP_SIZE,

      height: MAP_SIZE,

      top: 0,

      left: 0,

    },

    mapZoomLayer: {

      width: MAP_SIZE,

      height: MAP_SIZE,

    },

    routeOverlay: {

      position: 'absolute',

      top: 0,

      left: 0,

    },

    // =====================================================

    // USER MARKER

    // =====================================================

    userMarker: {

      position: 'absolute',

      width: 40,

      height: 40,

      marginLeft: -20,

      marginTop: -20,

      alignItems:

        'center',

      justifyContent:

        'center',

      zIndex: 100,

    },

    accuracyGlow: {

      position:

        'absolute',

      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor:

        'rgba(37,99,235,0.15)',

      borderWidth: 1,

      borderColor:

        'rgba(37,99,235,0.20)',

    },

    userDotOuter: {

      width: 18,

      height: 18,

      borderRadius: 9,

      backgroundColor:

        '#FFFFFF',

      alignItems:

        'center',

      justifyContent:

        'center',

      elevation: 9,

    },

    userDot: {

      width: 10,

      height: 10,

      borderRadius: 5,

      backgroundColor:

        '#2563EB',

    },

    // =====================================================

    // HEADER

    // =====================================================

    headerWrapper: {

      position:

        'absolute',

      top: 0,

      left: 0,

      right: 0,

      zIndex: 30,

    },

    headerCard: {

      marginHorizontal:

        14,

      marginTop: 6,

      minHeight: 56,

      paddingHorizontal:

        12,

      paddingVertical: 8,

      borderRadius: 16,

      backgroundColor:

        'rgba(255,255,255,0.96)',

      flexDirection:

        'row',

      alignItems:

        'center',

      justifyContent:

        'space-between',

      borderWidth: 1,

      borderColor:

        '#E2E8F0',

      elevation: 7,

    },

    brandContainer: {

      flexDirection:

        'row',

      alignItems:

        'center',

    },

    logoContainer: {

      width: 36,

      height: 36,

      borderRadius: 11,

      backgroundColor:

        '#0F172A',

      alignItems:

        'center',

      justifyContent:

        'center',

      marginRight: 9,

    },

    brand: {

      fontSize: 18,

      fontWeight:

        '900',

      color:

        '#0F172A',

    },

    brandAccent: {

      color:

        '#2563EB',

    },

    subText: {

      marginTop: 1,

      fontSize: 7,

      fontWeight:

        '800',

      color:

        '#94A3B8',

      letterSpacing: 1,

    },

    mapBadge: {

      flexDirection:

        'row',

      alignItems:

        'center',

      backgroundColor:

        '#EFF6FF',

      paddingHorizontal:

        8,

      paddingVertical: 6,

      borderRadius: 9,

    },

    mapBadgeText: {

      marginLeft: 4,

      fontSize: 7,

      fontWeight:

        '900',

      color:

        '#2563EB',

    },

    // =====================================================

    // STATUS

    // =====================================================

    locationStatus: {

      position:

        'absolute',

      top: 94,

      alignSelf:

        'center',

      flexDirection:

        'row',

      alignItems:

        'center',

      paddingHorizontal:

        10,

      paddingVertical: 6,

      borderRadius: 18,

      backgroundColor:

        'rgba(255,255,255,0.95)',

      borderWidth: 1,

      borderColor:

        '#E2E8F0',

      elevation: 4,

      zIndex: 25,

    },

    statusDot: {

      width: 7,

      height: 7,

      borderRadius: 4,

      marginRight: 6,

    },

    locationStatusText: {

      fontSize: 10,

      fontWeight:

        '700',

      color:

        '#475569',

    },

    // =====================================================

    // CONTROLS

    // =====================================================

    mapControls: {

      position:

        'absolute',

      right: 14,

      bottom: 237,

      width: 48,

      borderRadius: 14,

      backgroundColor:

        '#FFFFFF',

      borderWidth: 1,

      borderColor:

        '#E2E8F0',

      overflow:

        'hidden',

      elevation: 7,

      zIndex: 25,

    },

    controlButton: {

      width: 48,

      height: 48,

      alignItems:

        'center',

      justifyContent:

        'center',

    },

    controlDivider: {

      height: 1,

      marginHorizontal:

        7,

      backgroundColor:

        '#E2E8F0',

    },

    zoomIndicator: {

      height: 24,

      alignItems:

        'center',

      justifyContent:

        'center',

      backgroundColor:

        '#F8FAFC',

    },

    zoomIndicatorText: {

      fontSize: 8,

      fontWeight:

        '800',

      color:

        '#64748B',

    },

    recenterButton: {

      position:

        'absolute',

      right: 14,

      bottom: 180,

      width: 48,

      height: 48,

      borderRadius: 14,

      backgroundColor:

        '#FFFFFF',

      alignItems:

        'center',

      justifyContent:

        'center',

      borderWidth: 1,

      borderColor:

        '#E2E8F0',

      elevation: 7,

      zIndex: 25,

    },

    fitCampusButton: {

      position: 'absolute',

      right: 14,

      bottom: 123,

      width: 48,

      height: 48,

      borderRadius: 14,

      backgroundColor: '#FFFFFF',

      alignItems: 'center',

      justifyContent: 'center',

      borderWidth: 1,

      borderColor: '#E2E8F0',

      elevation: 7,

      zIndex: 25,

    },

    // =====================================================

    // BOTTOM CARD

    // =====================================================

    bottomPanel: {

      position:

        'absolute',

      bottom: 12,

      left: 14,

      right: 14,

      padding: 10,

      backgroundColor:

        'rgba(255,255,255,0.98)',

      borderRadius: 18,

      borderWidth: 1,

      borderColor:

        '#E2E8F0',

      elevation: 12,

      zIndex: 20,

    },

    compactLocationRow: {

      flexDirection:

        'row',

      alignItems:

        'center',

    },

    compactLocationIcon: {

      width: 38,

      height: 38,

      borderRadius: 12,

      backgroundColor:

        '#EFF6FF',

      alignItems:

        'center',

      justifyContent:

        'center',

      marginRight: 10,

    },

    compactLocationInfo: {

      flex: 1,

    },

    compactLocationTitle: {

      fontSize: 13,

      fontWeight:

        '800',

      color:

        '#0F172A',

    },

    compactLocationSubtext: {

      marginTop: 1,

      fontSize: 9,

      fontWeight:

        '600',

      color:

        '#64748B',

    },

    liveIndicator: {

      width: 8,

      height: 8,

      borderRadius: 4,

      marginLeft: 8,

    },

    // =====================================================

    // ROUTE BUTTON

    // =====================================================

    routeButton: {

      height: 48,

      marginTop: 9,

      borderRadius: 12,

      backgroundColor:

        '#2563EB',

      flexDirection:

        'row',

      alignItems:

        'center',

      justifyContent:

        'center',

    },

    routeButtonDisabled: {

      backgroundColor:

        '#94A3B8',

      opacity: 0.65,

    },

    routeButtonText: {

      marginLeft: 7,

      fontSize: 11,

      fontWeight:

        '900',

      color:

        '#FFFFFF',

      letterSpacing: 0.4,

    },

    // =====================================================

    // ACTIVE ROUTE

    // =====================================================

    routeInfoRow: {

      flexDirection:

        'row',

      alignItems:

        'center',

    },

    routeIcon: {

      width: 40,

      height: 40,

      borderRadius: 12,

      backgroundColor:

        '#EFF6FF',

      alignItems:

        'center',

      justifyContent:

        'center',

      marginRight: 10,

    },

    routeTextContainer: {

      flex: 1,

    },

    routeLabel: {

      fontSize: 8,

      fontWeight:

        '900',

      color:

        '#94A3B8',

      letterSpacing: 1,

    },

    routeTitle: {

      marginTop: 1,

      fontSize: 13,

      fontWeight:

        '900',

      color:

        '#0F172A',

    },

    routeDistance: {

      marginTop: 1,

      fontSize: 9,

      fontWeight:

        '600',

      color:

        '#64748B',

    },

    stopButton: {

      width: 34,

      height: 34,

      borderRadius: 10,

      backgroundColor:

        '#FEF2F2',

      alignItems:

        'center',

      justifyContent:

        'center',

      marginLeft: 8,

    },

  });
