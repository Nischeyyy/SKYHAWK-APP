import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';

function tap() {
  if (Platform.OS === 'web') return;
  try { Haptics.selectionAsync(); } catch {}
}

export function Button({ label, onPress, variant = 'primary', disabled, style, testID, small, leading }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? theme.colors.accent : 'transparent';
  const color = isPrimary ? theme.colors.onAccent : (variant === 'link' ? theme.colors.accent : theme.colors.text);
  const border = variant === 'secondary' ? theme.colors.border : 'transparent';
  const handlePress = () => {
    tap();
    onPress?.();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        testID={testID}
        onPress={handlePress}
        disabled={disabled}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
        style={[
          {
            backgroundColor: bg,
            borderRadius: theme.radius.md,
            paddingVertical: small ? 10 : 14,
            paddingHorizontal: theme.spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
            borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
            borderColor: border,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
      >
        {leading}
        <Text style={{ color, fontSize: small ? 14 : 16, fontWeight: '600' }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Status pill with leading dot — "● Completed" style */
export function StatusPill({
  label,
  tone = 'neutral',
  testID,
}: {
  label: string;
  tone?: 'neutral' | 'verified' | 'warning' | 'danger' | 'accent';
  testID?: string;
}) {
  const toneMap = {
    neutral: { fg: theme.colors.textSecondary, dot: theme.colors.textSecondary, bg: 'rgba(255,255,255,0.04)' },
    verified: { fg: theme.colors.verified, dot: theme.colors.verified, bg: 'rgba(48,209,88,0.12)' },
    warning: { fg: theme.colors.warning, dot: theme.colors.warning, bg: 'rgba(255,159,10,0.12)' },
    danger: { fg: theme.colors.danger, dot: theme.colors.danger, bg: 'rgba(255,69,58,0.12)' },
    accent: { fg: theme.colors.accent, dot: theme.colors.accent, bg: 'rgba(10,132,255,0.14)' },
  } as const;
  const t = toneMap[tone];
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: t.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: t.dot }]} />
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Circular initials avatar */
export function Avatar({ name, size = 40, testID }: { name?: string; size?: number; testID?: string }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]!)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.cardElevated,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: theme.colors.text, fontSize: size * 0.38, fontWeight: '600' }}>
        {initials}
      </Text>
    </View>
  );
}

/** Skyhawk shield motif — small brand mark for headers */
export function ShieldMark({ size = 22 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.85,
          height: size,
          backgroundColor: 'transparent',
          borderColor: theme.colors.accent,
          borderWidth: 1.5,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          borderBottomLeftRadius: size * 0.4,
          borderBottomRightRadius: size * 0.4,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.25,
            height: size * 0.25,
            borderRadius: size * 0.125,
            backgroundColor: theme.colors.accent,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
    gap: 5,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
});
