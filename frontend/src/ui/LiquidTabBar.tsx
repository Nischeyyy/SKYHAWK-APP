import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const tap = () => {
  if (Platform.OS === "web") return;
  try {
    Haptics.selectionAsync();
  } catch {}
};

/**
 * A clean, solid black-and-white bottom tab bar. No glass, no blur,
 * no moving indicator — just a floating black pill bar with white
 * (active) / gray (inactive) icons and labels.
 */
export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.bar}>
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
  bar: {
    width: "100%",
    height: BAR_HEIGHT,
    borderRadius: 32,
    backgroundColor: "#000000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
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
    height: 26,
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
