import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../theme';

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.brandTertiary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: theme.colors.onBrandTertiary,
          fontWeight: '700',
          fontSize: size * 0.42,
          letterSpacing: 1,
        }}
      >
        SH
      </Text>
    </View>
  );
}

export function Card({ children, style, testID }: any) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Chip({ label, active, onPress, testID }: any) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Button({ label, onPress, variant = 'primary', disabled, style, testID, small }: any) {
  const bg =
    variant === 'primary'
      ? theme.colors.brandPrimary
      : variant === 'ghost'
      ? 'transparent'
      : theme.colors.surfaceTertiary;
  const color =
    variant === 'primary' ? theme.colors.onBrandPrimary : theme.colors.onSurface;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          paddingVertical: small ? 10 : 14,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <Text
        style={{
          color,
          fontSize: small ? 13 : 15,
          fontWeight: '700',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 28,
          fontWeight: '800',
          color: accent ? theme.colors.brandPrimary : theme.colors.onSurface,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: theme.colors.onSurfaceTertiary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: theme.colors.brandTertiary,
    borderColor: theme.colors.brandPrimary,
  },
  chipText: { color: theme.colors.onSurfaceSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: theme.colors.brandPrimary },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurfaceTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
