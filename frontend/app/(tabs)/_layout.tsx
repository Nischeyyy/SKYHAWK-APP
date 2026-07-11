import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Platform, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";

function TabBg() {
  const style = {
    backgroundColor: "#141414",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  } as const;
  if (Platform.OS === "web") {
    return <View style={[StyleSheet.absoluteFill, style]} />;
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={60}
        tint="dark"
        style={[StyleSheet.absoluteFill, {
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          overflow: "hidden",
        }]}
      />
      <View style={[StyleSheet.absoluteFill, style, { backgroundColor: "rgba(20,20,20,0.7)" }]} />
    </View>
  );
}

const tapHaptic = () => {
  if (Platform.OS === "web") return;
  try { Haptics.selectionAsync(); } catch {}
};

export default function TabsLayout() {
  return (
    <Tabs
      screenListeners={{ tabPress: tapHaptic }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarBackground: () => <TabBg />,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500", marginTop: 3 },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: "Today",
        tabBarIcon: ({ color }) => <Ionicons name="today-outline" size={22} color={color} />,
      }} />
      <Tabs.Screen name="schedule" options={{
        title: "Schedule",
        tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />,
      }} />
      <Tabs.Screen name="shifts" options={{
        title: "Shifts",
        tabBarIcon: ({ color }) => <Ionicons name="list-outline" size={22} color={color} />,
      }} />
      <Tabs.Screen name="wallet" options={{
        title: "Wallet",
        tabBarIcon: ({ color }) => <Ionicons name="card-outline" size={22} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: "Profile",
        tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
      }} />
    </Tabs>
  );
}
