import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const tap = () => {
  if (Platform.OS === "web") return;
  try {
    Haptics.selectionAsync();
  } catch {}
};

// A single smooth ease-out curve, no spring/bounce — this is what makes
// Apple's own liquid-glass tab bar feel calm instead of "pingy". Every
// tab bar keeps a fixed number of equal-width slots, so the only thing
// that ever animates is a 1-D translateX — nothing resizes, nothing
// reflows, so there is nothing to glitch.
const LIQUID_CURVE = Easing.bezier(0.22, 1, 0.36, 1);
const LIQUID_MS = 320;

const PILL_SIZE = 46;

export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const routeCount = state.routes.length;
  const slotWidth = barWidth / Math.max(routeCount, 1);

  const pillX = useSharedValue(0);
  const didInit = useSharedValue(false);

  const targetX = slotWidth * state.index + slotWidth / 2 - PILL_SIZE / 2;

  if (barWidth > 0) {
    if (!didInit.value) {
      pillX.value = targetX;
      didInit.value = true;
    } else if (Math.round(pillX.value) !== Math.round(targetX)) {
      pillX.value = withTiming(targetX, { duration: LIQUID_MS, easing: LIQUID_CURVE });
    }
  }

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  const onBarLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.shadowLayer}>
        <View style={styles.glass}>
          {Platform.OS === "web" ? (
            <View style={[StyleSheet.absoluteFill, styles.webFallback]} />
          ) : (
            <BlurView intensity={78} tint="systemChromeMaterialDark" style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0.02)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.rim} pointerEvents="none" />
          <View style={styles.specular} pointerEvents="none" />

          <View style={styles.row} onLayout={onBarLayout}>
            {barWidth > 0 && (
              <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />
            )}

            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const focused = state.index === index;
              const onPress = () => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  tap();
                  navigation.navigate(route.name);
                }
              };
              const icon = options.tabBarIcon
                ? options.tabBarIcon({
                    focused,
                    color: focused ? "#FFFFFF" : "rgba(255,255,255,0.42)",
                    size: 22,
                  })
                : null;

              return (
                <Pressable key={route.key} onPress={onPress} style={styles.item} hitSlop={0}>
                  <View style={styles.iconWrap}>{icon}</View>
                  <Text numberOfLines={1} style={[styles.label, focused && styles.labelActive]}>
                    {String(options.title ?? route.name)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  shadowLayer: {
    width: "100%",
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  glass: {
    height: BAR_HEIGHT,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "rgba(10,10,10,0.55)",
  },
  webFallback: {
    backgroundColor: "rgba(14,14,14,0.86)",
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  specular: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  pill: {
    position: "absolute",
    top: 6,
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: PILL_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  item: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: PILL_SIZE - 20,
  },
  label: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginTop: 2,
  },
  labelActive: {
    color: "#FFFFFF",
  },
});
