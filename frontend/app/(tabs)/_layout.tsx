import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LiquidTabBar } from "@/src/ui/LiquidTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "shift" }}
    >
      <Tabs.Screen name="index" options={{
        title: "Today",
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "today" : "today-outline"} size={22} color={color} />,
      }} />
      <Tabs.Screen name="schedule" options={{
        title: "Schedule",
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />,
      }} />
      <Tabs.Screen name="shifts" options={{
        title: "Shifts",
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "list" : "list-outline"} size={22} color={color} />,
      }} />
      <Tabs.Screen name="wallet" options={{
        title: "Wallet",
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "card" : "card-outline"} size={22} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: "Profile",
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />,
      }} />
    </Tabs>
  );
}
