import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { theme } from '../theme';

export function Button({ label, onPress, variant = 'primary', disabled, style, testID }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? theme.colors.accent : 'transparent';
  const color = isPrimary ? theme.colors.onAccent : theme.colors.text;
  const border = variant === 'secondary' ? theme.colors.border : 'transparent';
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
        style={[
          {
            backgroundColor: bg,
            borderRadius: theme.radius.md,
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: variant === 'secondary' ? 1 : 0,
            borderColor: border,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
      >
        <Text style={{ color, fontSize: 16, fontWeight: '600' }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function Row({ label, value, onPress, testID, last }: any) {
  const content = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
  if (onPress) return <Pressable testID={testID} onPress={onPress}>{content}</Pressable>;
  return content;
}

export function GroupLabel({ children }: any) {
  return <Text style={styles.groupLabel}>{children}</Text>;
}

export function Group({ children, style }: any) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.card,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  rowLabel: { color: theme.colors.text, fontSize: 15 },
  rowValue: { color: theme.colors.textSecondary, fontSize: 15 },
  groupLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  group: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, marginVertical: 12 },
});
