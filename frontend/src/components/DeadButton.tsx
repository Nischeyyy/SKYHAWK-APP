import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View, ViewStyle } from "react-native";

/**
 * DeadButton — wraps any non-functional button with a red flashing animation.
 * Use this for buttons that are present in the UI but not yet wired to an action.
 */
export function DeadButton({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const flash = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(flash, { toValue: 0.35, duration: 600, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [flash]);

  return (
    <Animated.View style={[styles.wrap, style, { opacity: flash }]}>
      <View style={styles.redTint} />
      {children}
    </Animated.View>
  );
}

export function DeadText({ children, style }: { children: React.ReactNode; style?: any }) {
  const flash = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(flash, { toValue: 0.35, duration: 600, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [flash]);

  return (
    <Animated.Text style={[style, { color: "#FF0000", opacity: flash }]}>
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  redTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,0,0,0.15)",
    borderRadius: 8,
  },
});
