import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LiquidTabBar } from "@/src/ui/LiquidTabBar";

export default function ManagerLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "none" }}
    >
      <Tabs.Screen name="index" options={{ title: "Overview", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="guards" options={{ title: "Guards", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="ops" options={{ title: "Operations", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "megaphone" : "megaphone-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="finance" options={{ title: "Finance", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} /> }} />
    </Tabs>
  );
}
