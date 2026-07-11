import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 0.5,
          height: Platform.OS === "ios" ? 84 : 62,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 26 : 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
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
