import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const tap = () => {
  if (Platform.OS === "web") return;
  try {
    Haptics.selectionAsync();
  } catch {}
};

/**
 * A monochrome, "liquid glass" floating tab bar in the spirit of iOS 18 —
 * a single frosted pill that hugs the bottom of the screen, with an
 * animated glass capsule that glides beneath the active icon.
 */
export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const itemWidths = useRef<number[]>([]).current;
  const itemX = useRef<number[]>([]).current;
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const measured = useRef(0);

  const onItemLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    itemX[index] = x;
    itemWidths[index] = width;
    measured.current += 1;
    if (index === state.index) {
      pillX.value = x;
      pillW.value = width;
    }
  };

  React.useEffect(() => {
    const width = itemWidths[state.index];
    const x = itemX[state.index];
    if (width == null || x == null) return;
    pillX.value = withSpring(x, { damping: 18, stiffness: 220, mass: 0.6 });
    pillW.value = withSpring(width, { damping: 18, stiffness: 220, mass: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillW.value,
  }));

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

          <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />

          <View style={styles.row}>
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
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onLayout={onItemLayout(index)}
                  style={styles.item}
                  hitSlop={8}
                >
                  <View style={styles.iconWrap}>{icon}</View>
                  {focused && (
                    <Text numberOfLines={1} style={styles.label}>
                      {String(options.title ?? route.name)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const BAR_HEIGHT = 60;

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
    top: 7,
    height: BAR_HEIGHT - 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 6,
  },
  item: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
    paddingHorizontal: 14,
    minWidth: 44,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.1,
    flexShrink: 0,
  },
});
